/**
 * Query Router Agent
 * Analyzes user queries to determine intent and required data sources
 * Decides whether to use web search, knowledge base search, or both
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { AgentContext, AgentResult } from '../base/agent.types';
import { LlmService } from '../../llm/llm.service';
import { LlmGenerateResult } from '../../llm/llm.types';

export interface QueryIntent {
  requiresWebSearch: boolean;
  requiresKnowledgeBase: boolean;
  searchQuery?: string;
  queryType: 'factual' | 'analytical' | 'conversational' | 'current_data';
  confidence: number;
  reasoning: string;
  temporalIndicators: string[];
  knowledgeBaseQuery?: string;
}

@Injectable()
export class QueryRouterAgent extends BaseAgent<QueryIntent> {
  constructor(private readonly llmService: LlmService) {
    super('QueryRouterAgent');
  }

  async execute(context: AgentContext): Promise<AgentResult<QueryIntent>> {
    this.logStart('Analyzing query intent');

    try {
      const userQuery = context.additionalParams?.userQuery as string;
      const personaConfig = context.additionalParams?.personaConfig as any;
      const conversationHistory = context.additionalParams
        ?.conversationHistory as any[];
      const companyContext = context.companyContext;

      if (!userQuery) {
        throw new Error('User query is required');
      }

      // Build analysis prompt
      const systemPrompt = this.buildSystemPrompt(personaConfig);
      const userPrompt = this.buildUserPrompt(
        userQuery,
        conversationHistory,
        companyContext,
      );

      const analysisResponse = await this.callLlm(systemPrompt, userPrompt);
      this.logger.log(
        `Routing model: ${analysisResponse.model}, finishReason=${analysisResponse.finishReason || 'unknown'}`,
      );

      // Parse response
      const intent = this.parseIntentResponse(analysisResponse.content);

      this.logSuccess(
        `Query analyzed: webSearch=${intent.requiresWebSearch}, kb=${intent.requiresKnowledgeBase}, type=${intent.queryType}`,
      );

      return this.createSuccessResult<QueryIntent>(intent, {
        queryType: intent.queryType,
        confidence: intent.confidence,
      });
    } catch (error) {
      this.logError('Query router agent failed', error);
      return this.createErrorResult(error);
    }
  }

  private buildSystemPrompt(personaConfig: any): string {
    const webSearchEnabled = personaConfig?.web_search_enabled ?? true;
    const hasKnowledgeBase = personaConfig?.knowledgeBaseIds?.length > 0;

    return `You are a query intent analyzer for an AI assistant system. Your job is to analyze user queries and determine what data sources are needed to answer them.

AVAILABLE DATA SOURCES:
- Web Search: ${webSearchEnabled ? 'ENABLED' : 'DISABLED'} - For current events, real-time data, recent information
- Knowledge Base: ${hasKnowledgeBase ? 'AVAILABLE' : 'NOT AVAILABLE'} - Contains organization-specific documents, internal data, uploaded files

PERSONA PERMISSIONS:
- Web search allowed: ${webSearchEnabled}
- Knowledge base access: ${hasKnowledgeBase}

YOUR TASK:
Analyze the user's query and determine:
1. Does this require CURRENT/LIVE data from the web? (recent events, latest news, current prices, today's weather)
2. Does this require data from the KNOWLEDGE BASE? (internal documents, uploaded files, company data)
3. What TYPE of query is this? (factual, analytical, conversational, current_data)
4. Extract temporal indicators (today, now, latest, recent, current, 2026, etc.)

RULES:
- If web search is DISABLED but query requires current data, set requiresWebSearch=false and explain limitation
- If the user explicitly asks to search, browse, look up, research, or "do a web search", set requiresWebSearch=true when web search is enabled
- If no knowledge base exists, set requiresKnowledgeBase=false
- The organization profile supplied with the query is trusted company context and does not require the knowledge base
- Queries about "uploaded documents" or "my files" use the knowledge base
- Requests about "our company" or "our competitors" should use the supplied organization profile to create a specific search query
- Queries with temporal indicators like "today", "now", "latest", "current" likely need web search
- General knowledge questions can use both sources
- Conversational queries may not need either source

Respond in JSON format only.`;
  }

  private buildUserPrompt(
    userQuery: string,
    conversationHistory?: any[],
    companyContext?: string,
  ): string {
    let prompt = `Analyze this user query:

USER QUERY: "${userQuery}"

`;

    if (companyContext) {
      prompt += `ORGANIZATION PROFILE (trusted database context):\n${companyContext}\n\n`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-3);
      prompt += `RECENT CONVERSATION CONTEXT:\n`;
      recentHistory.forEach((msg: any) => {
        prompt += `${msg.role}: ${msg.content.substring(0, 150)}...\n`;
      });
      prompt += `\n`;
    }

    prompt += `Respond with a JSON object with this exact structure:
{
  "requiresWebSearch": boolean,
  "requiresKnowledgeBase": boolean,
  "searchQuery": "optimized search query if web search needed (null otherwise)",
  "knowledgeBaseQuery": "semantic search query for KB if needed (null otherwise)",
  "queryType": "factual" | "analytical" | "conversational" | "current_data",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of your decision",
  "temporalIndicators": ["list", "of", "time", "words", "found"]
}

Examples:

Query: "What's the weather today?"
Response: {"requiresWebSearch": true, "requiresKnowledgeBase": false, "searchQuery": "current weather", "knowledgeBaseQuery": null, "queryType": "current_data", "confidence": 0.95, "reasoning": "Requires real-time weather data", "temporalIndicators": ["today"]}

Query: "Summarize the Q4 report I uploaded"
Response: {"requiresWebSearch": false, "requiresKnowledgeBase": true, "searchQuery": null, "knowledgeBaseQuery": "Q4 report summary financial results", "queryType": "analytical", "confidence": 0.9, "reasoning": "References uploaded document", "temporalIndicators": []}

Query: "What are the latest AI trends and how do they compare to our strategy?"
Response: {"requiresWebSearch": true, "requiresKnowledgeBase": true, "searchQuery": "latest AI trends 2026", "knowledgeBaseQuery": "AI strategy company plans", "queryType": "analytical", "confidence": 0.85, "reasoning": "Needs current trends AND internal strategy docs", "temporalIndicators": ["latest"]}

Now analyze the user's query above.`;

    return prompt;
  }

  private async callLlm(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<LlmGenerateResult> {
    return this.llmService.generateText({
      task: 'routing',
      systemPrompt,
      userPrompt,
      maxTokens: 1000,
      temperature: 0.3,
    });
  }

  private parseIntentResponse(response: string): QueryIntent {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      return {
        requiresWebSearch: parsed.requiresWebSearch ?? false,
        requiresKnowledgeBase: parsed.requiresKnowledgeBase ?? false,
        searchQuery: parsed.searchQuery || undefined,
        knowledgeBaseQuery: parsed.knowledgeBaseQuery || undefined,
        queryType: parsed.queryType || 'conversational',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'Intent analysis completed',
        temporalIndicators: parsed.temporalIndicators || [],
      };
    } catch (error) {
      this.logger.warn(
        'Failed to parse intent response as JSON, using fallback',
      );
      // Fallback: try to infer from text
      return this.fallbackIntentParsing(response);
    }
  }

  private fallbackIntentParsing(response: string): QueryIntent {
    const lowerResponse = response.toLowerCase();

    return {
      requiresWebSearch:
        lowerResponse.includes('web search') ||
        lowerResponse.includes('current data'),
      requiresKnowledgeBase:
        lowerResponse.includes('knowledge base') ||
        lowerResponse.includes('documents'),
      queryType: 'conversational',
      confidence: 0.5,
      reasoning: 'Fallback parsing used',
      temporalIndicators: [],
    };
  }
}
