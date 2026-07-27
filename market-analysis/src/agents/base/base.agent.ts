/**
 * Base Agent abstract class
 * All agents (Searcher, Analyst, Writer) inherit from this
 */

import { Logger } from '@nestjs/common';
import { AgentContext, AgentResult } from './agent.types';

export abstract class BaseAgent<T = any> {
  protected readonly logger: Logger;

  constructor(protected readonly name: string) {
    this.logger = new Logger(name);
  }

  /**
   * Execute the agent's main task
   */
  abstract execute(context: AgentContext): Promise<AgentResult<T>>;

  /**
   * Log agent execution
   */
  protected logStart(message: string): void {
    this.logger.log(`🤖 [${this.name}] ${message}`);
  }

  /**
   * Log agent success
   */
  protected logSuccess(message: string, data?: any): void {
    this.logger.log(`✅ [${this.name}] ${message}`, data ? JSON.stringify(data) : '');
  }

  /**
   * Log agent error
   */
  protected logError(message: string, error?: any): void {
    this.logger.error(`❌ [${this.name}] ${message}`, error?.stack || error);
  }

  /**
   * Create success result
   */
  protected createSuccessResult<D>(
    data: D,
    metadata?: Record<string, any>,
  ): AgentResult<D> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: string | Error| unknown): AgentResult<T> {
    return {
      success: false,
      error: error instanceof Error ? error.message : error as string,
    };
  }

  /**
   * Measure execution time
   */
  protected async measureExecution<R>(
    fn: () => Promise<R>,
  ): Promise<{ result: R; executionTimeMs: number }> {
    const start = Date.now();
    const result = await fn();
    const executionTimeMs = Date.now() - start;
    return { result, executionTimeMs };
  }
}
