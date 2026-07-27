/**
 * Base types for all agents
 */

export interface AgentContext {
  organizationId: string;
  researchJobId: string;
  companyContext: string;
  userId?: string;
  additionalParams?: Record<string, any>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

export interface ScrapedSource {
  url: string;
  title: string;
  content: string;
  sourceType: SourceType;
  metadata?: Record<string, any>;
  scrapedAt: Date;
}

export enum SourceType {
  WEBSITE = 'WEBSITE',
  SOCIAL = 'SOCIAL',
  NEWS = 'NEWS',
  REVIEW = 'REVIEW',
  VIDEO = 'VIDEO',
  COMPETITOR = 'COMPETITOR',
}

export interface SearchQuery {
  query: string;
  type: 'competitor' | 'market' | 'customer' | 'news';
  priority: 'high' | 'medium' | 'low';
  region?: string;
}

export interface CompetitorInfo {
  name: string;
  website?: string;
  location?: string;
  description?: string;
  priority: 'domestic' | 'international';
}
