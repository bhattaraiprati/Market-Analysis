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
    system_prompt?: string;
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
    const apiKey =
      configService.get<string>('FIRECRAWL_API_KEY') ||
      configService.get<string>('Firecrawl_API_KEY');

    if (apiKey) {
      this.firecrawl = new FirecrawlApp({ apiKey });
    } else {
      this.logger.warn(
        'FIRECRAWL_API_KEY is not configured; conversation web search is unavailable',
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
   * Persona-aware web research: generate queries, select five independent sites,
   * then scrape each homepage and up to five useful internal pages.
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

    const queries = await this.generateQueries(request);
    this.logger.log(
      `Generated ${queries.length} web queries: ${queries.join(' | ')}`,
    );
    const candidates = await this.runSearches(queries);
    const primarySites = this.selectPrimarySites(candidates, 5);
    this.logger.log(
      `Selected ${primarySites.length} primary sites: ${primarySites.map((site) => site.url).join(', ')}`,
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
          `Failed to research ${primarySites[index].url}: ${this.errorMessage(result.reason)}`,
        );
      }
    });

    return {
      queries,
      sites: primarySites.map((site) => site.url),
      results,
      failures,
    };
  }

  private async generateQueries(
    request: ConversationWebResearchRequest,
  ): Promise<string[]> {
    const recentContext = (request.conversationHistory || [])
      .slice(-4)
      .map((message) => `${message.role || 'user'}: ${message.content || ''}`)
      .join('\n');
    const prompt = `Generate 3 precise, complementary web search queries for the request below.

USER REQUEST: ${request.userQuery}
ROUTER QUERY: ${request.optimizedQuery || 'Not provided'}
PERSONA ROLE: ${request.persona?.primary_focus_role || 'GENERAL_ASSISTANT'}
PERSONA DESCRIPTION: ${request.persona?.description || 'Not provided'}
ORGANIZATION CONTEXT: ${request.companyContext || 'Not provided'}
RECENT CONVERSATION: ${recentContext || 'None'}

Make the queries appropriate for the persona's department and the user's actual goal. Include relevant organization names, location, date, product, market, technical, financial, HR, or operational terms when present. Do not broaden the request. Return only a JSON array of 3 strings.`;

    try {
      const response = await this.llmService.generateText({
        task: 'search',
        systemPrompt:
          'You create grounded web-search queries. Return only a valid JSON array of strings.',
        userPrompt: prompt,
        temperature: 0.2,
        maxTokens: 500,
      });
      this.logger.log(`Search-query model used: ${response.model}`);
      const match = response.content.match(/\[[\s\S]*\]/);
      const parsed: unknown = match ? JSON.parse(match[0]) : [];
      const generated = Array.isArray(parsed)
        ? parsed.filter(
            (query): query is string =>
              typeof query === 'string' && query.trim().length > 2,
          )
        : [];
      return this.uniqueStrings([
        request.optimizedQuery || '',
        ...generated,
      ]).slice(0, 4);
    } catch (error) {
      this.logger.warn(
        `Search query generation failed; using request fallback: ${this.errorMessage(error)}`,
      );
      return this.uniqueStrings([
        request.optimizedQuery || '',
        request.userQuery,
      ]);
    }
  }

  private async runSearches(queries: string[]): Promise<FirecrawlDocument[]> {
    const responses = await Promise.allSettled(
      queries.map((query) =>
        this.runFirecrawlRequest(() =>
          this.firecrawl!.search(query, { limit: 8 }),
        ),
      ),
    );
    const documents: FirecrawlDocument[] = [];
    const seen = new Set<string>();

    responses.forEach((response, index) => {
      if (response.status === 'rejected') {
        this.logger.warn(
          `Search failed for "${queries[index]}": ${this.errorMessage(response.reason)}`,
        );
        return;
      }
      for (const document of (response.value.web ||
        []) as FirecrawlDocument[]) {
        const url = this.documentUrl(document);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        documents.push(document);
      }
    });

    return documents;
  }

  private selectPrimarySites(
    documents: FirecrawlDocument[],
    limit: number,
  ): Array<{ url: string; document: FirecrawlDocument }> {
    const selected: Array<{ url: string; document: FirecrawlDocument }> = [];
    const seenHosts = new Set<string>();

    for (const document of documents) {
      const rawUrl = this.documentUrl(document);
      const parsed = this.safeUrl(rawUrl);
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) continue;
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (seenHosts.has(host) || this.isUnsupportedHost(host)) continue;

      seenHosts.add(host);
      selected.push({ url: parsed.origin, document });
      if (selected.length === limit) break;
    }

    return selected;
  }

  private async scrapeSite(
    site: { url: string; document: FirecrawlDocument },
    request: ConversationWebResearchRequest,
  ): Promise<{ results: ConversationWebSearchResult[]; failures: number }> {
    const homepage = await this.scrapePage(site.url, site.url, 'homepage');
    if (!homepage) {
      const fallback = this.toResult(site.document, site.url, 'homepage');
      return { results: fallback ? [fallback] : [], failures: 1 };
    }

    const links = this.selectInternalLinks(
      homepage.content,
      site.url,
      request.persona?.primary_focus_role,
      5,
    );
    this.logger.log(
      `Scraping ${links.length} priority subpages for ${site.url}`,
    );
    const settled = await this.allSettledWithConcurrency(links, 3, (url) =>
      this.scrapePage(url, site.url, 'subpage'),
    );
    const results = [homepage];
    let failures = 0;

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
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
  ): string[] {
    const base = this.safeUrl(siteUrl);
    if (!base) return [];
    const candidates = new Map<string, number>();
    const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
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
        const url = new URL(match[1], base);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        const baseHost = base.hostname.toLowerCase().replace(/^www\./, '');
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

  private isUnsupportedHost(host: string): boolean {
    return [
      'google.com',
      'bing.com',
      'youtube.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'x.com',
      'twitter.com',
      'tiktok.com',
    ].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
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
