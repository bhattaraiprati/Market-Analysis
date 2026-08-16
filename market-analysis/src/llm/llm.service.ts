import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { LlmGenerateOptions, LlmGenerateResult, LlmTask } from './llm.types';

const DEFAULT_MAX_REQUEST_TOKENS = 7200;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;

const DEFAULT_TASK_MODELS: Record<LlmTask, string[]> = {
  general: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
  routing: ['openai/gpt-oss-20b'],
  search: ['openai/gpt-oss-20b'],
  conversation: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
  analysis: [
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-20b',
  ],
  writing: [
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-20b',
  ],
};

interface GroqClientSlot {
  name: string;
  client: Groq;
  inFlight: number;
  disabled: boolean;
  cooldowns: Map<string, number>;
}

interface GroqErrorLike {
  status?: number;
  message?: string;
  headers?: Headers;
  error?: unknown;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly clients: GroqClientSlot[];
  private readonly taskModels: Record<LlmTask, string[]>;
  private readonly maxRequestTokens: number;
  private keyCursor = 0;

  constructor(private readonly configService: ConfigService) {
    const keys = [
      this.configService.get<string>('GROQ_API_KEY'),
      this.configService.get<string>('GROQ_API_KEY_2'),
    ].filter((key): key is string => Boolean(key?.trim()));

    if (keys.length === 0) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    this.clients = keys.map((apiKey, index) => ({
      name: index === 0 ? 'primary' : `secondary-${index}`,
      client: new Groq({ apiKey, maxRetries: 0 }),
      inFlight: 0,
      disabled: false,
      cooldowns: new Map<string, number>(),
    }));
    this.taskModels = this.buildTaskModels();
    this.maxRequestTokens = this.getPositiveInteger(
      'GROQ_MAX_REQUEST_TOKENS',
      DEFAULT_MAX_REQUEST_TOKENS,
    );

    this.logger.log(
      `Groq LLM pool initialized with ${this.clients.length} API key(s) and task-aware model routing`,
    );
  }

  get model(): string {
    return this.taskModels.general[0];
  }

  modelFor(task: LlmTask): string {
    return this.taskModels[task][0];
  }

  async generateText(options: LlmGenerateOptions): Promise<LlmGenerateResult> {
    const models = options.model
      ? [options.model]
      : this.taskModels[options.task ?? 'general'];
    const attempted = new Set<string>();
    const errors: string[] = [];

    while (attempted.size < models.length * this.clients.length) {
      const candidate = this.selectCandidate(models, attempted);

      if (!candidate) {
        const waitMs = this.getEarliestCooldown(models, attempted);
        if (waitMs === null) break;

        this.logger.warn(
          `All eligible Groq model/key combinations are rate limited; waiting ${Math.ceil(waitMs / 1000)} seconds for the earliest one`,
        );
        await this.sleep(waitMs);
        continue;
      }

      const { slot, model } = candidate;
      const attemptId = `${slot.name}:${model}`;
      attempted.add(attemptId);
      slot.inFlight += 1;

      try {
        const result = await this.invokeGroq(slot.client, model, options);
        this.keyCursor = (this.clients.indexOf(slot) + 1) % this.clients.length;
        return result;
      } catch (error) {
        const groqError = error as GroqErrorLike;
        errors.push(`${attemptId}: ${groqError.message ?? 'unknown error'}`);

        if (groqError.status === 401 || groqError.status === 403) {
          slot.disabled = true;
          this.logger.error(
            `Groq ${slot.name} API key was rejected; trying another configured key`,
          );
          continue;
        }

        if (this.isUnexpectedToolCall(groqError)) {
          this.logger.warn(
            `Groq ${slot.name}/${model} attempted an unavailable tool; trying another key or model`,
          );
          continue;
        }

        if (this.isEmptyResponse(groqError)) {
          this.logger.warn(
            `Groq ${slot.name}/${model} returned no text; trying another key or model`,
          );
          continue;
        }

        if (this.isRetryable(groqError.status)) {
          const cooldownMs = this.getCooldownMs(groqError.headers);
          slot.cooldowns.set(model, Date.now() + cooldownMs);
          this.logger.warn(
            `Groq ${slot.name}/${model} is unavailable for about ${Math.ceil(cooldownMs / 1000)} seconds; failing over`,
          );
          continue;
        }

        throw error;
      } finally {
        slot.inFlight -= 1;
      }
    }

    throw new Error(
      `All configured Groq keys and models failed. ${errors.join(' | ')}`,
    );
  }

