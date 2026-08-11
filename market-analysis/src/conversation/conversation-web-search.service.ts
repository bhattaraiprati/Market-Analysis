import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FirecrawlApp from '@mendable/firecrawl-js';
import { LlmService } from '../llm/llm.service';

export interface ConversationWebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content: string;
  siteUrl: string;
  pageType: 'homepage' | 'subpage';
}

export interface ConversationWebResearchRequest {
  userQuery: string;
  optimizedQuery?: string;
  companyContext?: string;
  persona?: {
    name?: string;
    primary_focus_role?: string;
    description?: string;
  };
  conversationHistory?: Array<{ role?: string; content?: string }>;
}

export interface ConversationWebResearchResult {
  queries: string[];
  sites: string[];
  results: ConversationWebSearchResult[];
  failures: number;
}

interface FirecrawlDocument {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    ogTitle?: string;
    description?: string;
    ogDescription?: string;
    sourceURL?: string;
  };
}

interface WebSearchPlan {
  queries: string[];
  location?: string;
  timeFilter?: string;
}

interface SearchCandidate {
  document: FirecrawlDocument;
  queryIndex: number;
  resultIndex: number;
}

interface PrimarySite {
  siteUrl: string;
  pageUrl: string;
  document: FirecrawlDocument;
  relevanceScore: number;
}

@Injectable()
export class ConversationWebSearchService {
  private readonly logger = new Logger(ConversationWebSearchService.name);
  private readonly firecrawl?: FirecrawlApp;
  private readonly firecrawlMinIntervalMs: number;
  private firecrawlQueue: Promise<void> = Promise.resolve();
  private lastFirecrawlRequestAt = 0;

  constructor(
    configService: ConfigService,
    private readonly llmService: LlmService,
  ) {
    const apiKey = configService.get<string>('Firecrawl_API_KEY');

    if (apiKey) {
      this.firecrawl = new FirecrawlApp({ apiKey });
    } else {
      this.logger.warn(
        'Firecrawl_API_KEY is not configured; conversation web search is unavailable',
      );
    }
    this.firecrawlMinIntervalMs = this.positiveInteger(
      configService.get<string>('FIRECRAWL_MIN_INTERVAL_MS'),
      6500,
    );
  }

  /** Kept for callers that only need a shallow search. */
  async search(query: string): Promise<ConversationWebSearchResult[]> {
    const research = await this.research({ userQuery: query });
    return research.results;
  }

