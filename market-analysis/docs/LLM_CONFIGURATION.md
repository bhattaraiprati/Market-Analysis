# Central LLM Configuration

All agents invoke Groq through `LlmService` in `src/llm`. The service chooses a model by task and distributes traffic across both configured Groq accounts.

## API keys

```env
GROQ_API_KEY=your-primary-key
GROQ_API_KEY_2=your-secondary-key
GROQ_MAX_REQUEST_TOKENS=7200
```

The second key is optional. When present, concurrent requests are balanced across the two keys. On a 413/429 or server error, the service immediately tries another key and then the task's fallback models. It waits only when every eligible key/model combination is cooling down. Groq SDK retries are disabled because retry and failover are managed by the pool.

`GROQ_MAX_REQUEST_TOKENS` is a per-request safety budget for input plus maximum completion tokens. It is not a TPM throttle.

## Task routing

| Agent workload | Preferred model | Why |
|---|---|---|
| Query routing | `openai/gpt-oss-20b` | Fast structured classification; 120B is unnecessary |
| Search planning | `openai/gpt-oss-20b` | Fast JSON/query generation |
| Conversation | `openai/gpt-oss-20b` | Low-latency general responses |
| Analysis | `openai/gpt-oss-120b` | Stronger reasoning for strategy and synthesis |
| Writing | `openai/gpt-oss-120b` | Higher-quality synthesis and long-form prose |

Every route can be changed without editing agent files:

```env
GROQ_MODELS_ROUTING=openai/gpt-oss-20b,llama-3.1-8b-instant
GROQ_MODELS_SEARCH=openai/gpt-oss-20b,llama-3.1-8b-instant
GROQ_MODELS_CONVERSATION=openai/gpt-oss-20b,llama-3.1-8b-instant,openai/gpt-oss-120b
GROQ_MODELS_ANALYSIS=openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b
GROQ_MODELS_WRITING=openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b
```

Models are attempted from left to right. `GROQ_MODEL` remains supported only as a legacy override for calls that use the `general` task.

> Groq has scheduled `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` for shutdown on August 16, 2026. They are temporary overflow fallbacks here, not preferred production models. Remove them from the task lists by that date; the recommended replacements are already the preferred GPT-OSS models.

## Using the service

```typescript
const result = await this.llmService.generateText({
  task: 'analysis',
  systemPrompt: 'You are a market analyst.',
  userPrompt: 'Analyze the supplied competitor data.',
  maxTokens: 3000,
  temperature: 0.4,
});

return result.content;
```

The result contains the actual model selected after any failover, finish reason, and token usage.

## Switching providers

To switch providers, replace the provider implementation inside `src/llm/llm.service.ts` while preserving the `generateText` contract. Agent prompt code does not need to change.
