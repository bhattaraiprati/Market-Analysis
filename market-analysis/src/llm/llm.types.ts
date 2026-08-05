export type LlmTask =
  'general' | 'routing' | 'search' | 'conversation' | 'analysis' | 'writing';

export interface LlmGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  task?: LlmTask;
}

export interface LlmGenerateResult {
  content: string;
  model: string;
  finishReason?: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
