/**
 * Searcher Agent
 * Finds and scrapes competitor information from the web
 * Uses the centralized LLM service for query generation + Firecrawl for scraping
 */

import { Injectable } from '@nestjs/common';
import FirecrawlApp from '@mendable/firecrawl-js';
import { BaseAgent } from '../base/base.agent';
import {
  AgentContext,
  AgentResult,
  ScrapedSource,
  SearchQuery,
  CompetitorInfo,
  SourceType,
  ResearchBrief,
} from '../base/agent.types';
import { CompanyContextService } from '../../company-context/company-context.service';
import { LlmService } from '../../llm/llm.service';
import { ResearchType } from '../../research/research.types';

interface SearcherResult {
  sources: ScrapedSource[];
  competitors: CompetitorInfo[];
  totalScraped: number;
  executionTimeMs: number;
}

interface CompetitorSearchResult {
  query: string;
  queryType: SearchQuery['type'];
  title: string;
  url: string;
  description: string;
  content: string;
}

interface FirecrawlSearchDocument {
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

const MAX_COMPANY_CONTEXT_CHARACTERS = 4000;
const MAX_COMPETITOR_EVIDENCE_CHARACTERS = 6500;
const MAX_SEARCH_RESULT_SNIPPET_CHARACTERS = 350;

@Injectable()
export class SearcherAgent extends BaseAgent<SearcherResult> {
  private readonly firecrawl: FirecrawlApp;

  constructor(
    private readonly companyContextService: CompanyContextService,
    private readonly llmService: LlmService,
  ) {
    super('SearcherAgent');

    const firecrawlApiKey =
      process.env.FIRECRAWL_API_KEY || process.env.Firecrawl_API_KEY;
    if (!firecrawlApiKey) {
      throw new Error(
        'FIRECRAWL_API_KEY is required for competitor search and scraping',
      );
    }

    this.firecrawl = new FirecrawlApp({
      apiKey: firecrawlApiKey,
    });
  }

  /**
   * Main execution method
   */
  async execute(context: AgentContext): Promise<AgentResult<SearcherResult>> {
    this.logStart(
      `Starting competitor search for organization ${context.organizationId}`,
    );

    const startTime = Date.now();

    try {
      // 1. Get organization details from database
      const orgData = await this.companyContextService.getKeyInfo(
        context.organizationId,
      );

      this.logger.log(`📋 Organization: ${orgData.name} (${orgData.industry})`);
      this.logger.log(`📍 Location: ${orgData.location}`);
      this.logger.log(
        `🎯 Known Competitors: ${orgData.knownCompetitors.join(', ')}`,
      );

      // 2. Generate competitor search queries using the shared LLM
      this.logStart(
        `Generating search queries with ${this.llmService.modelFor('search')}...`,
      );
      const searchQueries = await this.generateCompetitorSearchQueries(
        context.companyContext,
        orgData,
        context.research,
      );

      this.logSuccess(`Generated ${searchQueries.length} search queries`);

      // 3. Execute the generated queries so competitor selection is grounded
      // in current web results rather than relying only on the LLM's memory.
      this.logStart('Searching the web for competitor evidence...');
      const searchResults = await this.executeSearchQueries(searchQueries);
      const researchSources = this.toResearchSources(searchResults);

      this.logSuccess(`Collected ${searchResults.length} web search results`);

      // 4. Identify competitor websites from the search evidence
      this.logStart('Identifying competitor websites...');
      const competitors = await this.identifyCompetitors(
        orgData,
        context.companyContext,
        searchResults,
      );

      this.logSuccess(`Identified ${competitors.length} competitors`);

      // 5. Scrape competitor homepages using Firecrawl
      this.logStart('Scraping competitor homepages with Firecrawl...');
      const homepageSources = await this.scrapeCompetitorSources(
        competitors,
        orgData,
      );

      this.logSuccess(
        `Successfully scraped ${homepageSources.length} homepages`,
      );

      // 6. Enrich with deep page scraping
      this.logStart('Enriching with deep page scraping...');
      const competitorSources = await this.enrichWithDeepPages(
        homepageSources,
        competitors,
      );
      const allSources = [...researchSources, ...competitorSources];

      this.logSuccess(
        `Total sources after enrichment: ${allSources.length} (${researchSources.length} search evidence sources)`,
      );

      const executionTimeMs = Date.now() - startTime;

      return this.createSuccessResult<SearcherResult>(
        {
          sources: allSources,
          competitors,
          totalScraped: allSources.length,
          executionTimeMs,
        },
        {
          queriesGenerated: searchQueries.length,
          searchResultsFound: searchResults.length,
          competitorsFound: competitors.length,
          homepagesScraped: homepageSources.length,
          deepPagesScraped: competitorSources.length - homepageSources.length,
        },
      );
    } catch (error) {
      this.logError('Searcher agent failed', error);
      return this.createErrorResult(error);
    }
  }

