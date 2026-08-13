import { PersonaService } from './persona.service';
import { PersonaRole } from '../models/persona.model';

describe('PersonaService recommendations', () => {
  const personaModel = { findOne: jest.fn() };
  const personaKnowledgeBaseModel = {};
  const personaPermissionModel = {};
  const knowledgeBaseModel = {};
  const conversationModel = { findAll: jest.fn() };
  const messageModel = { findAll: jest.fn() };
  const llmService = { generateText: jest.fn() };
  let service: PersonaService;

  const persona = {
    id: 'persona-1',
    name: 'Product Copilot',
    description: 'Helps product teams prioritize customer problems.',
    primary_focus_role: PersonaRole.PRODUCT,
    web_search_enabled: true,
    knowledgeBases: [
      {
        name: 'Customer Research',
        description: 'Interview findings and product feedback',
        category: 'research',
        tags: ['customers'],
        type: 'file_upload',
        files: [{ original_filename: 'interviews.pdf', file_type: 'pdf' }],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PersonaService(
      personaModel as any,
      personaKnowledgeBaseModel as any,
      personaPermissionModel as any,
      knowledgeBaseModel as any,
      conversationModel as any,
      messageModel as any,
      llmService as any,
    );
    personaModel.findOne.mockResolvedValue(persona);
    conversationModel.findAll.mockResolvedValue([]);
  });

  it('returns exactly four validated prompts in stable icon order', async () => {
    llmService.generateText.mockResolvedValue({
      content: JSON.stringify([
        {
          icon: 'history_edu',
          title: 'Draft a product brief',
          prompt:
            'Draft a product brief grounded in recurring customer interview themes.',
        },
        {
          icon: 'group_add',
          title: 'Find unmet needs',
          prompt:
            'Identify unmet customer needs and rank the best validation opportunities.',
        },
        {
          icon: 'architecture',
          title: 'Plan validation',
          prompt:
            'Create a validation plan for our highest-priority product assumption.',
        },
        {
          icon: 'query_stats',
          title: 'Review feedback',
          prompt:
            'Analyze customer feedback and summarize the strongest recurring problems.',
        },
      ]),
    });

    const result = await service.getRecommendedPrompts(
      'persona-1',
      'user-1',
      'org-1',
    );

    expect(result).toHaveLength(4);
    expect(result.map((item) => item.icon)).toEqual([
      'query_stats',
      'architecture',
      'group_add',
      'history_edu',
    ]);
    expect(llmService.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'conversation', maxTokens: 900 }),
    );
  });

  it('uses persona-specific defaults when generation fails', async () => {
    llmService.generateText.mockRejectedValue(
      new Error('provider unavailable'),
    );

    const result = await service.getRecommendedPrompts(
      'persona-1',
      'user-1',
      'org-1',
    );

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(
      expect.objectContaining({
        icon: 'query_stats',
        title: 'Review priorities',
      }),
    );
    expect(result[0].prompt).not.toContain('Customer Research');
  });

  it('retries invalid model output and returns the corrected LLM prompts', async () => {
    llmService.generateText
      .mockResolvedValueOnce({ content: 'I suggest these prompts...' })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          prompts: [
            {
              title: 'Analyze feedback',
              prompt:
                'Analyze recurring customer feedback themes and prioritize the most important product problems.',
            },
            {
              title: 'Plan discovery',
              prompt:
                'Create a focused discovery plan for validating our highest-risk product assumption.',
            },
            {
              title: 'Find opportunities',
              prompt:
                'Identify unmet customer needs and rank opportunities by evidence, impact, and effort.',
            },
            {
              title: 'Draft a brief',
              prompt:
                'Draft a concise product brief grounded in the strongest available customer insights.',
            },
          ],
        }),
      });

    const result = await service.getRecommendedPrompts(
      'persona-1',
      'user-1',
      'org-1',
    );

    expect(llmService.generateText).toHaveBeenCalledTimes(2);
    expect(result[0].title).toBe('Analyze feedback');
    expect(result[0].prompt).toContain('customer feedback themes');
  });

  it('uses the current user history from this persona as recommendation context', async () => {
    conversationModel.findAll.mockResolvedValue([{ id: 'conversation-1' }]);
    messageModel.findAll.mockResolvedValue([
      {
        content: 'Help me understand churn themes in customer interviews.',
        created_at: new Date(),
      },
    ]);
    llmService.generateText.mockResolvedValue({ content: 'invalid response' });

    await service.getRecommendedPrompts('persona-1', 'user-1', 'org-1');

    expect(messageModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversation_id: ['conversation-1'],
          role: 'user',
        }),
        limit: 16,
      }),
    );
    expect(llmService.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining('churn themes'),
      }),
    );
  });
});
