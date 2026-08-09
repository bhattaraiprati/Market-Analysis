/**
 * Conversation Orchestrator Agent
 * Main agent that coordinates query routing, data retrieval, and response generation
 * Flow: User Query → Intent Analysis → Data Retrieval → Response Generation
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { AgentContext, AgentResult } from '../base/agent.types';
import {
  QueryRouterAgent,
  QueryIntent,
} from '../query-router/query-router.agent';
import { WriterAgent } from '../writer/writer.agent';
import { LlmService } from '../../llm/llm.service';
import { LlmGenerateResult } from '../../llm/llm.types';
import {
  ConversationWebResearchResult,
  ConversationWebSearchService,
} from '../../conversation/conversation-web-search.service';
import { repairMojibake } from '../../common/utils/text-encoding.util';

export interface ConversationResult {
  response: string;
  intent: QueryIntent;
  sourcesUsed: {
    webSearch?: {
      used: boolean;
      queries: string[];
      resultsCount: number;
      sitesCount?: number;
      pagesScraped?: number;
      failures?: number;
      summary?: string;
    };
    knowledgeBase?: {
      used: boolean;
      knowledgeBaseIds: string[];
      chunksRetrieved: number;
      relevanceScores: number[];
      context?: string;
    };
  };
  processingTimeMs: number;
  modelUsed: string;
  usage: LlmGenerateResult['usage'];
}

@Injectable()
export class ConversationOrchestratorAgent extends BaseAgent<ConversationResult> {
  constructor(
    private readonly queryRouterAgent: QueryRouterAgent,
    private readonly writerAgent: WriterAgent,
    private readonly llmService: LlmService,
  ) {
    super('ConversationOrchestratorAgent');
  }

  async execute(
    context: AgentContext,
  ): Promise<AgentResult<ConversationResult>> {
    const startTime = Date.now();
    this.logStart('Starting conversation orchestration');

    try {
      const userQuery = context.additionalParams?.userQuery as string;
      const personaConfig = context.additionalParams?.personaConfig as any;
      const conversationHistory = context.additionalParams
        ?.conversationHistory as any[];
      const knowledgeBaseService = context.additionalParams
        ?.knowledgeBaseService as any;
      const searchService = context.additionalParams
        ?.searchService as ConversationWebSearchService;

      if (!userQuery) {
        throw new Error('User query is required');
      }

      // Step 1: Analyze query intent
      this.logger.log('📊 Step 1: Analyzing query intent...');
      const routerResult = await this.queryRouterAgent.execute({
        organizationId: context.organizationId,
        researchJobId: context.researchJobId,
        companyContext: context.companyContext,
        additionalParams: {
          userQuery,
          personaConfig,
          conversationHistory,
        },
      });

      if (!routerResult.success || !routerResult.data) {
        throw new Error('Query router failed');
      }

      const intent = routerResult.data;
      this.logger.log(
        `✅ Intent: webSearch=${intent.requiresWebSearch}, kb=${intent.requiresKnowledgeBase}`,
      );

      // Step 2: Retrieve data from sources
      const sourcesUsed: ConversationResult['sourcesUsed'] = {};

      let webSearchContext = '';
      let knowledgeBaseContext = '';

      // 2a. Web Search (if needed and permitted)
      if (
        intent.requiresWebSearch &&
        personaConfig?.web_search_enabled &&
        searchService
      ) {
        this.logger.log('🌐 Step 2a: Executing web search...');
        try {
          const webResearch = await searchService.research({
            userQuery,
            optimizedQuery: intent.searchQuery,
            persona: personaConfig,
            companyContext: context.companyContext,
            conversationHistory,
          });
          if (webResearch.results.length > 0) {
            sourcesUsed.webSearch = {
              used: true,
              queries: webResearch.queries,
              resultsCount: webResearch.results.length,
              sitesCount: webResearch.sites.length,
              pagesScraped: webResearch.results.length,
              failures: webResearch.failures,
              summary: this.summarizeWebResults(webResearch),
            };
            webSearchContext = this.formatWebSearchContext(webResearch);
            this.logger.log(
              `Web research: ${webResearch.sites.length} sites and ${webResearch.results.length} pages retrieved`,
            );
          } else {
            sourcesUsed.webSearch = {
              used: true,
              queries: webResearch.queries,
              resultsCount: 0,
              sitesCount: webResearch.sites.length,
              pagesScraped: 0,
              failures: webResearch.failures,
              summary: 'Web search completed but returned no usable pages',
            };
          }
        } catch (error) {
          this.logger.warn('Web search failed:', error);
          sourcesUsed.webSearch = {
            used: false,
            queries: [intent.searchQuery || userQuery],
            resultsCount: 0,
            failures: 1,
            summary: 'Web research failed before usable evidence was retrieved',
          };
          webSearchContext =
            'WEB RESEARCH STATUS: Retrieval failed. Clearly disclose that current web information could not be verified and do not present unverified current claims as facts.';
        }
      }

      // 2b. Knowledge Base Search (if needed and available)
      if (
        intent.requiresKnowledgeBase &&
        personaConfig?.knowledgeBaseIds?.length > 0 &&
        knowledgeBaseService
      ) {
        this.logger.log('📚 Step 2b: Querying knowledge base...');
        try {
          const kbQuery = intent.knowledgeBaseQuery || userQuery;
          const kbResults = await knowledgeBaseService.query(
            kbQuery,
            context.organizationId,
            {
              knowledgeBaseIds: personaConfig.knowledgeBaseIds,
              topK: 5,
              minScore: 0.7,
            },
          );

          if (kbResults && kbResults.length > 0) {
            sourcesUsed.knowledgeBase = {
              used: true,
              knowledgeBaseIds: personaConfig.knowledgeBaseIds,
              chunksRetrieved: kbResults.length,
              relevanceScores: kbResults.map((r: any) => r.score),
              context: this.formatKnowledgeBaseContext(kbResults),
            };
            knowledgeBaseContext = sourcesUsed.knowledgeBase.context!;
            this.logger.log(
              `✅ Knowledge base: ${kbResults.length} chunks retrieved`,
            );
          }
        } catch (error) {
          this.logger.warn('Knowledge base search failed:', error);
        }
      }

      // Step 3: Generate response using persona and retrieved data
      this.logger.log('💬 Step 3: Generating response...');
      const response = await this.generateResponse(
        userQuery,
        personaConfig,
        conversationHistory,
        webSearchContext,
        knowledgeBaseContext,
        intent,
        context.companyContext,
      );
      this.logger.log(
        `Final response model: ${response.model}, finishReason=${response.finishReason || 'unknown'}, totalTokens=${response.usage.totalTokens}`,
      );

      const processingTimeMs = Date.now() - startTime;

      this.logSuccess(`Conversation completed in ${processingTimeMs}ms`);

      return this.createSuccessResult<ConversationResult>(
        {
          response: repairMojibake(response.content.trim()),
          intent,
          sourcesUsed,
          processingTimeMs,
          modelUsed: response.model,
          usage: response.usage,
        },
        {
          queryType: intent.queryType,
          sourcesUsedCount: Object.keys(sourcesUsed).length,
        },
      );
    } catch (error) {
      this.logError('Conversation orchestrator failed', error);
      return this.createErrorResult(error);
    }
  }

  private async generateResponse(
    userQuery: string,
    personaConfig: any,
    conversationHistory: any[],
    webSearchContext: string,
    knowledgeBaseContext: string,
    intent: QueryIntent,
    companyContext: string,
  ): Promise<LlmGenerateResult> {
    const systemPrompt = this.buildSystemPrompt(personaConfig, intent);
    const userPrompt = this.buildUserPrompt(
      userQuery,
      conversationHistory,
      this.truncate(webSearchContext, 8000),
      this.truncate(knowledgeBaseContext, 3500),
      this.truncate(companyContext, 3500),
    );

    this.logger.log(
      `Final prompt size: system=${systemPrompt.length} chars, user=${userPrompt.length} chars, web=${Math.min(webSearchContext.length, 8000)} chars, kb=${Math.min(knowledgeBaseContext.length, 3500)} chars`,
    );

    return this.callLlm(systemPrompt, userPrompt, 4000, 0.7);
  }

  private buildSystemPrompt(personaConfig: any, intent: QueryIntent): string {
    let prompt = `You are an AI assistant with the following persona configuration:

PERSONA NAME: ${personaConfig?.name || 'AI Assistant'}
PERSONA ROLE: ${personaConfig?.primary_focus_role || 'general'}
PERSONA DESCRIPTION: ${this.truncate(personaConfig?.description || 'A helpful AI assistant', 1000)}

`;

    if (personaConfig?.system_prompt) {
      prompt += `CUSTOM INSTRUCTIONS:\n${this.truncate(personaConfig.system_prompt, 2000)}\n\n`;
    }

    prompt += `YOUR CAPABILITIES:
- Web Search: ${personaConfig?.web_search_enabled ? 'ENABLED' : 'DISABLED'}
- Knowledge Base Access: ${personaConfig?.knowledgeBaseIds?.length > 0 ? 'AVAILABLE' : 'NOT AVAILABLE'}

CURRENT QUERY CONTEXT:
- Query Type: ${intent.queryType}
- Uses Web Search: ${intent.requiresWebSearch}
- Uses Knowledge Base: ${intent.requiresKnowledgeBase}

RESPONSE GUIDELINES:
1. Web retrieval has already been performed by the application. Never call browser.search or any other tool; answer only from the supplied context
2. Respond in character according to your persona role and description
3. If web search data is provided, cite it naturally
4. If knowledge base data is provided, reference the internal documents
5. Be conversational and helpful
6. If you cannot answer due to missing data or permissions, explain clearly
7. Do not make up information - only use provided context
8. Keep responses concise but comprehensive

`;

    return prompt;
  }

  private buildUserPrompt(
    userQuery: string,
    conversationHistory: any[],
    webSearchContext: string,
    knowledgeBaseContext: string,
    companyContext: string,
  ): string {
    let prompt = '';

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      const recentHistory = conversationHistory.slice(-4);
      recentHistory.forEach((msg: any) => {
        prompt += `${msg.role.toUpperCase()}: ${this.truncate(String(msg.content || ''), 600)}\n`;
      });
      prompt += `\n`;
    }

    // Add web search context
    if (webSearchContext) {
      prompt += `WEB SEARCH RESULTS:\n${webSearchContext}\n\n`;
    }

    // Add knowledge base context
    if (knowledgeBaseContext) {
      prompt += `KNOWLEDGE BASE CONTEXT (from your uploaded documents):\n${knowledgeBaseContext}\n\n`;
    }

    if (companyContext) {
      prompt += `ORGANIZATION PROFILE (from the registered organization):\n${companyContext}\n\n`;
    }

    // Add current user query
    prompt += `ANSWER REQUEST (all required retrieval is already complete):\n${userQuery}\n\n`;

    prompt += `Use the organization profile when the user says "our", "we", "us", "our company", or "our competitors". Do not ask for company details already present in that profile. If web results are available, base current claims on those results and include source links. Produce the final answer now without calling or requesting any tool.`;

    return prompt;
  }

  private formatWebSearchContext(
    research: ConversationWebResearchResult,
  ): string {
    let context = '';
    // Keep enough room for the persona, history, organization context, and a
    // useful final answer within the shared Groq request budget.
    let remainingCharacters = 8000;
    const pagesPerSite = new Map<string, number>();
    const balancedResults = research.results.filter((result) => {
      const count = pagesPerSite.get(result.siteUrl) || 0;
      if (count >= 2) return false;
      pagesPerSite.set(result.siteUrl, count + 1);
      return true;
    });

    balancedResults.forEach((result, idx) => {
      if (remainingCharacters <= 0) return;
      const content = result.content.slice(
        0,
        Math.min(600, remainingCharacters),
      );
      context += `[${idx + 1}] ${result.title || 'Untitled'}\n`;
      context += `Page type: ${result.pageType}\n`;
      if (result.snippet) {
        context += `Summary: ${this.truncate(result.snippet, 300)}\n`;
      }
      if (content) {
        context += `Content: ${content}\n`;
        remainingCharacters -= content.length;
      }
      if (result.url) {
        context += `Source: ${result.url}\n`;
      }
      context += `\n`;
    });
    return context;
  }

  private formatKnowledgeBaseContext(results: any[]): string {
    let context = '';
    results.forEach((result: any, idx: number) => {
      context += `[Document ${idx + 1}] ${result.metadata?.file_name || 'Untitled'}\n`;
      context += `Relevance Score: ${(result.score * 100).toFixed(1)}%\n`;
      context += `Content: ${result.metadata?.original_text || ''}\n`;
      context += `\n`;
    });
    return context;
  }

  private summarizeWebResults(research: ConversationWebResearchResult): string {
    return `Generated ${research.queries.length} queries and retrieved ${research.results.length} pages from ${research.sites.length} primary sites`;
  }

  private truncate(value: string, maxCharacters: number): string {
    if (!value || value.length <= maxCharacters) return value;
    return `${value.slice(0, maxCharacters)}\n[Context truncated to fit the model request budget]`;
  }

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4000,
    temperature = 0.7,
  ): Promise<LlmGenerateResult> {
    return this.llmService.generateText({
      task: 'conversation',
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
    });
  }
}