  /** Execute generated queries with Firecrawl Search in small batches. */
  private async executeSearchQueries(
    queries: SearchQuery[],
  ): Promise<CompetitorSearchResult[]> {
    const results: CompetitorSearchResult[] = [];
    const seenUrls = new Set<string>();
    const batchSize = 3;

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const responses = await Promise.allSettled(
        batch.map(async ({ query, type }) => {
          const response = await this.firecrawl.search(query, { limit: 5 });
          return {
            query,
            queryType: type,
            documents: (response.web || []) as FirecrawlSearchDocument[],
          };
        }),
      );

      responses.forEach((response, index) => {
        if (response.status === 'rejected') {
          this.logger.warn(
            `Search failed for "${batch[index].query}": ${response.reason}`,
          );
          return;
        }

        for (const document of response.value.documents) {
          const url = document.url || document.metadata?.sourceURL || '';
          if (!url || seenUrls.has(url)) continue;

          seenUrls.add(url);
          results.push({
            query: response.value.query,
            queryType: response.value.queryType,
            title:
              document.title ||
              document.metadata?.title ||
              document.metadata?.ogTitle ||
              'Untitled',
            url,
            description:
              document.description ||
              document.metadata?.description ||
              document.metadata?.ogDescription ||
              document.markdown?.slice(0, 500) ||
              '',
            content:
              document.markdown ||
              document.description ||
              document.metadata?.description ||
              document.metadata?.ogDescription ||
              '',
          });
        }
      });
    }

    return results;
  }

  private toResearchSources(
    searchResults: CompetitorSearchResult[],
  ): ScrapedSource[] {
    return searchResults
      .filter((result) => result.content.trim().length > 0)
      .slice(0, 20)
      .map((result) => ({
        url: result.url,
        title: result.title,
        content: result.content,
        sourceType: this.sourceTypeForQuery(result.queryType),
        metadata: {
          searchQuery: result.query,
          queryType: result.queryType,
          pageType: 'search-result',
        },
        scrapedAt: new Date(),
      }));
  }

  private sourceTypeForQuery(queryType: SearchQuery['type']): SourceType {
    if (queryType === 'news') return SourceType.NEWS;
    if (queryType === 'customer') return SourceType.REVIEW;
    return SourceType.WEBSITE;
  }