  /**
   * Persona-aware web research: generate queries, rank exact result pages from
   * independent sites, then scrape only query-relevant pages.
   */
  async research(
    request: ConversationWebResearchRequest,
  ): Promise<ConversationWebResearchResult> {
    if (!this.firecrawl) {
      throw new Error('Conversation web search is not configured');
    }
    if (!request.userQuery?.trim()) {
      throw new Error('A non-empty user query is required for web search');
    }

    const searchPlan = await this.generateSearchPlan(request);
    const queries = searchPlan.queries;
    this.logger.log(
      `Generated ${queries.length} web queries: ${queries.join(' | ')}`,
    );
    const candidates = await this.runSearches(queries, searchPlan);
    const primarySites = this.selectPrimarySites(
      candidates,
      request,
      queries,
      5,
    );
    this.logger.log(
      `Selected ${primarySites.length} relevant result pages: ${primarySites.map((site) => `${site.pageUrl} (${site.relevanceScore.toFixed(1)})`).join(', ')}`,
    );

    if (primarySites.length === 0) {
      return { queries, sites: [], results: [], failures: 0 };
    }

    const settled = await this.allSettledWithConcurrency(
      primarySites,
      2,
      (site) => this.scrapeSite(site, request),
    );
    const results: ConversationWebSearchResult[] = [];
    let failures = 0;

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value.results);
        failures += result.value.failures;
      } else {
        failures += 1;
        this.logger.warn(
          `Failed to research ${primarySites[index].pageUrl}: ${this.errorMessage(result.reason)}`,
        );
      }
    });

    return {
      queries,
      sites: this.uniqueStrings(results.map((result) => result.siteUrl)),
      results,
      failures,
    };
  }

  private async generateSearchPlan(
    request: ConversationWebResearchRequest,
  ): Promise<WebSearchPlan> {
    const recentContext = (request.conversationHistory || [])
      .slice(-4)
      .map((message) => `${message.role || 'user'}: ${message.content || ''}`)
      .join('\n');
    const prompt = `Create a focused web-search plan for the request below.

USER REQUEST: ${request.userQuery}
ROUTER QUERY: ${request.optimizedQuery || 'Not provided'}
PERSONA ROLE: ${request.persona?.primary_focus_role || 'GENERAL_ASSISTANT'}
PERSONA DESCRIPTION: ${request.persona?.description || 'Not provided'}
ORGANIZATION CONTEXT: ${request.companyContext || 'Not provided'}
RECENT CONVERSATION: ${recentContext || 'None'}

Generate exactly 3 complementary queries:
1. A direct query using the named organization, subject, geography, and date.
2. A primary-source query for an official regulator, government body, company, filing, or original report when applicable.
3. An independent comparison or market-evidence query.

Do not broaden the request. Resolve words such as "our" using ORGANIZATION CONTEXT. Return only JSON in this shape:
{"queries":["query 1","query 2","query 3"],"location":"country or city, country, or null"}`;

    try {
      const response = await this.llmService.generateText({
        task: 'search',
        systemPrompt:
          'You create grounded web-search plans. Return only one valid JSON object.',
        userPrompt: prompt,
        temperature: 0.2,
        maxTokens: 500,
      });
      this.logger.log(`Search-query model used: ${response.model}`);
      const objectMatch = response.content.match(/\{[\s\S]*\}/);
      const arrayMatch = response.content.match(/\[[\s\S]*\]/);
      const parsed: unknown = objectMatch
        ? JSON.parse(objectMatch[0])
        : arrayMatch
          ? JSON.parse(arrayMatch[0])
          : {};
      const rawQueries = Array.isArray(parsed)
        ? parsed
        : this.isRecord(parsed) && Array.isArray(parsed.queries)
          ? parsed.queries
          : [];
      const generated = rawQueries.filter(
        (query): query is string =>
          typeof query === 'string' && query.trim().length > 2,
      );
      const queries = this.uniqueStrings([
        request.optimizedQuery || '',
        ...generated,
      ]).slice(0, 4);
      const plannedLocation =
        this.isRecord(parsed) && typeof parsed.location === 'string'
          ? parsed.location.trim()
          : '';
      const shouldUseContextLocation =
        !this.isRecord(parsed) || parsed.location === undefined;
      return {
        queries,
        location:
          plannedLocation && plannedLocation.toLowerCase() !== 'null'
            ? plannedLocation
            : shouldUseContextLocation && this.isLocationRelative(request)
              ? this.contextLocation(request.companyContext)
              : undefined,
        timeFilter:
          this.timeFilter([request.userQuery, request.optimizedQuery || '']) ||
          this.timeFilter(queries),
      };
    } catch (error) {
      this.logger.warn(
        `Search query generation failed; using request fallback: ${this.errorMessage(error)}`,
      );
      const queries = this.uniqueStrings([
        request.optimizedQuery || '',
        request.userQuery,
      ]);
      return {
        queries,
        location: this.isLocationRelative(request)
          ? this.contextLocation(request.companyContext)
          : undefined,
        timeFilter:
          this.timeFilter([request.userQuery, request.optimizedQuery || '']) ||
          this.timeFilter(queries),
      };
    }
  }

  private async runSearches(
    queries: string[],
    plan: WebSearchPlan,
  ): Promise<SearchCandidate[]> {
    const responses = await Promise.allSettled(
      queries.map((query) =>
        this.runFirecrawlRequest(() =>
          this.firecrawl!.search(query, {
            limit: 8,
            sources: ['web'],
            highlights: true,
            excludeDomains: this.unsupportedHosts(),
            ...(plan.location ? { location: plan.location } : {}),
            ...(plan.timeFilter ? { tbs: plan.timeFilter } : {}),
          }),
        ),
      ),
    );
    const candidates: SearchCandidate[] = [];

    responses.forEach((response, index) => {
      if (response.status === 'rejected') {
        this.logger.warn(
          `Search failed for "${queries[index]}": ${this.errorMessage(response.reason)}`,
        );
        return;
      }
      ((response.value.web || []) as FirecrawlDocument[]).forEach(
        (document, resultIndex) => {
          const url = this.documentUrl(document);
          if (!url) return;
          candidates.push({ document, queryIndex: index, resultIndex });
        },
      );
    });

    return candidates;
  }

  private selectPrimarySites(
    candidates: SearchCandidate[],
    request: ConversationWebResearchRequest,
    queries: string[],
    limit: number,
  ): PrimarySite[] {
    const grouped = new Map<
      string,
      SearchCandidate & { queryIndexes: Set<number>; bestResultIndex: number }
    >();

    for (const candidate of candidates) {
      const normalized = this.normalizeUrl(
        this.documentUrl(candidate.document),
      );
      if (!normalized) continue;
      const parsed = this.safeUrl(normalized);
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) continue;
      const host = this.normalizedHost(parsed);
      if (this.isUnsupportedHost(host)) continue;

      const existing = grouped.get(normalized);
      if (existing) {
        existing.queryIndexes.add(candidate.queryIndex);
        existing.bestResultIndex = Math.min(
          existing.bestResultIndex,
          candidate.resultIndex,
        );
      } else {
        grouped.set(normalized, {
          ...candidate,
          queryIndexes: new Set([candidate.queryIndex]),
          bestResultIndex: candidate.resultIndex,
        });
      }
    }

    const terms = this.relevanceTerms(request, queries);
    const companyName = this.contextField(
      request.companyContext,
      'Company Name',
    );
    const ranked = [...grouped.entries()]
      .map(([pageUrl, candidate]) => {
        const parsed = this.safeUrl(pageUrl)!;
        const relevance = this.documentRelevance(
          candidate.document,
          terms,
          companyName,
        );
        const relevanceScore =
          relevance.score +
          candidate.queryIndexes.size * 7 +
          Math.max(0, 8 - candidate.bestResultIndex);
        return {
          siteUrl: parsed.origin,
          pageUrl,
          document: candidate.document,
          relevanceScore,
          matchedTerms: relevance.matchedTerms,
        };
      })
      .filter(
        (candidate) => candidate.matchedTerms >= Math.min(2, terms.length),
      )
      .sort((left, right) => right.relevanceScore - left.relevanceScore);

    const selected: PrimarySite[] = [];
    const seenHosts = new Set<string>();
    for (const candidate of ranked) {
      const parsed = this.safeUrl(candidate.pageUrl)!;
      const host = this.normalizedHost(parsed);
      if (seenHosts.has(host)) continue;
      seenHosts.add(host);
      selected.push(candidate);
      if (selected.length === limit) break;
    }

    return selected;
  }

  private async scrapeSite(
    site: PrimarySite,
    request: ConversationWebResearchRequest,
  ): Promise<{ results: ConversationWebSearchResult[]; failures: number }> {
    const parsedPage = this.safeUrl(site.pageUrl);
    const pageType =
      parsedPage && parsedPage.pathname === '/' ? 'homepage' : 'subpage';
    const landingPage = await this.scrapePage(
      site.pageUrl,
      site.siteUrl,
      pageType,
    );
    if (!landingPage) {
      const fallback = this.toResult(site.document, site.siteUrl, pageType);
      return { results: fallback ? [fallback] : [], failures: 1 };
    }

    const terms = this.relevanceTerms(request, []);
    if (!this.isRelevantResult(landingPage, terms)) {
      this.logger.warn(
        `Discarded irrelevant scraped page ${landingPage.url} for query "${request.userQuery}"`,
      );
      return { results: [], failures: 0 };
    }

    // Search-result articles and reports are already the evidence target. Only
    // expand a true homepage, and only to links that match the research topic.
    const links =
      pageType === 'homepage'
        ? this.selectInternalLinks(
            landingPage.content,
            site.siteUrl,
            request.persona?.primary_focus_role,
            2,
            terms,
          )
        : [];
    this.logger.log(
      `Scraping ${links.length} query-relevant subpages for ${site.siteUrl}`,
    );
    const settled = await this.allSettledWithConcurrency(links, 3, (url) =>
      this.scrapePage(url, site.siteUrl, 'subpage'),
    );
    const results = [landingPage];
    let failures = 0;

    settled.forEach((result) => {
      if (
        result.status === 'fulfilled' &&
        result.value &&
        this.isRelevantResult(result.value, terms)
      ) {
        results.push(result.value);
      } else {
        failures += 1;
      }
    });
    return { results, failures };
  }

  private async scrapePage(
    url: string,
    siteUrl: string,
    pageType: 'homepage' | 'subpage',
  ): Promise<ConversationWebSearchResult | null> {
    try {
      const result = (await this.runFirecrawlRequest(() =>
        this.firecrawl!.scrapeUrl(url, {
          formats: ['markdown'],
          onlyMainContent: true,
          blockAds: true,
          waitFor: 1000,
        }),
      )) as FirecrawlDocument;
      const content = result.markdown || '';
      if (!content.trim()) return null;
      return {
        title:
          result.metadata?.title ||
          result.metadata?.ogTitle ||
          result.title ||
          url,
        url: this.documentUrl(result) || url,
        snippet:
          result.metadata?.description ||
          result.metadata?.ogDescription ||
          result.description ||
          content.slice(0, 500),
        content,
        siteUrl,
        pageType,
      };
    } catch (error) {
      this.logger.warn(`Scrape failed for ${url}: ${this.errorMessage(error)}`);
      return null;
    }
  }

  private selectInternalLinks(
    markdown: string,
    siteUrl: string,
    personaRole = 'GENERAL_ASSISTANT',
    limit = 5,
    relevanceTerms: string[] = [],
  ): string[] {
    const base = this.safeUrl(siteUrl);
    if (!base) return [];
    const candidates = new Map<string, number>();
    const linkPattern = /\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    const roleKeywords = this.roleKeywords(personaRole);
    const genericKeywords = [
      'about',
      'product',
      'service',
      'solution',
      'pricing',
      'feature',
      'news',
      'blog',
      'research',
      'report',
      'case-study',
      'careers',
      'team',
      'investor',
    ];

    for (const match of markdown.matchAll(linkPattern)) {
      try {
        const url = new URL(match[2], base);
        const host = this.normalizedHost(url);
        const baseHost = this.normalizedHost(base);
        if (host !== baseHost || !['http:', 'https:'].includes(url.protocol))
          continue;
        url.hash = '';
        const path = url.pathname.toLowerCase();
        if (
          path === '/' ||
          /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|mp3)$/i.test(path) ||
          /(login|sign-in|signup|register|privacy|terms|cookie|contact|request-a-demo|book-a-demo|schedule-demo|webinar)/i.test(
            path,
          )
        ) {
          continue;
        }
        let score = Math.max(
          0,
          20 - path.split('/').filter(Boolean).length * 2,
        );
        score +=
          genericKeywords.filter((word) => path.includes(word)).length * 5;
        score += roleKeywords.filter((word) => path.includes(word)).length * 8;
        const linkText = `${match[1]} ${this.decodeUrlComponent(path)}`;
        const topicMatches = this.countTermMatches(linkText, relevanceTerms);
        if (relevanceTerms.length > 0 && topicMatches === 0) continue;
        score += topicMatches * 12;
        url.hostname = base.hostname;
        const normalized = url.toString().replace(/\/$/, '');
        candidates.set(
          normalized,
          Math.max(candidates.get(normalized) || 0, score),
        );
      } catch {
        // Ignore malformed links from scraped content.
      }
    }

    return [...candidates.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([url]) => url);
  }

  private roleKeywords(role: string): string[] {
    const normalized = role.toUpperCase();
    const byRole: Record<string, string[]> = {
      SALES: ['customer', 'case-study', 'pricing', 'partner'],
      MARKETING: ['brand', 'campaign', 'news', 'blog', 'insight'],
      PRODUCT: ['product', 'feature', 'roadmap', 'release'],
      ENGINEERING: ['developer', 'docs', 'api', 'security', 'technology'],
      FINANCE: ['investor', 'financial', 'annual-report', 'pricing'],
      OPERATIONS: ['operation', 'supply', 'delivery', 'location'],
      HR: ['career', 'jobs', 'culture', 'team', 'leadership'],
      COMPETITIVE_ANALYST: ['product', 'pricing', 'strategy', 'news'],
      MARKET_RESEARCHER: ['research', 'report', 'market', 'insight'],
      CUSTOMER_SUCCESS_EXPERT: ['support', 'help', 'customer', 'case-study'],
      BUSINESS_STRATEGIST: ['strategy', 'investor', 'about', 'leadership'],
    };
    return byRole[normalized] || [];
  }

  private toResult(
    document: FirecrawlDocument,
    siteUrl: string,
    pageType: 'homepage' | 'subpage',
  ): ConversationWebSearchResult | null {
    const url = this.documentUrl(document);
    if (!url) return null;
    const content = document.markdown || '';
    return {
      title:
        document.title ||
        document.metadata?.title ||
        document.metadata?.ogTitle ||
        'Untitled',
      url,
      snippet:
        document.description ||
        document.metadata?.description ||
        document.metadata?.ogDescription ||
        content.slice(0, 500),
      content,
      siteUrl,
      pageType,
    };
  }

  private documentUrl(document: FirecrawlDocument): string {
    return document.url || document.metadata?.sourceURL || '';
  }

  private safeUrl(value?: string): URL | null {
    if (!value) return null;
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  private normalizeUrl(value?: string): string | null {
    const url = this.safeUrl(value);
    if (!url) return null;
    url.hash = '';
    for (const parameter of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$|source$)/i.test(parameter)) {
        url.searchParams.delete(parameter);
      }
    }
    return url.toString().replace(/\/$/, '');
  }

  private normalizedHost(url: URL): string {
    return url.hostname.toLowerCase().replace(/^www\./, '');
  }

  private isUnsupportedHost(host: string): boolean {
    return this.unsupportedHosts().some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    );
  }

  private unsupportedHosts(): string[] {
    return [
      'google.com',
      'bing.com',
      'reddit.com',
      'youtube.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'x.com',
      'twitter.com',
      'tiktok.com',
    ];
  }

  private relevanceTerms(
    request: ConversationWebResearchRequest,
    queries: string[],
  ): string[] {
    return this.uniqueStrings(
      this.tokenize(
        [request.userQuery, request.optimizedQuery || '', ...queries].join(' '),
      ),
    ).slice(0, 30);
  }

  private tokenize(value: string): string[] {
    const stopWords = new Set([
      'about',
      'also',
      'and',
      'are',
      'best',
      'country',
      'find',
      'for',
      'from',
      'give',
      'in',
      'list',
      'most',
      'of',
      'our',
      'search',
      'show',
      'the',
      'their',
      'top',
      'what',
      'which',
      'with',
    ]);
    const matches = (value
      .toLowerCase()
      .match(/[\p{L}\p{N}][\p{L}\p{N}._-]*/gu) || []) as string[];
    return matches
      .map((term: string) => term.replace(/^[._-]+|[._-]+$/g, ''))
      .filter(
        (term: string) =>
          term.length >= 3 && !stopWords.has(term) && !/^\d{1,3}$/.test(term),
      );
  }

  private documentRelevance(
    document: FirecrawlDocument,
    terms: string[],
    companyName?: string,
  ): { score: number; matchedTerms: number } {
    const title = [
      document.title,
      document.metadata?.title,
      document.metadata?.ogTitle,
    ]
      .filter(Boolean)
      .join(' ');
    const description = [
      document.description,
      document.metadata?.description,
      document.metadata?.ogDescription,
    ]
      .filter(Boolean)
      .join(' ');
    const url = this.documentUrl(document);
    const titleMatches = this.matchedTerms(title, terms);
    const descriptionMatches = this.matchedTerms(description, terms);
    const urlMatches = this.matchedTerms(this.decodeUrlComponent(url), terms);
    const allMatches = new Set([
      ...titleMatches,
      ...descriptionMatches,
      ...urlMatches,
    ]);
    let score =
      titleMatches.size * 10 +
      descriptionMatches.size * 5 +
      urlMatches.size * 6;
    if (
      companyName &&
      `${title} ${description} ${url}`
        .toLowerCase()
        .includes(companyName.toLowerCase())
    ) {
      score += 12;
    }
    const parsed = this.safeUrl(url);
    if (
      parsed &&
      (this.normalizedHost(parsed) === 'nrb.org.np' ||
        /(^|\.)(gov|gov\.np)$/.test(this.normalizedHost(parsed)))
    ) {
      score += 15;
    } else if (parsed && this.normalizedHost(parsed).endsWith('.np')) {
      score += 5;
    }
    return { score, matchedTerms: allMatches.size };
  }

  private isRelevantResult(
    result: ConversationWebSearchResult,
    terms: string[],
  ): boolean {
    if (terms.length === 0) return true;
    const evidence = `${result.title} ${result.snippet} ${result.url} ${result.content.slice(0, 6000)}`;
    return this.countTermMatches(evidence, terms) >= Math.min(2, terms.length);
  }

  private matchedTerms(value: string, terms: string[]): Set<string> {
    const normalized = ` ${value.toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, ' ')} `;
    return new Set(
      terms.filter((term) => normalized.includes(` ${term.toLowerCase()} `)),
    );
  }

  private countTermMatches(value: string, terms: string[]): number {
    return this.matchedTerms(value, terms).size;
  }

  private contextLocation(companyContext?: string): string | undefined {
    const location = this.contextField(companyContext, 'Location');
    return location && !/^not specified$/i.test(location)
      ? location
      : undefined;
  }

  private isLocationRelative(request: ConversationWebResearchRequest): boolean {
    return /\b(our|local|domestic|home)\s+(country|market|region)|\bin\s+(our|the)\s+country\b/i.test(
      `${request.userQuery} ${request.optimizedQuery || ''}`,
    );
  }

  private contextField(
    companyContext: string | undefined,
    field: string,
  ): string | undefined {
    const match = companyContext?.match(
      new RegExp(`(?:^|\\n)${field}:\\s*([^\\n]+)`, 'i'),
    );
    return match?.[1]?.trim();
  }

  private timeFilter(queries: string[]): string | undefined {
    const years = [
      ...new Set(queries.join(' ').match(/\b(?:19|20)\d{2}\b/g) || []),
    ]
      .map(Number)
      .sort((left, right) => left - right);
    if (years.length === 0) return undefined;
    return `cdr:1,cd_min:01/01/${years[0]},cd_max:12/31/${years[years.length - 1]}`;
  }

  private decodeUrlComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private runFirecrawlRequest<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.firecrawlQueue.then(async () => {
      const waitMs = Math.max(
        0,
        this.firecrawlMinIntervalMs -
          (Date.now() - this.lastFirecrawlRequestAt),
      );
      if (waitMs > 0) await this.sleep(waitMs);
      this.lastFirecrawlRequestAt = Date.now();

      try {
        return await operation();
      } catch (error: unknown) {
        const retryMs = this.firecrawlRetryDelay(error);
        if (retryMs === null) throw error;
        this.logger.warn(
          `Firecrawl rate limit reached; retrying once in ${Math.ceil(retryMs / 1000)}s`,
        );
        await this.sleep(retryMs);
        this.lastFirecrawlRequestAt = Date.now();
        return operation();
      }
    });
    this.firecrawlQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private firecrawlRetryDelay(error: unknown): number | null {
    const message = this.errorMessage(error);
    if (!/rate limit|status[^\d]*429|\b429\b/i.test(message)) return null;
    const seconds = message.match(/retry after\s+(\d+)s/i)?.[1];
    return seconds ? Number(seconds) * 1000 + 1000 : 60_000;
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async allSettledWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: Array<PromiseSettledResult<R> | undefined> = Array.from(
      { length: items.length },
      () => undefined,
    );
    let nextIndex = 0;

    const run = async (): Promise<void> => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = {
            status: 'fulfilled',
            value: await worker(items[index]),
          };
        } catch (reason: unknown) {
          results[index] = { status: 'rejected', reason };
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(Math.max(1, concurrency), items.length) },
        () => run(),
      ),
    );
    return results.filter(
      (result): result is PromiseSettledResult<R> => result !== undefined,
    );
  }
}
