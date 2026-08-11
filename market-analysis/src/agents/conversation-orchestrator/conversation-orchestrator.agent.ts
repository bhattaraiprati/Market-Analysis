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
      queries?: string[];
      files?: string[];
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
      console.log('Query router result:', routerResult);

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

      // A configured persona should use its KB for every substantive request.
      // This is intentionally enforced here instead of trusting the probabilistic
      // router alone: skipping retrieval is a much more expensive failure than
      // retrieving a few extra scoped chunks.
      const shouldUseKnowledgeBase =
        personaConfig?.knowledgeBaseIds?.length > 0 &&
        knowledgeBaseService &&
        (intent.requiresKnowledgeBase || !this.isSmallTalk(userQuery));

      if (shouldUseKnowledgeBase) {
        intent.requiresKnowledgeBase = true;
      }

      console.log(`Should use knowledge base: ${shouldUseKnowledgeBase}, requiresKnowledgeBase=${intent.requiresKnowledgeBase}`);

      // 2b. Knowledge Base Search (if needed and available)
      if (shouldUseKnowledgeBase) {
        this.logger.log('📚 Step 2b: Querying knowledge base...');
        console.log(`📚 Step 2b: Querying knowledge base...`);

        console.log(`Persona KB IDs: ${personaConfig.knowledgeBaseIds}`);

        try {
          sourcesUsed.knowledgeBase = {
            used: false,
            knowledgeBaseIds: personaConfig.knowledgeBaseIds,
            files: [],
            chunksRetrieved: 0,
            relevanceScores: [],
            context:
              'KB RETRIEVAL STATUS: Retrieval failed. Do not supply organization-specific details from model memory; disclose that the knowledge base could not be verified.',
          };
          knowledgeBaseContext = sourcesUsed.knowledgeBase.context!;
          const kbQueries = this.buildKnowledgeBaseQueries(
            userQuery,
            intent,
            personaConfig,
          );
          const queryResultSets = await Promise.all(
            kbQueries.map((query) =>
              knowledgeBaseService.query(query, context.organizationId, {
                knowledgeBaseIds: personaConfig.knowledgeBaseIds,
                topK: 8,
                minScore: 0.55,
              }),
            ),
          );
          sourcesUsed.knowledgeBase = {
            used: true,
            knowledgeBaseIds: personaConfig.knowledgeBaseIds,
            queries: kbQueries,
            files: [],
            chunksRetrieved: 0,
            relevanceScores: [],
            context:
              'KB RETRIEVAL STATUS: No relevant evidence was retrieved. Do not supply organization-specific details from model memory; state that the available evidence is insufficient.',
          };
          knowledgeBaseContext = sourcesUsed.knowledgeBase.context!;
          const kbResults = this.mergeKnowledgeBaseResults(queryResultSets, 10);

          if (kbResults && kbResults.length > 0) {
            const files = [
              ...new Set(
                kbResults
                  .map((result: any) => result.metadata?.file_name)
                  .filter(Boolean),
              ),
            ] as string[];
            sourcesUsed.knowledgeBase = {
              used: true,
              knowledgeBaseIds: personaConfig.knowledgeBaseIds,
              queries: kbQueries,
              files,
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
      const draftResponse = await this.generateResponse(
        userQuery,
        personaConfig,
        conversationHistory,
        webSearchContext,
        knowledgeBaseContext,
        intent,
        context.companyContext,
      );
      const kbWasEligible = shouldUseKnowledgeBase;
      const response = await this.reviewGroundedResponse(
        draftResponse,
        userQuery,
        personaConfig,
        knowledgeBaseContext,
        context.companyContext,
        kbWasEligible,
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
      this.truncateKnowledgeBaseContext(knowledgeBaseContext, 10500),
      this.truncate(companyContext, 2500),
    );

    this.logger.log(
      `Final prompt size: system=${systemPrompt.length} chars, user=${userPrompt.length} chars, web=${Math.min(webSearchContext.length, 8000)} chars, kb=${Math.min(knowledgeBaseContext.length, 10500)} chars`,
    );

    // Grounded responses favor the larger analysis model and deterministic
    // decoding. This materially reduces plausible-but-unsupported completions.
    return this.callLlm(
      systemPrompt,
      userPrompt,
      knowledgeBaseContext ? 2200 : 3000,
      knowledgeBaseContext ? 0.15 : 0.4,
      knowledgeBaseContext ? 'analysis' : 'conversation',
    );
  }

  private async reviewGroundedResponse(
    draft: LlmGenerateResult,
    userQuery: string,
    personaConfig: any,
    knowledgeBaseContext: string,
    companyContext: string,
    kbWasEligible: boolean,
  ): Promise<LlmGenerateResult> {
    if (!kbWasEligible) return draft;
    if (!knowledgeBaseContext.includes('<KB_SOURCE')) return draft;

    const systemPrompt = `You are the final evidence auditor for a knowledge-grounded AI response.

Your only output is the corrected final answer—never output a critique, score, preamble, or JSON.

MANDATORY AUDIT:
- Treat facts explicitly supplied in the current user request as case facts
- Treat the supplied organization profile and KB excerpts as the only evidence for organization-specific claims
- Delete or correct every unsupported product plan, feature, integration, certification, customer result, percentage, price, policy, approval, timeline, location, named vendor, and commitment
- Preserve named frameworks exactly. Never rename elements, add elements, or substitute a framework from model memory
- Label reasonable inferences as inferences and missing decision information as unknown
- Never turn a company target, illustrative scenario, or response target into a proven outcome or guarantee
- Never infer the prospect's location, systems, budget, requirements, authority, or intent
- Cite material internal claims as [KB: exact-filename.pdf]
- Keep useful structure, but correctness and traceability take priority

PERSONA ROLE: ${personaConfig?.primary_focus_role || 'GENERAL_ASSISTANT'}
PERSONA NAME: ${personaConfig?.name || 'AI Assistant'}`;

    const userPrompt = `CURRENT USER REQUEST:
${this.truncate(userQuery, 1800)}

ORGANIZATION PROFILE:
${this.truncate(companyContext, 1200)}

RETRIEVED KB EVIDENCE:
${this.truncateKnowledgeBaseContext(knowledgeBaseContext, 6500)}

DRAFT TO AUDIT AND, WHEN NECESSARY, REWRITE:
${this.truncate(draft.content, 5000)}

Return only the final grounded answer.`;

    try {
      const reviewed = await this.callLlm(
        systemPrompt,
        userPrompt,
        1800,
        0.05,
        'analysis',
      );
      return {
        ...reviewed,
        usage: {
          promptTokens: draft.usage.promptTokens + reviewed.usage.promptTokens,
          completionTokens:
            draft.usage.completionTokens + reviewed.usage.completionTokens,
          totalTokens: draft.usage.totalTokens + reviewed.usage.totalTokens,
        },
      };
    } catch (error) {
      this.logger.warn(
        'Grounding review failed; returning the already-grounded draft response',
        error,
      );
      return draft;
    }
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

GROUNDING CONTRACT (MANDATORY):
1. Treat the current user message as trusted case input, and the supplied organization profile and retrieved sources as the only evidence for organization-specific claims
2. Never use general model memory to add a product plan, feature, integration, certification, customer result, percentage, price, location, policy, approval, timeline, or named vendor that is absent from the supplied evidence
3. Never expand, rename, or redefine a named framework or acronym unless its exact definition appears in the evidence. Preserve the documented definition and number of framework elements exactly
4. Distinguish clearly between: SUPPORTED FACT (direct evidence), REASONABLE INFERENCE (derived and labeled), and UNKNOWN (missing evidence). Never turn an inference or target into a proven result or guarantee
5. Do not infer a prospect's location, systems, requirements, budget, authority, or intent from the organization profile or from industry stereotypes
6. When sources conflict, disclose the conflict and follow any source-priority rule stated in the knowledge base. Do not silently combine conflicting facts
7. Before answering, silently audit every proper noun, number, plan name, framework element, integration, outcome, and commitment. Remove or label anything not supported
8. Cite material internal claims inline as [KB: exact-filename.pdf]. End KB-grounded answers with a short "Evidence gaps" section when information needed for the decision is missing

RESPONSE GUIDELINES:
1. Web retrieval has already been performed by the application. Never call browser.search or any other tool; answer only from the supplied context
2. Respond in character according to your persona role and description
3. If web search data is provided, cite it naturally
4. If knowledge base data is provided, reference the internal documents
5. Be conversational and helpful
6. If you cannot answer due to missing data or permissions, explain clearly
7. Do not make up information - only use provided context and facts explicitly supplied by the user
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
      prompt += `KNOWLEDGE BASE EVIDENCE (authoritative excerpts from attached documents; source identifiers must be preserved in citations):\n${knowledgeBaseContext}\n\n`;
    }

    if (companyContext) {
      prompt += `ORGANIZATION PROFILE (from the registered organization):\n${companyContext}\n\n`;
    }

    // Add current user query
    prompt += `ANSWER REQUEST (all required retrieval is already complete):\n${userQuery}\n\n`;

    prompt += `Use the organization profile when the user says "our", "we", "us", "our company", or "our competitors". Do not ask for company details already present in that profile. Treat facts in the current user request as case facts, not as proof of unstated requirements. If web results are available, base current claims on those results and include source links. For KB-grounded answers, cite the exact KB filename beside material internal claims. If evidence is absent, say "unknown from the available evidence" and request the missing information. Produce the final answer now without calling or requesting any tool.`;

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
      context += `<KB_SOURCE id="${idx + 1}" file="${result.metadata?.file_name || 'Untitled'}">\n`;
      context += `Relevance Score: ${(result.score * 100).toFixed(1)}%\n`;
      context += `Content: ${result.metadata?.original_text || ''}\n`;
      context += `</KB_SOURCE>\n\n`;
    });
    return context;
  }

  private buildKnowledgeBaseQueries(
    userQuery: string,
    intent: QueryIntent,
    personaConfig: any,
  ): string[] {
    const queries = [
      userQuery.trim(),
      intent.knowledgeBaseQuery?.trim(),
      `${personaConfig?.primary_focus_role || 'persona'} exact internal framework definitions policies constraints thresholds required evidence and decision criteria for: ${userQuery}`,
    ].filter((query): query is string => Boolean(query));

    return [...new Set(queries)];
  }

  private mergeKnowledgeBaseResults(resultSets: any[][], limit: number): any[] {
    const byId = new Map<string, any>();
    resultSets.flat().forEach((result: any) => {
      const key =
        result.id ||
        `${result.metadata?.file_id}:${result.metadata?.chunk_index}`;
      const existing = byId.get(key);
      if (!existing || Number(result.score) > Number(existing.score)) {
        byId.set(key, result);
      }
    });

    const ranked = [...byId.values()].sort(
      (left, right) => Number(right.score) - Number(left.score),
    );
    const selected: any[] = [];
    const selectedIds = new Set<string>();
    const seenFiles = new Set<string>();

    // First preserve source diversity so one long document cannot crowd every
    // persona-specific playbook out of the prompt.
    for (const result of ranked) {
      const file = result.metadata?.file_name || 'Untitled';
      const id =
        result.id ||
        `${result.metadata?.file_id}:${result.metadata?.chunk_index}`;
      if (seenFiles.has(file)) continue;
      selected.push(result);
      selectedIds.add(id);
      seenFiles.add(file);
      if (selected.length >= limit) return selected;
    }

    for (const result of ranked) {
      const id =
        result.id ||
        `${result.metadata?.file_id}:${result.metadata?.chunk_index}`;
      if (selectedIds.has(id)) continue;
      selected.push(result);
      selectedIds.add(id);
      if (selected.length >= limit) break;
    }

    return selected;
  }

  private isSmallTalk(userQuery: string): boolean {
    return /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)[!.?\s]*$/i.test(
      userQuery.trim(),
    );
  }

  private summarizeWebResults(research: ConversationWebResearchResult): string {
    return `Generated ${research.queries.length} queries and retrieved ${research.results.length} pages from ${research.sites.length} primary sites`;
  }

  private truncate(value: string, maxCharacters: number): string {
    if (!value || value.length <= maxCharacters) return value;
    return `${value.slice(0, maxCharacters)}\n[Context truncated to fit the model request budget]`;
  }

  private truncateKnowledgeBaseContext(
    value: string,
    maxCharacters: number,
  ): string {
    if (!value || value.length <= maxCharacters) return value;
    const candidate = value.slice(0, maxCharacters);
    const closingTag = '</KB_SOURCE>';
    const lastCompleteSource = candidate.lastIndexOf(closingTag);
    if (lastCompleteSource >= 0) {
      return `${candidate.slice(0, lastCompleteSource + closingTag.length)}\n[Additional KB sources omitted to fit the model request budget]`;
    }
    return this.truncate(value, maxCharacters);
  }

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4000,
    temperature = 0.7,
    task: 'conversation' | 'analysis' = 'conversation',
  ): Promise<LlmGenerateResult> {
    return this.llmService.generateText({
      task,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
    });
  }
}