  private async invokeGroq(
    client: Groq,
    model: string,
    options: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    const toolPolicy = `TOOL POLICY:
- You have no callable tools in this request.
- External retrieval, including web search, has already been completed by the application when relevant.
- Never emit a tool call, function call, browser.search request, or tool-call JSON.
- Return the requested answer directly as plain assistant text.`;
    const systemPrompt = `${toolPolicy}\n\n${options.systemPrompt}`;
    const estimatedInputTokens = this.estimateTokens(
      `${systemPrompt}\n${options.userPrompt}`,
    );
    const availableCompletionTokens =
      this.maxRequestTokens - estimatedInputTokens;

    if (availableCompletionTokens < 256) {
      throw new Error(
        `LLM prompt is too large: approximately ${estimatedInputTokens} input tokens for a ${this.maxRequestTokens}-token request budget`,
      );
    }

    const requestedMaxTokens = options.maxTokens ?? 4000;
    const maxTokens = Math.min(requestedMaxTokens, availableCompletionTokens);

    if (maxTokens < requestedMaxTokens) {
      this.logger.warn(
        `Reduced max completion tokens from ${requestedMaxTokens} to ${maxTokens} to stay within the Groq request limit`,
      );
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      tool_choice: 'none',
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.5,
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content;

    if (!content) {
      this.logger.warn(
        `Empty Groq completion: model=${completion.model || model}, finishReason=${choice?.finish_reason || 'unknown'}, promptTokens=${completion.usage?.prompt_tokens ?? 0}, completionTokens=${completion.usage?.completion_tokens ?? 0}`,
      );
      throw new Error(`Groq returned an empty response from model ${model}`);
    }

    return {
      content,
      model: completion.model || model,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
    };
  }

  private isEmptyResponse(error: GroqErrorLike): boolean {
    return Boolean(error.message?.includes('Groq returned an empty response'));
  }

  private selectCandidate(
    models: string[],
    attempted: Set<string>,
  ): { slot: GroqClientSlot; model: string } | null {
    const now = Date.now();
    const orderedClients = this.clients
      .map(
        (_, offset) =>
          this.clients[(this.keyCursor + offset) % this.clients.length],
      )
      .filter((slot) => !slot.disabled)
      .sort((left, right) => left.inFlight - right.inFlight);

    for (const model of models) {
      for (const slot of orderedClients) {
        const attemptId = `${slot.name}:${model}`;
        if (attempted.has(attemptId)) continue;
        if ((slot.cooldowns.get(model) ?? 0) > now) continue;
        return { slot, model };
      }
    }

    return null;
  }

  private getEarliestCooldown(
    models: string[],
    attempted: Set<string>,
  ): number | null {
    const now = Date.now();
    let earliest = Number.POSITIVE_INFINITY;

    for (const model of models) {
      for (const slot of this.clients) {
        if (slot.disabled || attempted.has(`${slot.name}:${model}`)) continue;
        const cooldownUntil = slot.cooldowns.get(model) ?? 0;
        if (cooldownUntil > now) earliest = Math.min(earliest, cooldownUntil);
      }
    }

    return Number.isFinite(earliest) ? Math.max(50, earliest - now + 50) : null;
  }

  private buildTaskModels(): Record<LlmTask, string[]> {
    const legacyDefault = this.configService.get<string>('GROQ_MODEL');
    const result = {} as Record<LlmTask, string[]>;

    for (const task of Object.keys(DEFAULT_TASK_MODELS) as LlmTask[]) {
      const envKey = `GROQ_MODELS_${task.toUpperCase()}`;
      const configured = this.configService
        .get<string>(envKey)
        ?.split(',')
        .map((model) => model.trim())
        .filter(Boolean);
      const defaults = [...DEFAULT_TASK_MODELS[task]];

      if (task === 'general' && legacyDefault?.trim()) {
        defaults.unshift(legacyDefault.trim());
      }

      result[task] = [...new Set(configured?.length ? configured : defaults)];
    }

    return result;
  }

  private isRetryable(status?: number): boolean {
    return (
      status === 404 ||
      status === 413 ||
      status === 429 ||
      Boolean(status && status >= 500)
    );
  }

  private isUnexpectedToolCall(error: GroqErrorLike): boolean {
    let errorBody = '';
    try {
      errorBody = JSON.stringify(error.error ?? '');
    } catch {
      errorBody = '';
    }

    const details = `${error.message ?? ''} ${errorBody}`.toLowerCase();
    return (
      error.status === 400 &&
      (details.includes('tool_use_failed') ||
        details.includes('tool choice is none') ||
        details.includes('browser.search'))
    );
  }

  private getCooldownMs(headers?: Headers): number {
    const retryAfterMs = Number(headers?.get('retry-after-ms'));
    if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return retryAfterMs;

    const retryAfterSeconds = Number(headers?.get('retry-after'));
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    const reset = headers?.get('x-ratelimit-reset-tokens');
    return this.parseDuration(reset) ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS;
  }

  private parseDuration(value?: string | null): number | null {
    if (!value) return null;
    const matches = [...value.matchAll(/([\d.]+)\s*(ms|s|m|h)/gi)];
    if (matches.length === 0) return null;

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
    };

    return matches.reduce(
      (total, match) =>
        total + Number(match[1]) * multipliers[match[2].toLowerCase()],
      0,
    );
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  private getPositiveInteger(key: string, fallback: number): number {
    const configured = Number(this.configService.get<string>(key));
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
