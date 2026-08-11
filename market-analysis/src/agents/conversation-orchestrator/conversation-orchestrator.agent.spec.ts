import { ConversationOrchestratorAgent } from './conversation-orchestrator.agent';
import { QueryRouterAgent } from '../query-router/query-router.agent';
import { WriterAgent } from '../writer/writer.agent';
import { LlmService } from '../../llm/llm.service';

describe('ConversationOrchestratorAgent grounding', () => {
  const queryRouter = {
    execute: jest.fn(),
  } as unknown as QueryRouterAgent;
  const writerAgent = {} as WriterAgent;
  const llmService = {
    generateText: jest.fn(),
  } as unknown as LlmService;

  let agent: ConversationOrchestratorAgent;

  beforeEach(() => {
    agent = new ConversationOrchestratorAgent(
      queryRouter,
      writerAgent,
      llmService,
    );
    jest.clearAllMocks();
  });

  it('forces scoped multi-query KB retrieval and a low-temperature grounded model for persona advice', async () => {
    const userQuery =
      'Qualify this opportunity: a commercial HVAC company has 60 technicians across two branches. Dispatch runs through spreadsheets and chat. They frequently miss SLAs, but budget, buyer, timeline, and integrations are unknown.';
    const knowledgeBaseService = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'sales-field',
          score: 0.91,
          metadata: {
            file_id: 'sales-file',
            chunk_index: 0,
            file_name: '02_sales_qualification_and_pipeline_playbook.pdf',
            original_text:
              'FIELD means F — Friction, I — Impact, E — Environment, L — Leadership, D — Decision. Strong fit normally requires 25+ technicians, recognized operational pain, and a sponsor.',
          },
        },
        {
          id: 'company-segment',
          score: 0.84,
          metadata: {
            file_id: 'company-file',
            chunk_index: 2,
            file_name: '01_asterflow_company_knowledge_base.pdf',
            original_text:
              'Growth: 25–100 technicians. Scale: 101–500 technicians. Enterprise: 501–2,000 technicians. Plans are Growth, Scale, and Enterprise.',
          },
        },
      ]),
    };

    (queryRouter.execute as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        requiresWebSearch: false,
        requiresKnowledgeBase: false,
        queryType: 'analytical',
        confidence: 0.8,
        reasoning: 'Incorrectly treated as general analysis',
        temporalIndicators: [],
      },
    });
    (llmService.generateText as jest.Mock)
      .mockResolvedValueOnce({
        content:
          'High fit. FIELD means Functionality, Industry, Enterprise, Location, Decision, and Scale. Use the Starter plan.',
        model: 'draft-test-model',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
      })
      .mockResolvedValueOnce({
        content:
          'This is promising but incompletely qualified. FIELD means Friction, Impact, Environment, Leadership, and Decision. [KB: 02_sales_qualification_and_pipeline_playbook.pdf]',
        model: 'review-test-model',
        finishReason: 'stop',
        usage: { promptTokens: 80, completionTokens: 15, totalTokens: 95 },
      });

    const result = await agent.execute({
      organizationId: 'org-1',
      researchJobId: '',
      companyContext: 'AsterFlow organization profile',
      additionalParams: {
        userQuery,
        personaConfig: {
          name: 'Arjun',
          primary_focus_role: 'SALES',
          system_prompt: 'Apply FIELD qualification exactly as documented.',
          web_search_enabled: false,
          knowledgeBaseIds: ['company-kb', 'sales-kb'],
        },
        conversationHistory: [],
        knowledgeBaseService,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.response).toContain(
      'FIELD means Friction, Impact, Environment, Leadership, and Decision',
    );
    expect(result.data?.response).not.toContain('Starter');
    expect(result.data?.usage.totalTokens).toBe(215);
    expect(result.data?.intent.requiresKnowledgeBase).toBe(true);
    expect(knowledgeBaseService.query).toHaveBeenCalledTimes(2);
    expect(knowledgeBaseService.query).toHaveBeenCalledWith(
      userQuery,
      'org-1',
      expect.objectContaining({
        knowledgeBaseIds: ['company-kb', 'sales-kb'],
        topK: 8,
        minScore: 0.55,
      }),
    );
    expect(
      (knowledgeBaseService.query as jest.Mock).mock.calls[1][0],
    ).toContain('exact internal framework definitions');
    expect(result.data?.sourcesUsed.knowledgeBase?.files).toEqual([
      '02_sales_qualification_and_pipeline_playbook.pdf',
      '01_asterflow_company_knowledge_base.pdf',
    ]);

    expect(llmService.generateText).toHaveBeenCalledTimes(2);
    const generationCall = (llmService.generateText as jest.Mock).mock
      .calls[0][0];
    expect(generationCall.task).toBe('analysis');
    expect(generationCall.temperature).toBe(0.15);
    expect(generationCall.systemPrompt).toContain(
      'Never expand, rename, or redefine a named framework',
    );
    expect(generationCall.systemPrompt).toContain(
      'silently audit every proper noun',
    );
    expect(generationCall.userPrompt).toContain(
      'FIELD means F — Friction, I — Impact, E — Environment, L — Leadership, D — Decision',
    );
    expect(generationCall.userPrompt).toContain(
      '01_asterflow_company_knowledge_base.pdf',
    );
    const reviewCall = (llmService.generateText as jest.Mock).mock.calls[1][0];
    expect(reviewCall.task).toBe('analysis');
    expect(reviewCall.temperature).toBe(0.05);
    expect(reviewCall.systemPrompt).toContain(
      'Preserve named frameworks exactly',
    );
    expect(reviewCall.userPrompt).toContain('Use the Starter plan');
  });

  it('does not query the KB for a simple greeting', async () => {
    const knowledgeBaseService = { query: jest.fn() };
    (queryRouter.execute as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        requiresWebSearch: false,
        requiresKnowledgeBase: false,
        queryType: 'conversational',
        confidence: 1,
        reasoning: 'Greeting',
        temporalIndicators: [],
      },
    });
    (llmService.generateText as jest.Mock).mockResolvedValue({
      content: 'Hello!',
      model: 'test-model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
    });

    const result = await agent.execute({
      organizationId: 'org-1',
      researchJobId: '',
      companyContext: 'AsterFlow organization profile',
      additionalParams: {
        userQuery: 'Hello!',
        personaConfig: {
          name: 'Arjun',
          primary_focus_role: 'SALES',
          web_search_enabled: false,
          knowledgeBaseIds: ['company-kb', 'sales-kb'],
        },
        conversationHistory: [],
        knowledgeBaseService,
      },
    });

    expect(result.success).toBe(true);
    expect(knowledgeBaseService.query).not.toHaveBeenCalled();
    expect((llmService.generateText as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ task: 'conversation', temperature: 0.4 }),
    );
  });
});
