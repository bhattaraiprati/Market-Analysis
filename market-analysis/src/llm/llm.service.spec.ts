import { ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';

describe('LlmService', () => {
  it('caps completion tokens to the configured Groq request budget', async () => {
    const configValues: Record<string, string> = {
      GROQ_API_KEY: 'test-key',
      GROQ_MODEL: 'test-model',
      GROQ_MAX_REQUEST_TOKENS: '7200',
    };
    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    const createCompletion = jest.fn().mockResolvedValue({
      model: 'test-model',
      choices: [
        {
          message: { content: 'completed response' },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 2,
        completion_tokens: 3,
        total_tokens: 5,
      },
    });
    const service = new LlmService(configService);

    Object.assign(service as unknown as Record<string, unknown>, {
      clients: [
        {
          name: 'primary',
          client: { chat: { completions: { create: createCompletion } } },
          inFlight: 0,
          disabled: false,
          cooldowns: new Map(),
        },
      ],
    });

    const result = await service.generateText({
      systemPrompt: 'system',
      userPrompt: 'user',
      maxTokens: 8000,
    });

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        max_tokens: 7196,
      }),
    );
    expect(result).toEqual({
      content: 'completed response',
      model: 'test-model',
      finishReason: 'stop',
      usage: {
        promptTokens: 2,
        completionTokens: 3,
        totalTokens: 5,
      },
    });
  });
});
