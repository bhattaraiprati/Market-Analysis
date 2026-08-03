/**
 * Conversation Orchestrator Agent
 * Main agent that coordinates query routing, data retrieval, and response generation
 * Flow: User Query → Intent Analysis → Data Retrieval → Response Generation
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { AgentContext, AgentResult } from '../base/agent.types';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QueryRouterAgent, QueryIntent } from '../query-router/query-router.agent';
import { WriterAgent } from '../writer/writer.agent';

export interface ConversationResult {
  response: string;
  intent: QueryIntent;
  sourcesUsed: {
    webSearch?: {
      used: boolean;
      queries: string[];
      resultsCount: number;
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
}

@Injectable()
export class ConversationOrchestratorAgent extends BaseAgent<ConversationResult> {
  private readonly bedrock: BedrockRuntimeClient;
  private readonly modelId = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

  constructor(
    private readonly queryRouterAgent: QueryRouterAgent,
    private readonly writerAgent: WriterAgent,
  ) {
    super('ConversationOrchestratorAgent');

    if (!process.env.CLAUDE_ACCESS_KEY_ID || !process.env.CLAUDE_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found');
    }

    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.CLAUDE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLAUDE_SECRET_ACCESS_KEY,
      },
    });
  }

  async execute(context: AgentContext): Promise<AgentResult<ConversationResult>> {
    const startTime = Date.now();
    this.logStart('Starting conversation orchestration');

    try {
      const userQuery = context.additionalParams?.userQuery as string;
      const personaConfig = context.additionalParams?.personaConfig as any;
      const conversationHistory = context.additionalParams?.conversationHistory as any[];
      const knowledgeBaseService = context.additionalParams?.knowledgeBaseService as any;
      const searchService = context.additionalParams?.searchService as any;

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
      this.logger.log(`✅ Intent: webSearch=${intent.requiresWebSearch}, kb=${intent.requiresKnowledgeBase}`);

      // Step 2: Retrieve data from sources
      const sourcesUsed: ConversationResult['sourcesUsed'] = {};

      let webSearchContext = '';
      let knowledgeBaseContext = '';

      // 2a. Web Search (if needed and permitted)
      if (intent.requiresWebSearch && personaConfig?.web_search_enabled && searchService) {
        this.logger.log('🌐 Step 2a: Executing web search...');
        try {
          const webResults = await searchService.search(intent.searchQuery || userQuery);
          if (webResults && webResults.length > 0) {
            sourcesUsed.webSearch = {
              used: true,
              queries: [intent.searchQuery || userQuery],
              resultsCount: webResults.length,
              summary: this.summarizeWebResults(webResults),
            };
            webSearchContext = this.formatWebSearchContext(webResults);
            this.logger.log(`✅ Web search: ${webResults.length} results retrieved`);
          }
        } catch (error) {
          this.logger.warn('Web search failed:', error);
        }
      }

      // 2b. Knowledge Base Search (if needed and available)
      if (intent.requiresKnowledgeBase && personaConfig?.knowledgeBaseIds?.length > 0 && knowledgeBaseService) {
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
            this.logger.log(`✅ Knowledge base: ${kbResults.length} chunks retrieved`);
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
      );

      const processingTimeMs = Date.now() - startTime;

      this.logSuccess(`Conversation completed in ${processingTimeMs}ms`);

      return this.createSuccessResult<ConversationResult>(
        {
          response,
          intent,
          sourcesUsed,
          processingTimeMs,
          modelUsed: this.modelId,
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
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(personaConfig, intent);
    const userPrompt = this.buildUserPrompt(
      userQuery,
      conversationHistory,
      webSearchContext,
      knowledgeBaseContext,
    );

    const response = await this.callClaude(systemPrompt, userPrompt, 4000, 0.7);
    return response;
  }

  private buildSystemPrompt(personaConfig: any, intent: QueryIntent): string {
    let prompt = `You are an AI assistant with the following persona configuration:

PERSONA NAME: ${personaConfig?.name || 'AI Assistant'}
PERSONA ROLE: ${personaConfig?.primary_focus_role || 'general'}
PERSONA DESCRIPTION: ${personaConfig?.description || 'A helpful AI assistant'}

`;

    if (personaConfig?.system_prompt) {
      prompt += `CUSTOM INSTRUCTIONS:\n${personaConfig.system_prompt}\n\n`;
    }

    prompt += `YOUR CAPABILITIES:
- Web Search: ${personaConfig?.web_search_enabled ? 'ENABLED' : 'DISABLED'}
- Knowledge Base Access: ${personaConfig?.knowledgeBaseIds?.length > 0 ? 'AVAILABLE' : 'NOT AVAILABLE'}

CURRENT QUERY CONTEXT:
- Query Type: ${intent.queryType}
- Uses Web Search: ${intent.requiresWebSearch}
- Uses Knowledge Base: ${intent.requiresKnowledgeBase}

RESPONSE GUIDELINES:
1. Respond in character according to your persona role and description
2. If web search data is provided, cite it naturally
3. If knowledge base data is provided, reference the internal documents
4. Be conversational and helpful
5. If you cannot answer due to missing data or permissions, explain clearly
6. Do not make up information - only use provided context
7. Keep responses concise but comprehensive

`;

    return prompt;
  }

  private buildUserPrompt(
    userQuery: string,
    conversationHistory: any[],
    webSearchContext: string,
    knowledgeBaseContext: string,
  ): string {
    let prompt = '';

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      const recentHistory = conversationHistory.slice(-5); // Last 5 messages
      recentHistory.forEach((msg: any) => {
        prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
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

    // Add current user query
    prompt += `CURRENT USER QUERY:\n${userQuery}\n\n`;

    prompt += `Please provide a helpful response based on the available context.`;

    return prompt;
  }

  private formatWebSearchContext(results: any[]): string {
    let context = '';
    results.slice(0, 5).forEach((result: any, idx: number) => {
      context += `[${idx + 1}] ${result.title || 'Untitled'}\n`;
      context += `${result.snippet || result.content?.substring(0, 300) || ''}\n`;
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

  private summarizeWebResults(results: any[]): string {
    return `Retrieved ${results.length} web results`;
  }

  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4000,
    temperature = 0.7,
  ): Promise<string> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await this.bedrock.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(decoded);

    const text = parsed.content?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Claude');
    }
    return text;
  }
}
