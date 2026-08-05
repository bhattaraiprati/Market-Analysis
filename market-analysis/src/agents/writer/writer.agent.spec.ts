import { LlmService } from '../../llm/llm.service';
import { WriterAgent } from './writer.agent';

describe('WriterAgent', () => {
  const llmService = {
    model: 'test-model',
    generateText: jest.fn(),
  } as unknown as LlmService;

  const agent = new WriterAgent(llmService);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is created with the shared LLM service', () => {
    expect(agent).toBeDefined();
  });

  it('returns an error when no analyst result is provided', async () => {
    const result = await agent.execute({
      organizationId: 'test-org',
      researchJobId: 'test-job',
      companyContext: 'Test context',
      additionalParams: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No analyst result provided');
    expect(llmService.generateText).not.toHaveBeenCalled();
  });
});