  /**
   * Generate competitor search queries using the shared LLM service
   */
  private async generateCompetitorSearchQueries(
    companyContext: string,
    orgData: {
      name: string;
      industry: string;
      location: string;
      knownCompetitors: string[];
    },
    research?: ResearchBrief,
  ): Promise<SearchQuery[]> {
    const prompt = `You are a deep market research specialist. Generate highly specific web search queries for the current research brief.

COMPANY CONTEXT:
${this.limitText(companyContext, MAX_COMPANY_CONTEXT_CHARACTERS)}

LOCATION: ${orgData.location}
KNOWN COMPETITORS: ${orgData.knownCompetitors.join(', ')}
RESEARCH TYPE: ${research?.researchType || 'COMPETITOR'}
PRIMARY QUESTION: ${research?.query || 'Identify and compare the strongest competitors.'}
ADDITIONAL INSTRUCTIONS: ${research?.instructions || 'None'}

Generate 10 search queries that collectively cover:
1. The user's primary question and requested focus areas
2. Current market, customer, regulatory, or news evidence relevant to the research type
3. Direct competitors in ${orgData.location} and major international competitors where relevant
4. Primary and authoritative sources whenever available

IMPORTANT:
- Include the company industry, geography, and concrete subject terms
- Prefer recent and authoritative evidence over generic articles
- Use a mixture of competitor, market, customer, and news query types when the research is comprehensive
- Treat the research brief as scope, not as permission to invent facts

Return ONLY a JSON array of search queries in this exact format:
[
  {
    "query": "top ${orgData.industry} companies ${orgData.location}",
    "type": "competitor",
    "priority": "high",
    "region": "domestic"
  },
  {
    "query": "leading ${orgData.industry} international",
    "type": "competitor",
    "priority": "medium",
    "region": "international"
  }
]

Return ONLY valid JSON, no other text.`;

    try {
      const completion = await this.llmService.generateText({
        task: 'search',
        systemPrompt:
          'You generate evidence-focused market research queries. Return only valid JSON arrays.',
        userPrompt: prompt,
        temperature: 0.6, // Here the temp is 0.3 before
        maxTokens: 2000,
      });

      const content = completion.content;
      console.log('Groq response content:', content); // Debug log
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const queries: SearchQuery[] = JSON.parse(jsonMatch[0]);
      return queries;
    } catch (error) {
      this.logError('Failed to generate search queries', error);
      // Fallback to basic queries
      return this.getFallbackQueries(orgData, research);
    }
  }

  /**
   * Identify competitors using the shared LLM service
   */
  private async identifyCompetitors(
    orgData: {
      name: string;
      industry: string;
      location: string;
      knownCompetitors: string[];
    },
    companyContext: string,
    searchResults: CompetitorSearchResult[],
  ): Promise<CompetitorInfo[]> {
    if (searchResults.length === 0) {
      this.logger.warn(
        'No web search results were available; falling back to known competitors',
      );
      return this.getFallbackCompetitors(orgData);
    }

    const evidence = this.limitText(
      searchResults
        .slice(0, 30)
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\nURL: ${result.url}\nSnippet: ${this.limitText(result.description, MAX_SEARCH_RESULT_SNIPPET_CHARACTERS)}`,
        )
        .join('\n\n'),
      MAX_COMPETITOR_EVIDENCE_CHARACTERS,
    );

    const prompt = `You are a competitive intelligence analyst. Identify the TOP 5 competitors for this company.

COMPANY CONTEXT:
${this.limitText(companyContext, MAX_COMPANY_CONTEXT_CHARACTERS)}

LOCATION: ${orgData.location}
KNOWN COMPETITORS: ${orgData.knownCompetitors.join(', ')}

CURRENT WEB SEARCH EVIDENCE:
${evidence}

CRITICAL INSTRUCTIONS:
- Identify EXACTLY 5 competitors total (not more, not less)
- PRIORITIZE ${orgData.location} based competitors (domestic market leaders FIRST)
- Only include if ${orgData.location} has fewer than 5 major competitors, then add international leaders
- Focus on the MOST SIGNIFICANT competitors only (market leaders, not small players)
- Include accurate company websites
- Base every selection on the web evidence above
- Use the company's official homepage URL, derived from an evidence URL
- Do not invent a company or website that is absent from the evidence

PRIORITY ORDER:
1. TOP domestic competitors in ${orgData.location} (highest priority)
2. Major international competitors (only if needed to reach 5 total)

Return ONLY a JSON array with EXACTLY 5 competitors in this format:
[
  {
    "name": "DomesticLeader1",
    "website": "https://domesticleader1.com",
    "location": "${orgData.location}",
    "description": "Market leader in ${orgData.location}",
    "priority": "domestic"
  },
  {
    "name": "DomesticLeader2",
    "website": "https://domesticleader2.com",
    "location": "${orgData.location}",
    "description": "Second major player in ${orgData.location}",
    "priority": "domestic"
  },
  {
    "name": "InternationalLeader",
    "website": "https://internationalleader.com",
    "location": "Country",
    "description": "Major international competitor",
    "priority": "international"
  }
]

MUST return exactly 5 competitors. Return ONLY valid JSON, no other text.`;

    try {
      const completion = await this.llmService.generateText({
        task: 'search',
        systemPrompt:
          'You are a competitive intelligence expert. Return only valid JSON arrays.',
        userPrompt: prompt,
        temperature: 0.4,
        maxTokens: 3000,
      });

      const content = completion.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const competitors: CompetitorInfo[] = JSON.parse(jsonMatch[0]);

      // Reject hallucinated or malformed websites. A selected company's host
      // must have appeared in the current search evidence.
      const evidenceHosts = new Set(
        searchResults
          .map((result) => this.getHostname(result.url))
          .filter((host): host is string => Boolean(host)),
      );
      const seenCompetitorHosts = new Set<string>();
      const groundedCompetitors = competitors
        .filter((competitor) => {
          const host = this.getHostname(competitor.website);
          if (
            !host ||
            !evidenceHosts.has(host) ||
            seenCompetitorHosts.has(host)
          ) {
            return false;
          }
          seenCompetitorHosts.add(host);
          return true;
        })
        .map((competitor) => ({
          ...competitor,
          website: this.getWebsiteOrigin(competitor.website),
        }));

      // Sort by priority (domestic first) and limit to top 5
      const sortedCompetitors = groundedCompetitors.sort((a, b) => {
        if (a.priority === 'domestic' && b.priority !== 'domestic') return -1;
        if (a.priority !== 'domestic' && b.priority === 'domestic') return 1;
        return 0;
      });

      // Ensure we return exactly 5 competitors (domestic prioritized)
      if (sortedCompetitors.length === 0) {
        throw new Error(
          'LLM returned no competitors grounded in search results',
        );
      }

      return sortedCompetitors.slice(0, 5);
    } catch (error) {
      this.logError('Failed to identify competitors', error);
      // Fallback to known competitors
      return this.getFallbackCompetitors(orgData);
    }
  }

  private getHostname(url?: string): string | null {
    if (!url) return null;

    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  private getWebsiteOrigin(url?: string): string | undefined {
    if (!url) return undefined;

    try {
      return new URL(url).origin;
    } catch {
      return undefined;
    }
  }

  /**
   * Scrape competitor sources using Firecrawl MCP
   */
  private async scrapeCompetitorSources(
    competitors: CompetitorInfo[],
    orgData: { location: string },
  ): Promise<ScrapedSource[]> {
    const sources: ScrapedSource[] = [];

    // Prioritize domestic competitors
    const domesticCompetitors = competitors.filter(
      (c) => c.priority === 'domestic',
    );
    const internationalCompetitors = competitors.filter(
      (c) => c.priority === 'international',
    );

    // Scrape domestic first (higher priority)
    this.logger.log(
      `🏠 Scraping ${domesticCompetitors.length} domestic competitors (${orgData.location})...`,
    );
    const domesticSources = await this.scrapeCompetitors(domesticCompetitors);
    sources.push(...domesticSources);

    // Then international
    this.logger.log(
      `🌍 Scraping ${internationalCompetitors.length} international competitors...`,
    );
    const internationalSources = await this.scrapeCompetitors(
      internationalCompetitors,
    );
    sources.push(...internationalSources);

    return sources;
  }

  /**
   * Scrape individual competitors
   */
  private async scrapeCompetitors(
    competitors: CompetitorInfo[],
  ): Promise<ScrapedSource[]> {
    const sources: ScrapedSource[] = [];

    // Scrape in batches of 3 to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < competitors.length; i += batchSize) {
      const batch = competitors.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((competitor) => this.scrapeCompetitorWebsite(competitor)),
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          sources.push(result.value);
          this.logger.log(
            `✅ Scraped: ${batch[idx].name} (${result.value.content.length} chars)`,
          );
        } else {
          this.logger.warn(
            `⚠️ Failed to scrape: ${batch[idx].name} - ${result.status === 'rejected' ? result.reason : 'No data'}`,
          );
        }
      });

      // Wait between batches
      if (i + batchSize < competitors.length) {
        await this.sleep(2000); // 2 second delay between batches
      }
    }

    return sources;
  }

  /**
   * Scrape individual competitor website using Firecrawl
   */
  private async scrapeCompetitorWebsite(
    competitor: CompetitorInfo,
  ): Promise<ScrapedSource | null> {
    if (!competitor.website) {
      this.logger.warn(`No website for ${competitor.name}`);
      return null;
    }

    try {
      const result = await this.firecrawl.scrapeUrl(competitor.website, {
        formats: ['markdown'],
        onlyMainContent: false,
        blockAds: true,
        excludeTags: ['aside', '.ad', '#ad-container'], // Optional custom HTML tags/selectors to drop
        waitFor: 2000,
      });
      this.logger.log(`The Scrape result for ${competitor.name} is:`, result);
      if (!result || !result.markdown) {
        throw new Error('No content returned from Firecrawl');
      }

      return {
        url: competitor.website,
        title: result.metadata?.title || competitor.name,
        content: result.markdown,
        sourceType: SourceType.COMPETITOR,
        metadata: {
          competitorName: competitor.name,
          location: competitor.location,
          priority: competitor.priority,
          description: competitor.description,
          pageType: 'homepage', // Mark as homepage
          ...result.metadata,
        },
        scrapedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to scrape ${competitor.website}: ${error}`);
      return null;
    }
  }

  /**
   * Fallback queries if Groq fails
   */
  private getFallbackQueries(
    orgData: {
      name: string;
      industry: string;
      location: string;
    },
    research?: ResearchBrief,
  ): SearchQuery[] {
    const scopedQuery = research?.query
      ? `${research.query} ${orgData.location}`
      : `${orgData.industry} market trends ${orgData.location}`;

    return [
      {
        query: scopedQuery,
        type:
          research?.researchType === ResearchType.CUSTOMER
            ? 'customer'
            : 'market',
        priority: 'high',
        region: 'domestic',
      },
      {
        query: `${orgData.industry} companies ${orgData.location}`,
        type: 'competitor',
        priority: 'high',
        region: 'domestic',
      },
      {
        query: `top ${orgData.industry} startups ${orgData.location}`,
        type: 'competitor',
        priority: 'high',
        region: 'domestic',
      },
      {
        query: `best ${orgData.industry} tools international`,
        type: 'competitor',
        priority: 'medium',
        region: 'international',
      },
    ];
  }

  /**
   * Fallback competitors if Groq fails
   */
  private getFallbackCompetitors(orgData: {
    knownCompetitors: string[];
    location: string;
  }): CompetitorInfo[] {
    // Map of known Nepali fintech competitors to their websites
    const nepaliCompetitorWebsites: Record<string, string> = {
      Khalti: 'https://khalti.com',
      'IME Pay': 'https://www.imepay.com.np',
      ConnectIPS: 'https://www.connectips.com',
      'Namaste Pay': 'https://namastepay.com.np',
      eSewa: 'https://esewa.com.np',
      Fonepay: 'https://fonepay.com',
      'Prabhu Pay': 'https://prabhupay.com',
    };

    // Return only top 5 competitors (prioritize domestic)
    return orgData.knownCompetitors
      .slice(0, 5) // Take only first 5
      .map((name) => ({
        name,
        website: nepaliCompetitorWebsites[name],
        priority: 'domestic',
        location: orgData.location,
        description: `Digital payment service in ${orgData.location}`,
      }));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enrich homepage sources with deep page scraping
   * Second pass: intelligently scrape important internal pages
   */
  private async enrichWithDeepPages(
    homepageSources: ScrapedSource[],
    competitors: CompetitorInfo[],
  ): Promise<ScrapedSource[]> {
    const allSources: ScrapedSource[] = [...homepageSources];

    // Create a map for quick competitor lookup
    const competitorMap = new Map<string, CompetitorInfo>();
    competitors.forEach((comp) => {
      if (comp.website) {
        const baseUrl = this.normalizeUrl(comp.website);
        competitorMap.set(baseUrl, comp);
      }
    });

    this.logger.log(
      `🔍 Starting deep page analysis for ${homepageSources.length} homepages...`,
    );

    // Process each homepage to extract and scrape deep pages
    for (let i = 0; i < homepageSources.length; i++) {
      const homepageSource = homepageSources[i];
      const baseUrl = this.normalizeUrl(homepageSource.url);
      const competitor = competitorMap.get(baseUrl);

      if (!competitor) {
        this.logger.warn(
          `⚠️ No competitor found for ${homepageSource.url}, skipping deep scrape`,
        );
        continue;
      }

      this.logger.log(
        `\n📄 Analyzing homepage: ${competitor.name} (${homepageSource.url})`,
      );

      try {
        // Extract candidate URLs from the markdown content
        const candidateUrls = this.extractCandidateUrls(
          homepageSource.content,
          baseUrl,
        );

        if (candidateUrls.length === 0) {
          this.logger.warn(`  ⚠️ No candidate URLs found in homepage`);
          continue;
        }

        this.logger.log(`  📋 Found ${candidateUrls.length} candidate URLs`);

        // Score and select priority URLs (max 6-7)
        const priorityUrls = this.scoreAndSelectPriorityUrls(
          candidateUrls,
          baseUrl,
        );

        this.logger.log(
          `  ✅ Selected ${priorityUrls.length} priority URLs for deep scraping`,
        );

        // Log selected URLs with their detected page types
        priorityUrls.forEach((url) => {
          const pageType = this.detectPageType(url);
          this.logger.log(`     - ${pageType.toUpperCase()}: ${url}`);
        });

        // Scrape priority URLs (with rate limiting)
        const deepPageSources = await this.scrapeDeepPages(
          priorityUrls,
          competitor,
        );

        allSources.push(...deepPageSources);

        this.logger.log(
          `  ✅ Successfully scraped ${deepPageSources.length}/${priorityUrls.length} deep pages for ${competitor.name}`,
        );

        // Rate limiting between competitors
        if (i < homepageSources.length - 1) {
          await this.sleep(1500); // 1.5s between competitors
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `  ❌ Failed to enrich ${competitor.name}: ${errorMessage}`,
        );
        continue;
      }
    }

    return allSources;
  }

  /**
   * Extract candidate URLs from markdown content
   */
  private extractCandidateUrls(markdown: string, baseUrl: string): string[] {
    const urls = new Set<string>();

    // Regex patterns to extract URLs from markdown
    // Pattern 1: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Pattern 2: Direct URLs
    const directUrlRegex = /https?:\/\/[^\s)]+/g;

    let match: RegExpExecArray | null;

    // Extract markdown links
    while ((match = markdownLinkRegex.exec(markdown)) !== null) {
      const url = match[2];
      if (url && !url.startsWith('#')) {
        const fullUrl = this.resolveUrl(url, baseUrl);
        if (fullUrl && this.isInternalUrl(fullUrl, baseUrl)) {
          urls.add(fullUrl);
        }
      }
    }

    // Extract direct URLs
    while ((match = directUrlRegex.exec(markdown)) !== null) {
      const url = match[0];
      const fullUrl = this.resolveUrl(url, baseUrl);
      if (fullUrl && this.isInternalUrl(fullUrl, baseUrl)) {
        urls.add(fullUrl);
      }
    }

    // Filter out homepage itself and common excludes
    return Array.from(urls).filter((url) => {
      const normalizedUrl = this.normalizeUrl(url);
      const normalizedBase = this.normalizeUrl(baseUrl);
      return normalizedUrl !== normalizedBase && !this.shouldExcludeUrl(url);
    });
  }

  /**
   * Score and select priority URLs based on importance
   */
  private scoreAndSelectPriorityUrls(
    urls: string[],
    baseUrl: string,
    maxUrls = 5, // Changed from 7 to 5 for performance
  ): string[] {
    // Define priority keywords with scores
    const priorityPatterns: Array<{ pattern: RegExp; score: number }> = [
      // High priority (score 100-80)
      {
        pattern: /\b(pricing|price|plans?|charges?|fees?|cost)\b/i,
        score: 100,
      },
      { pattern: /\b(transaction[s-]?limit|limits?)\b/i, score: 95 },
      {
        pattern: /\b(about[- ]?us|who[- ]?we[- ]?are|company|our[- ]?story)\b/i,
        score: 90,
      },
      {
        pattern:
          /\b(business|enterprise|merchant[s]?|payment[- ]?gateway|for[- ]?business)\b/i,
        score: 85,
      },

      // Medium priority (score 70-50)
      { pattern: /\b(features?|products?|services?|solutions?)\b/i, score: 70 },
      { pattern: /\b(faq|help|support|contact[- ]?us)\b/i, score: 65 },
      {
        pattern: /\b(how[- ]?it[- ]?works?|getting[- ]?started|guide)\b/i,
        score: 60,
      },
      {
        pattern: /\b(api|developers?|integration|documentation|docs)\b/i,
        score: 55,
      },

      // Low priority (score 40-20)
      { pattern: /\b(blog|news|press|media|articles?)\b/i, score: 40 },
      { pattern: /\b(partners?|partnership|affiliates?)\b/i, score: 30 },
    ];

    // Score each URL
    const scoredUrls = urls.map((url) => {
      let score = 0;
      const urlLower = url.toLowerCase();

      // Calculate score based on matching patterns
      for (const { pattern, score: patternScore } of priorityPatterns) {
        if (pattern.test(urlLower)) {
          score = Math.max(score, patternScore);
        }
      }

      // Bonus: shorter URLs are often more important
      const pathDepth = url.split('/').length - 3; // subtract protocol and domain
      if (pathDepth <= 2) {
        score += 10;
      }

      return { url, score };
    });

    // Sort by score (descending) and take top N
    return scoredUrls
      .sort((a, b) => b.score - a.score)
      .filter((item) => item.score > 0) // Only include URLs with positive scores
      .slice(0, maxUrls)
      .map((item) => item.url);
  }

  /**
   * Scrape multiple deep pages for a competitor
   */
  private async scrapeDeepPages(
    urls: string[],
    competitor: CompetitorInfo,
  ): Promise<ScrapedSource[]> {
    const sources: ScrapedSource[] = [];

    // Scrape in batches of 2 to avoid rate limits
    const batchSize = 2;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((url) => this.safeScrape(url, competitor)),
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          sources.push(result.value);
        }
      });

      // Wait between batches
      if (i + batchSize < urls.length) {
        await this.sleep(1000); // 1 second delay between batches
      }
    }

    return sources;
  }

  /**
   * Safely scrape a URL with retry logic
   */
  private async safeScrape(
    url: string,
    competitor: CompetitorInfo,
    retries = 2,
  ): Promise<ScrapedSource | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.firecrawl.scrapeUrl(url, {
          formats: ['markdown'],
          onlyMainContent: false,
          blockAds: true,
          excludeTags: ['aside', '.ad', '#ad-container'], // Optional custom HTML tags/selectors to drop
          waitFor: 2000,
        });

        if (!result || !result.markdown) {
          throw new Error('No content returned');
        }

        // Skip if content is too short (likely error page or poor content)
        if (result.markdown.length < 200) {
          this.logger.warn(
            `  ⚠️ Skipping ${url} - content too short (${result.markdown.length} chars)`,
          );
          return null;
        }

        const pageType = this.detectPageType(url);

        return {
          url,
          title: result.metadata?.title || this.extractPageTitle(url),
          content: result.markdown,
          sourceType: SourceType.COMPETITOR,
          metadata: {
            competitorName: competitor.name,
            location: competitor.location,
            priority: competitor.priority,
            description: competitor.description,
            pageType, // NEW: track page type
            ...result.metadata,
          },
          scrapedAt: new Date(),
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt === retries) {
          this.logger.warn(
            `  ⚠️ Failed to scrape ${url} after ${retries + 1} attempts: ${errorMessage}`,
          );
          return null;
        }
        await this.sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
    return null;
  }

  /**
   * Detect page type from URL
   */
  private detectPageType(url: string): string {
    const urlLower = url.toLowerCase();

    if (/\b(pricing|price|plans?|charges?|fees?|cost)\b/.test(urlLower)) {
      return 'pricing';
    }
    if (/\b(transaction[s-]?limit|limits?)\b/.test(urlLower)) {
      return 'limits';
    }
    if (
      /\b(about[- ]?us|who[- ]?we[- ]?are|company|our[- ]?story)\b/.test(
        urlLower,
      )
    ) {
      return 'about';
    }
    if (
      /\b(business|enterprise|merchant[s]?|payment[- ]?gateway|for[- ]?business)\b/.test(
        urlLower,
      )
    ) {
      return 'business';
    }
    if (/\b(features?|products?|services?|solutions?)\b/.test(urlLower)) {
      return 'features';
    }
    if (/\b(faq|help|support)\b/.test(urlLower)) {
      return 'support';
    }
    if (/\b(api|developers?|integration|documentation|docs)\b/.test(urlLower)) {
      return 'api';
    }
    if (/\b(blog|news|press|media)\b/.test(urlLower)) {
      return 'blog';
    }

    return 'other';
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, www, and convert to lowercase
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      normalized = normalized.replace(/\/$/, '');
      normalized = normalized.replace(/^https?:\/\/www\./, 'https://');
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(url: string, baseUrl: string): string | null {
    try {
      // If already absolute, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Resolve relative URL
      const base = new URL(baseUrl);
      const resolved = new URL(url, base);
      return resolved.href;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is internal (same domain)
   */
  private isInternalUrl(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      // Compare hostnames (ignoring www)
      const urlHost = urlObj.hostname.replace(/^www\./, '');
      const baseHost = baseObj.hostname.replace(/^www\./, '');
      return urlHost === baseHost;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL should be excluded from scraping
   */
  private shouldExcludeUrl(url: string): boolean {
    const urlLower = url.toLowerCase();

    // Exclude common non-informative pages
    const excludePatterns = [
      /\b(login|signin|sign[- ]in|register|signup|sign[- ]up)\b/,
      /\b(privacy|terms|cookies?|legal|disclaimer)\b/,
      /\b(career|jobs|hiring|work[- ]with[- ]us)\b/,
      /\b(download|app[- ]?store|play[- ]?store)\b/,
      /\.(pdf|jpg|jpeg|png|gif|svg|zip|doc|docx)$/,
      /#/, // Anchor links
      /javascript:/,
      /mailto:/,
      /tel:/,
    ];

    return excludePatterns.some((pattern) => pattern.test(urlLower));
  }

  /**
   * Extract page title from URL path
   */
  private extractPageTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Convert kebab-case or snake_case to Title Case
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
      return urlObj.hostname;
    } catch {
      return 'Unknown Page';
    }
  }

  private limitText(text: string, maxCharacters: number): string {
    if (text.length <= maxCharacters) return text;
    return `${text.slice(0, maxCharacters)}\n[Content truncated to fit the LLM request budget.]`;
  }
}
