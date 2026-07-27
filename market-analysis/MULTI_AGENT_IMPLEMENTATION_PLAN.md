# Multi-Agent Strategic Growth Intelligence Platform - Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for building an AI-powered Strategic Growth Intelligence Platform using a **multi-agent architecture** inspired by CrewAI/LangGraph patterns. The system uses specialized agents (Searcher, Analyst, Writer) to automate market research and generate evidence-backed strategic recommendations.

**Key Decision**: Based on your current setup and requirements, the **OrganizationMember model should be SIMPLIFIED** for MVP. We'll focus on single-user-per-organization initially, then scale later.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack Decisions](#technology-stack-decisions)
3. [Database Schema Refactoring](#database-schema-refactoring)
4. [Multi-Agent System Design](#multi-agent-system-design)
5. [Web Scraping Strategy](#web-scraping-strategy)
6. [LLM Integration Strategy](#llm-integration-strategy)
7. [Implementation Phases](#implementation-phases)
8. [File Structure](#file-structure)
9. [API Design](#api-design)
10. [Testing Strategy](#testing-strategy)
11. [Cost Optimization](#cost-optimization)

---

## 1. Architecture Overview

### System Flow

```
User Input (Company Context)
    ↓
Company Knowledge Vectorization (Qdrant)
    ↓
┌─────────────── Multi-Agent Orchestrator ───────────────┐
│                                                         │
│  Agent A: Searcher                                     │
│  ├─ Web scraping (Apify/Firecrawl)                    │
│  ├─ Competitor identification                          │
│  ├─ Market trend detection                             │
│  └─ Customer discussion mining                         │
│                                                         │
│  Agent B: Analyst                                      │
│  ├─ Gap analysis                                       │
│  ├─ Opportunity scoring                                │
│  ├─ Strategic pattern recognition                      │
│  └─ Evidence validation                                │
│                                                         │
│  Agent C: Writer                                       │
│  ├─ Recommendation synthesis                           │
│  ├─ Source citation management                         │
│  ├─ Professional report formatting                     │
│  └─ Executive summary generation                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
    ↓
Human Verification Layer
    ↓
PDF Report Generation
```

### Core Principles

1. **Context-First Research**: Every recommendation must be grounded in company context
2. **Evidence-Based**: No generic advice - everything backed by sources
3. **Traceable**: Full citation trail from source to recommendation
4. **Human-in-the-Loop**: Approval workflow before final output
5. **Single User Focus (MVP)**: One decision-maker per organization initially

---

## 2. Technology Stack Decisions

### Current Stack (Keep)
- ✅ **Backend**: NestJS + TypeScript
- ✅ **Database**: PostgreSQL + Sequelize
- ✅ **Auth**: JWT + Passport

### New Additions

#### A. Multi-Agent Framework
**Recommendation for Learning: MANUAL orchestration first**

**Why Manual First:**
- ✅ Understand agent flow deeply
- ✅ Full control over execution
- ✅ Easier debugging when learning
- ✅ No framework abstraction hiding complexity
- ✅ Can add LangGraph/CrewAI later when patterns are clear

**For MVP: Build custom orchestrator service**

```bash
# NO framework dependencies initially - just LLM SDKs
npm install @anthropic-ai/sdk @google/generative-ai groq-sdk
```

**Later (when patterns stabilize):** Add LangGraph for complex workflows

#### B. Web Scraping Solution
**Recommendation: Firecrawl (Primary) + Apify (Fallback)**

**Why Firecrawl over Apify MCP:**
- ✅ Purpose-built for LLM data extraction
- ✅ Returns clean markdown (better for AI processing)
- ✅ Handles JavaScript rendering automatically
- ✅ Built-in rate limiting and proxy rotation
- ✅ Better pricing for LLM use cases ($0.50/1000 pages vs Apify's compute-based pricing)

**When to use Apify:**
- Social media scraping (Reddit, Twitter, YouTube comments)
- Large-scale crawling (1000+ pages)
- Platform-specific extractors (LinkedIn, Product Hunt)

**Implementation:**
```bash
npm install @mendable/firecrawl-js apify-client
```

#### C. Vector Database (Optional for MVP)

**Recommendation: Pinecone with Namespaces**

**IMPORTANT DECISION FOR MVP:**
- ⚠️ **You can START without vector database** - store everything in PostgreSQL
- ✅ Add Pinecone later when you need semantic similarity search
- ✅ Use Pinecone NAMESPACES for perfect organization isolation

**Why Pinecone:**
- ✅ Managed service (no infrastructure)
- ✅ Namespace-based isolation (perfect for multi-tenant)
- ✅ Free tier: 1 index, 100K vectors
- ✅ Serverless (pay-per-use)

**When you DO need vector DB:**
- Finding similar companies/competitors
- "Show me how similar organizations solved this"
- Semantic search in historical research
- Cross-research pattern matching

```bash
npm install @pinecone-database/pinecone
```

**Organization Isolation Strategy:**
```typescript
// Each org gets isolated namespace - NO data leakage possible
const namespace = `org-${organizationId}`;
await index.namespace(namespace).upsert(vectors);
await index.namespace(namespace).query(queryVector); // Only this org's data
```

**MVP Approach: Skip vector DB initially, use PostgreSQL full-text search instead**

#### D. LLM Strategy

| Use Case | Model | Why |
|----------|-------|-----|
| **Agent Orchestrator** | Claude 3.5 Sonnet | Best reasoning, tool use, long context (200K) |
| **Searcher Agent** | Groq Llama 3.1 70B | Fast, free tier, good for extraction |
| **Analyst Agent** | Gemini 1.5 Pro | Free tier, strong analysis, large context |
| **Writer Agent** | Claude 3.5 Sonnet | Best writing quality, citation handling |
| **Embedding** | Voyage AI (or OpenAI) | Best retrieval performance |

**Cost-Optimized Alternative:**
- Use **Groq Llama 3.1 70B** for all agents (free tier)
- Use **Claude 3.5 Haiku** for final report generation only

#### E. Additional Tools

```bash
npm install:
- puppeteer                    # Browser automation (fallback scraping)
- cheerio                      # HTML parsing
- pdf-lib                      # PDF generation
- bullmq                       # Job queue for async research
- ioredis                      # Redis for queue + caching
- pino                         # Structured logging

# SKIP for MVP (add later only if needed):
# - @xenova/transformers       # Local embeddings
# - @pinecone-database/pinecone # Vector database
```

---

## 3. Database Schema Refactoring

### Current Issues

1. **OrganizationMember is over-engineered for MVP**
   - You're building for a single decision-maker (CEO/CTO/Manager)
   - The join table adds unnecessary complexity
   - No immediate need for team collaboration

### Recommended Schema Changes

#### Option 1: Simplify (RECOMMENDED for MVP)

**Remove OrganizationMember entirely**, add `owner_id` directly to Organization:

```typescript
// organizations table
{
  id: UUID (PK)
  owner_id: UUID (FK -> users.id)  // Single owner
  name: string
  description: text
  industry: string
  website: string
  product_or_service: text
  target_customers: text
  business_goals: text
  current_challenges: text
  known_competitors: string[]
  company_size: string
  location: string
  status: enum (PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED)
  rejection_reason: text
  created_at: timestamp
  updated_at: timestamp
}

// users table (simplified)
{
  id: UUID (PK)
  name: string
  email: string (unique)
  password: string (hashed)
  profile_picture: string
  role: enum (USER, ADMIN, SUPER_ADMIN)  // Remove OWNER
  is_verified: boolean
  status: enum (ACTIVE, INACTIVE, SUSPENDED)
  created_at: timestamp
  updated_at: timestamp
}
```

**Benefits:**
- ✅ Simpler queries (no joins)
- ✅ Faster development
- ✅ Easier to understand
- ✅ Can add multi-user later without data loss

**Migration Strategy:**
```sql
-- Migrate existing data
UPDATE organizations 
SET owner_id = (
  SELECT user_id 
  FROM organization_members 
  WHERE organization_id = organizations.id 
    AND role = 'OWNER' 
  LIMIT 1
);

-- Drop the join table
DROP TABLE organization_members;

-- Add foreign key
ALTER TABLE organizations 
ADD CONSTRAINT fk_owner 
FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
```

#### Option 2: Keep OrganizationMember (Future-Proof)

If you want to support teams eventually, keep it but simplify the flow:
- Auto-create OWNER membership when organization is created
- Ignore other roles for MVP
- Add team features in Phase 3

### New Tables for Multi-Agent System

```typescript
// research_jobs table
{
  id: UUID (PK)
  organization_id: UUID (FK)
  status: enum (PENDING, IN_PROGRESS, COMPLETED, FAILED)
  research_type: enum (COMPETITOR, MARKET, CUSTOMER, COMPREHENSIVE)
  input_parameters: jsonb
  agent_orchestration_state: jsonb  // LangGraph state
  created_at: timestamp
  completed_at: timestamp
  error_message: text
}

// research_sources table
{
  id: UUID (PK)
  research_job_id: UUID (FK)
  source_type: enum (WEBSITE, SOCIAL, NEWS, REVIEW, VIDEO)
  url: string
  title: string
  content: text
  scraped_at: timestamp
  credibility_score: float
  metadata: jsonb  // author, date, platform, etc.
}

// strategic_recommendations table
{
  id: UUID (PK)
  research_job_id: UUID (FK)
  category: enum (PRODUCT, MARKETING, COMPETITIVE, GROWTH, RISK)
  priority: enum (HIGH, MEDIUM, LOW)
  recommendation_text: text
  reasoning: text
  evidence_source_ids: UUID[]  // Array of research_sources.id
  confidence_score: float
  verification_status: enum (PENDING, APPROVED, REJECTED, REVISED)
  verified_by: UUID (FK -> users.id)
  verified_at: timestamp
  verification_notes: text
}

// company_knowledge_vectors table (OPTIONAL - only if using Pinecone)
// For MVP: Skip this table, store context directly in organizations table
{
  id: UUID (PK)
  organization_id: UUID (FK)
  content_type: enum (PRODUCT, CUSTOMER, GOAL, CHALLENGE, COMPETITOR)
  content: text
  pinecone_vector_id: string  // Reference to Pinecone vector ID
  metadata: jsonb
  created_at: timestamp
}

// NOTE: For MVP, you don't need this table at all!
// Just use: SELECT * FROM organizations WHERE id = $1

// agent_execution_logs table (debugging/observability)
{
  id: UUID (PK)
  research_job_id: UUID (FK)
  agent_name: string
  action: string
  input: jsonb
  output: jsonb
  execution_time_ms: integer
  tokens_used: integer
  cost_usd: float
  created_at: timestamp
}

// generated_reports table
{
  id: UUID (PK)
  research_job_id: UUID (FK)
  format: enum (PDF, MARKDOWN, HTML)
  file_url: string  // S3/local path
  metadata: jsonb
  generated_at: timestamp
}
```

---

## 4. Multi-Agent System Design

### Agent Architecture

```typescript
// src/agents/types/agent.types.ts

export interface AgentContext {
  organizationId: string;
  companyKnowledge: CompanyKnowledgeVector[];
  researchJobId: string;
  memory: any;  // Shared state between agents
}

export interface AgentResult<T> {
  success: boolean;
  data: T;
  sources: ResearchSource[];
  tokensUsed: number;
  executionTimeMs: number;
  error?: string;
}

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract llmModel: LLMConfig;
  
  abstract execute(context: AgentContext): Promise<AgentResult<any>>;
  
  protected async queryCompanyKnowledge(
    query: string, 
    context: AgentContext
  ): Promise<CompanyKnowledgeVector[]> {
    // Query Qdrant for relevant company context
  }
  
  protected async logExecution(
    jobId: string,
    action: string,
    input: any,
    output: any,
    metrics: ExecutionMetrics
  ): Promise<void> {
    // Log to agent_execution_logs table
  }
}
```

### Agent A: Searcher Agent

**Responsibility**: Find and scrape relevant information

```typescript
// src/agents/searcher/searcher.agent.ts

export class SearcherAgent extends BaseAgent {
  name = 'Searcher';
  description = 'Finds and scrapes relevant market data';
  llmModel = { provider: 'groq', model: 'llama-3.1-70b' };
  
  async execute(context: AgentContext): Promise<AgentResult<SearchResults>> {
    // 1. Query company knowledge for context
    const companyContext = await this.queryCompanyKnowledge(
      'company products, competitors, target market',
      context
    );
    
    // 2. Generate search queries using LLM
    const searchQueries = await this.generateSearchQueries(companyContext);
    
    // 3. Execute searches in parallel
    const searchResults = await Promise.all([
      this.searchCompetitors(searchQueries.competitors),
      this.searchMarketTrends(searchQueries.trends),
      this.searchCustomerDiscussions(searchQueries.customers),
      this.searchIndustryNews(searchQueries.news),
    ]);
    
    // 4. Scrape content from top results
    const scrapedData = await this.scrapeContent(searchResults);
    
    // 5. Store sources in database
    await this.storeSources(context.researchJobId, scrapedData);
    
    return {
      success: true,
      data: { sources: scrapedData },
      sources: scrapedData,
      tokensUsed: this.tokenCounter.total,
      executionTimeMs: Date.now() - startTime,
    };
  }
  
  private async generateSearchQueries(
    companyContext: string
  ): Promise<SearchQueries> {
    const prompt = `
Given this company context:
${companyContext}

Generate 5 specific search queries for each category:
1. Competitor Analysis (company websites, product pages, pricing)
2. Market Trends (industry reports, trend articles, forecasts)
3. Customer Discussions (Reddit, forums, review sites, social media)
4. Industry News (recent developments, launches, acquisitions)

Return as JSON with structured queries.
    `;
    
    return await this.llm.generateStructured(prompt, SearchQueriesSchema);
  }
  
  private async scrapeContent(urls: string[]): Promise<ResearchSource[]> {
    const results: ResearchSource[] = [];
    
    for (const url of urls) {
      try {
        // Try Firecrawl first (better for LLM consumption)
        const content = await this.firecrawlClient.scrape(url, {
          formats: ['markdown'],
          onlyMainContent: true,
        });
        
        results.push({
          url,
          title: content.title,
          content: content.markdown,
          sourceType: this.detectSourceType(url),
          scrapedAt: new Date(),
          metadata: content.metadata,
        });
      } catch (error) {
        // Fallback to Apify
        console.warn(`Firecrawl failed for ${url}, trying Apify...`);
        results.push(await this.apifyScrape(url));
      }
    }
    
    return results;
  }
  
  private detectSourceType(url: string): SourceType {
    if (url.includes('reddit.com')) return 'SOCIAL';
    if (url.includes('youtube.com')) return 'VIDEO';
    if (url.includes('news')) return 'NEWS';
    if (url.includes('review')) return 'REVIEW';
    return 'WEBSITE';
  }
}
```

### Agent B: Analyst Agent

**Responsibility**: Analyze data and identify opportunities

```typescript
// src/agents/analyst/analyst.agent.ts

export class AnalystAgent extends BaseAgent {
  name = 'Analyst';
  description = 'Analyzes market data and identifies strategic opportunities';
  llmModel = { provider: 'google', model: 'gemini-1.5-pro' };
  
  async execute(context: AgentContext): Promise<AgentResult<AnalysisResults>> {
    // 1. Retrieve scraped sources
    const sources = await this.getSources(context.researchJobId);
    
    // 2. Retrieve company context
    const companyContext = await this.queryCompanyKnowledge('*', context);
    
    // 3. Perform multi-dimensional analysis
    const analyses = await Promise.all([
      this.analyzeCompetitors(sources, companyContext),
      this.analyzeMarketGaps(sources, companyContext),
      this.analyzeCustomerNeeds(sources, companyContext),
      this.analyzeThreatOpportunities(sources, companyContext),
    ]);
    
    // 4. Score and prioritize opportunities
    const opportunities = await this.scoreOpportunities(analyses);
    
    // 5. Validate evidence strength
    const validated = await this.validateEvidence(opportunities, sources);
    
    return {
      success: true,
      data: { opportunities: validated },
      sources,
      tokensUsed: this.tokenCounter.total,
      executionTimeMs: Date.now() - startTime,
    };
  }
  
  private async analyzeCompetitors(
    sources: ResearchSource[],
    companyContext: string
  ): Promise<CompetitorAnalysis> {
    const competitorSources = sources.filter(s => 
      s.sourceType === 'WEBSITE' || s.metadata.isCompetitor
    );
    
    const prompt = `
Company Context:
${companyContext}

Competitor Data:
${competitorSources.map(s => s.content).join('\n\n---\n\n')}

Analyze:
1. What are competitors doing that we're not?
2. What features/services do they offer?
3. What are their pricing strategies?
4. What are customers saying about them?
5. Where are the gaps we can exploit?

Return structured analysis with specific evidence citations (source IDs).
    `;
    
    return await this.llm.generateStructured(
      prompt, 
      CompetitorAnalysisSchema
    );
  }
  
  private async scoreOpportunities(
    analyses: AllAnalyses
  ): Promise<ScoredOpportunity[]> {
    const prompt = `
Given these analyses:
${JSON.stringify(analyses, null, 2)}

Score each opportunity on:
1. Impact Potential (1-10)
2. Implementation Difficulty (1-10)
3. Time to Value (1-10)
4. Evidence Strength (1-10)
5. Market Demand (1-10)

Calculate priority score: 
  (Impact * MarketDemand * EvidenceStrength) / (Difficulty * TimeToValue)

Return top 10 opportunities with scores and reasoning.
    `;
    
    return await this.llm.generateStructured(
      prompt,
      ScoredOpportunitySchema
    );
  }
}
```

### Agent C: Writer Agent

**Responsibility**: Generate professional strategic reports

```typescript
// src/agents/writer/writer.agent.ts

export class WriterAgent extends BaseAgent {
  name = 'Writer';
  description = 'Synthesizes analysis into professional strategic reports';
  llmModel = { provider: 'anthropic', model: 'claude-3-5-sonnet' };
  
  async execute(context: AgentContext): Promise<AgentResult<Report>> {
    // 1. Retrieve analysis results
    const analysis = await this.getAnalysis(context.researchJobId);
    
    // 2. Retrieve company context
    const companyContext = await this.queryCompanyKnowledge('*', context);
    
    // 3. Generate report sections
    const report = {
      executiveSummary: await this.writeExecutiveSummary(analysis, companyContext),
      competitorLandscape: await this.writeCompetitorSection(analysis),
      marketOpportunities: await this.writeOpportunitiesSection(analysis),
      strategicRecommendations: await this.writeRecommendations(analysis),
      implementationRoadmap: await this.writeRoadmap(analysis),
      risksAndMitigation: await this.writeRisks(analysis),
      appendix: await this.writeAppendix(analysis),
    };
    
    // 4. Format citations
    const reportWithCitations = await this.addCitations(report, analysis.sources);
    
    // 5. Store recommendations for approval
    await this.storeRecommendations(
      context.researchJobId,
      report.strategicRecommendations
    );
    
    return {
      success: true,
      data: { report: reportWithCitations },
      sources: analysis.sources,
      tokensUsed: this.tokenCounter.total,
      executionTimeMs: Date.now() - startTime,
    };
  }
  
  private async writeRecommendations(
    analysis: AnalysisResults
  ): Promise<Recommendation[]> {
    const recommendations = [];
    
    for (const opportunity of analysis.opportunities) {
      const prompt = `
Opportunity: ${opportunity.title}
Evidence: ${opportunity.evidence}
Company Context: ${this.companyContext}

Write a strategic recommendation that:
1. Clearly states what the company should do
2. Explains WHY based on evidence (cite sources)
3. Describes expected outcomes
4. Outlines implementation steps
5. Estimates timeframe and resources

Use professional business language. Be specific, not generic.
CRITICAL: Every claim must reference a source.
      `;
      
      const recommendation = await this.llm.generate(prompt);
      
      recommendations.push({
        category: opportunity.category,
        priority: opportunity.priority,
        text: recommendation,
        evidenceSources: opportunity.sourceIds,
        confidenceScore: opportunity.score,
      });
    }
    
    return recommendations;
  }
  
  private async addCitations(
    report: Report,
    sources: ResearchSource[]
  ): Promise<Report> {
    // Convert inline source IDs to footnote references
    // E.g., [source-uuid] -> [1]
    const citationMap = new Map();
    let citationNumber = 1;
    
    for (const source of sources) {
      citationMap.set(source.id, citationNumber++);
    }
    
    const reportWithCitations = JSON.parse(JSON.stringify(report));
    
    // Replace source IDs with numbers
    const replaceSourceIds = (text: string): string => {
      return text.replace(
        /\[source-([a-f0-9-]+)\]/g,
        (match, sourceId) => `[${citationMap.get(sourceId) || '?'}]`
      );
    };
    
    // Apply to all text fields recursively
    // ... (implementation details)
    
    // Add bibliography
    reportWithCitations.appendix.sources = sources.map((s, i) => ({
      number: i + 1,
      title: s.title,
      url: s.url,
      accessedDate: s.scrapedAt,
    }));
    
    return reportWithCitations;
  }
}
```

### Agent Orchestrator (Manual - No Framework)

**Responsibility**: Coordinate agent execution with full control

```typescript
// src/agents/orchestrator/orchestrator.service.ts

import { Injectable } from '@nestjs/common';

interface OrchestrationState {
  organizationId: string;
  researchJobId: string;
  companyContext: string;  // Plain text context from PostgreSQL
  searchResults?: SearchResults;
  analysis?: AnalysisResults;
  report?: Report;
  errors: string[];
}

@Injectable()
export class AgentOrchestrator {
  constructor(
    private searcherAgent: SearcherAgent,
    private analystAgent: AnalystAgent,
    private writerAgent: WriterAgent,
    private researchJobRepo: ResearchJobRepository,
    private organizationRepo: OrganizationRepository,
  ) {}
  
  async executeResearch(
    organizationId: string,
    researchType: ResearchType
  ): Promise<string> {
    // 1. Create research job in DB
    const job = await this.researchJobRepo.create({
      organizationId,
      status: 'PENDING',
      researchType,
      inputParameters: { type: researchType },
      agentOrchestrationState: {},
    });
    
    try {
      // 2. Load company context from PostgreSQL (NO VECTOR DB NEEDED!)
      const companyContext = await this.loadCompanyContext(organizationId);
      
      // 3. Initialize orchestration state
      const state: OrchestrationState = {
        organizationId,
        researchJobId: job.id,
        companyContext,
        errors: [],
      };
      
      // 4. Update job status
      await this.updateJobStatus(job.id, 'IN_PROGRESS', {
        currentAgent: 'Searcher',
        currentStep: 'Searching and scraping sources',
      });
      
      // 5. STEP 1: Execute Searcher Agent
      console.log('🔍 Starting Searcher Agent...');
      const searchResult = await this.searcherAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext: state.companyContext,
      });
      
      if (!searchResult.success) {
        throw new Error(`Searcher failed: ${searchResult.error}`);
      }
      
      state.searchResults = searchResult.data;
      
      // Save intermediate state
      await this.saveState(job.id, state);
      
      // 6. STEP 2: Execute Analyst Agent
      console.log('📊 Starting Analyst Agent...');
      await this.updateJobStatus(job.id, 'IN_PROGRESS', {
        currentAgent: 'Analyst',
        currentStep: 'Analyzing data and identifying opportunities',
      });
      
      const analysisResult = await this.analystAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext: state.companyContext,
        searchResults: state.searchResults,
      });
      
      if (!analysisResult.success) {
        throw new Error(`Analyst failed: ${analysisResult.error}`);
      }
      
      state.analysis = analysisResult.data;
      await this.saveState(job.id, state);
      
      // 7. STEP 3: Execute Writer Agent
      console.log('✍️ Starting Writer Agent...');
      await this.updateJobStatus(job.id, 'IN_PROGRESS', {
        currentAgent: 'Writer',
        currentStep: 'Generating strategic report',
      });
      
      const writerResult = await this.writerAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext: state.companyContext,
        analysis: state.analysis,
      });
      
      if (!writerResult.success) {
        throw new Error(`Writer failed: ${writerResult.error}`);
      }
      
      state.report = writerResult.data;
      await this.saveState(job.id, state);
      
      // 8. Mark as completed
      await this.updateJobStatus(job.id, 'COMPLETED', {
        completedAt: new Date(),
      });
      
      console.log('✅ Research completed successfully!');
      return job.id;
      
    } catch (error) {
      console.error('❌ Orchestration failed:', error);
      
      await this.updateJobStatus(job.id, 'FAILED', {
        errorMessage: error.message,
        failedAt: new Date(),
      });
      
      throw error;
    }
  }
  
  /**
   * Load company context from PostgreSQL (NO VECTOR DB!)
   */
  private async loadCompanyContext(organizationId: string): Promise<string> {
    const org = await this.organizationRepo.findByPk(organizationId);
    
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }
    
    // Build plain text context - this is what agents will use
    const context = `
COMPANY PROFILE
===============
Company Name: ${org.name}
Industry: ${org.industry}
Website: ${org.website || 'Not provided'}
Location: ${org.location || 'Not provided'}
Company Size: ${org.company_size || 'Not provided'}

PRODUCT/SERVICE
===============
${org.product_or_service}

TARGET CUSTOMERS
================
${org.target_customers}

BUSINESS GOALS
==============
${org.business_goals}

CURRENT CHALLENGES
==================
${org.current_challenges || 'None specified'}

KNOWN COMPETITORS
=================
${org.known_competitors?.length ? org.known_competitors.join(', ') : 'None specified'}
    `.trim();
    
    return context;
  }
  
  /**
   * Save orchestration state to database
   */
  private async saveState(jobId: string, state: OrchestrationState): Promise<void> {
    await this.researchJobRepo.update(
      { agentOrchestrationState: state },
      { where: { id: jobId } }
    );
  }
  
  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    additionalData: any = {}
  ): Promise<void> {
    await this.researchJobRepo.update(
      { 
        status,
        ...additionalData,
      },
      { where: { id: jobId } }
    );
  }
  
  /**
   * Resume failed job (for retry)
   */
  async resumeResearch(jobId: string): Promise<string> {
    const job = await this.researchJobRepo.findByPk(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const state = job.agentOrchestrationState as OrchestrationState;
    
    // Resume from last successful step
    if (!state.searchResults) {
      console.log('⏩ Resuming from Searcher...');
      return this.executeResearch(job.organizationId, job.researchType);
    }
    
    if (!state.analysis) {
      console.log('⏩ Resuming from Analyst...');
      // Continue with Analyst...
    }
    
    // ... implement resume logic
    
    return jobId;
  }
}
```

**Key Benefits of Manual Orchestration:**
1. ✅ **Full visibility** - see exactly what's happening
2. ✅ **Easy debugging** - console.log at every step
3. ✅ **Simple error handling** - try/catch with clear messages
4. ✅ **State persistence** - save after each agent completes
5. ✅ **Resume capability** - can retry from last successful step
6. ✅ **No black box** - understand agent flow deeply

**When to Add LangGraph Later:**
- Complex branching logic (if-then-else workflows)
- Parallel agent execution
- Dynamic agent selection based on results
- Complex state management

---

## 5. Web Scraping Strategy

### Primary: Firecrawl Integration

```typescript
// src/scraping/firecrawl.service.ts

import FirecrawlApp from '@mendable/firecrawl-js';

export class FirecrawlService {
  private client: FirecrawlApp;
  
  constructor() {
    this.client = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY 
    });
  }
  
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      const result = await this.client.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 2000,  // Wait for JS rendering
      });
      
      return {
        markdown: result.markdown,
        html: result.html,
        title: result.metadata.title,
        description: result.metadata.description,
        author: result.metadata.author,
        publishedDate: result.metadata.publishedTime,
        images: result.metadata.images,
      };
    } catch (error) {
      throw new Error(`Firecrawl failed: ${error.message}`);
    }
  }
  
  async crawlWebsite(
    startUrl: string,
    maxPages: number = 10
  ): Promise<ScrapedContent[]> {
    const crawlResult = await this.client.crawlUrl(startUrl, {
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    });
    
    return crawlResult.data.map(page => ({
      url: page.metadata.sourceURL,
      markdown: page.markdown,
      title: page.metadata.title,
    }));
  }
}
```

### Fallback: Apify Integration

```typescript
// src/scraping/apify.service.ts

import { ApifyClient } from 'apify-client';

export class ApifyService {
  private client: ApifyClient;
  
  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
  }
  
  async scrapeReddit(subreddit: string, query: string): Promise<RedditPost[]> {
    const run = await this.client.actor('trudax/reddit-scraper').call({
      subreddit: subreddit,
      searchString: query,
      maxPostCount: 50,
      sort: 'relevance',
    });
    
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
    
    return items.map(item => ({
      title: item.title,
      content: item.selftext,
      author: item.author,
      score: item.score,
      url: item.url,
      comments: item.comments,
    }));
  }
  
  async scrapeYouTubeComments(videoUrl: string): Promise<YouTubeComment[]> {
    const run = await this.client.actor('bernardo/youtube-scraper').call({
      videoUrls: [videoUrl],
      maxComments: 100,
    });
    
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
    return items;
  }
  
  async scrapeLinkedInCompany(companyUrl: string): Promise<CompanyData> {
    // Use LinkedIn scraper actor
    const run = await this.client.actor('curious_coder/linkedin-company-scraper').call({
      urls: [companyUrl],
    });
    
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
    return items[0];
  }
}
```

### Scraping Strategy Decision Matrix

| Source Type | Method | Tool | Cost |
|-------------|--------|------|------|
| Competitor websites | Simple scrape | Firecrawl | Low |
| Product pages | Simple scrape | Firecrawl | Low |
| Blog articles | Simple scrape | Firecrawl | Low |
| Reddit discussions | Structured scraper | Apify | Medium |
| YouTube comments | Structured scraper | Apify | Medium |
| LinkedIn profiles | Structured scraper | Apify | High |
| Twitter/X posts | Structured scraper | Apify | Medium |
| Google News | Search API | SerpAPI | Low |
| Review sites (G2, Capterra) | Manual + scraper | Firecrawl | Medium |

---

## 6. LLM Integration Strategy

### Provider Setup

```typescript
// src/llm/llm.factory.ts

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import Groq from 'groq-sdk';

export class LLMFactory {
  static create(provider: 'anthropic' | 'google' | 'groq', model: string) {
    switch (provider) {
      case 'anthropic':
        return new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: model,
          temperature: 0.3,
        });
      
      case 'google':
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_AI_API_KEY,
          model: model,
          temperature: 0.3,
        });
      
      case 'groq':
        return new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

### Cost-Optimized Configuration

**Free Tier Limits (2026):**
- Groq: 14,400 requests/day (Llama 3.1 70B)
- Gemini: 15 RPM, 1M tokens/day (Gemini 1.5 Pro)
- Claude: Pay-per-use ($3/$15 per MTok)

**Recommended Strategy:**
1. Use Groq for all fast, high-volume tasks (search query generation, extraction)
2. Use Gemini for analysis (free 1M tokens/day)
3. Use Claude only for final report generation (best quality)

**Alternative (If you need more speed):**
- Use Claude 3.5 Haiku for everything ($0.25/$1.25 per MTok) - still cheap but faster than Groq

### Token Usage Tracking

```typescript
// src/llm/token-tracker.service.ts

export class TokenTrackerService {
  async logUsage(
    researchJobId: string,
    agentName: string,
    model: string,
    tokensUsed: number,
  ) {
    const costPerToken = this.getCostPerToken(model);
    const costUsd = (tokensUsed * costPerToken) / 1_000_000;
    
    await this.agentExecutionLogRepository.create({
      researchJobId,
      agentName,
      tokensUsed,
      costUsd,
      // ... other fields
    });
  }
  
  private getCostPerToken(model: string): number {
    const pricing = {
      'claude-3-5-sonnet': 3.0,  // Input: $3/MTok
      'claude-3-5-haiku': 0.25,
      'gemini-1.5-pro': 0.0,  // Free tier
      'llama-3.1-70b': 0.0,   // Free tier
    };
    return pricing[model] || 0;
  }
}
```

---

## 7. Implementation Phases

### Phase 0: Database Migration (Week 1)

**Deliverables:**
- ✅ Simplify organization schema (remove OrganizationMember or keep simplified)
- ✅ Add new tables (research_jobs, research_sources, etc.)
- ✅ Migration scripts
- ✅ Update models and services

**Migration Script:**
```bash
npm run migration:generate -- --name simplify-organization-schema
npm run migration:run
```

---

### Phase 1: Company Context Loading (Week 1) - NO VECTOR DB FOR MVP!

**Goal**: Load company context efficiently from PostgreSQL

**Decision: SKIP VECTOR DB for MVP!** 
- Simpler architecture
- Faster development
- No embedding costs
- Add Pinecone later only if needed

**Tasks:**
1. ~~Install Qdrant/Pinecone~~ SKIP
2. ~~Create embedding service~~ SKIP
3. Create company context loader service ✅
4. Build context formatter ✅

**Implementation (PostgreSQL-only approach):**

```typescript
// src/company-context/company-context.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class CompanyContextService {
  constructor(
    private organizationRepo: OrganizationRepository,
  ) {}
  
  /**
   * Load complete company context as formatted string
   * This is what agents will receive - NO VECTOR DB NEEDED!
   */
  async loadContext(organizationId: string): Promise<string> {
    const org = await this.organizationRepo.findByPk(organizationId);
    
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }
    
    return this.formatContext(org);
  }
  
  /**
   * Format organization data into structured context string
   */
  private formatContext(org: Organization): string {
    const sections = [];
    
    // Company Profile
    sections.push('# COMPANY PROFILE');
    sections.push(`Company Name: ${org.name}`);
    sections.push(`Industry: ${org.industry}`);
    if (org.website) sections.push(`Website: ${org.website}`);
    if (org.location) sections.push(`Location: ${org.location}`);
    if (org.company_size) sections.push(`Company Size: ${org.company_size}`);
    sections.push('');
    
    // Product/Service
    sections.push('# PRODUCT/SERVICE');
    sections.push(org.product_or_service);
    sections.push('');
    
    // Target Customers
    sections.push('# TARGET CUSTOMERS');
    sections.push(org.target_customers);
    sections.push('');
    
    // Business Goals
    sections.push('# BUSINESS GOALS');
    sections.push(org.business_goals);
    sections.push('');
    
    // Challenges
    if (org.current_challenges) {
      sections.push('# CURRENT CHALLENGES');
      sections.push(org.current_challenges);
      sections.push('');
    }
    
    // Known Competitors
    if (org.known_competitors?.length) {
      sections.push('# KNOWN COMPETITORS');
      sections.push(org.known_competitors.join(', '));
      sections.push('');
    }
    
    return sections.join('\n');
  }
  
  /**
   * Get specific context sections for targeted queries
   */
  async getContextSection(
    organizationId: string,
    section: 'product' | 'customers' | 'goals' | 'challenges' | 'competitors'
  ): Promise<string> {
    const org = await this.organizationRepo.findByPk(organizationId);
    
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }
    
    switch (section) {
      case 'product':
        return org.product_or_service;
      case 'customers':
        return org.target_customers;
      case 'goals':
        return org.business_goals;
      case 'challenges':
        return org.current_challenges || '';
      case 'competitors':
        return org.known_competitors?.join(', ') || '';
      default:
        throw new Error(`Unknown section: ${section}`);
    }
  }
  
  /**
   * Build context with additional research history (for follow-up research)
   */
  async loadContextWithHistory(
    organizationId: string,
    includeLastNJobs: number = 3
  ): Promise<string> {
    const baseContext = await this.loadContext(organizationId);
    
    // Get previous research insights
    const previousJobs = await this.researchJobRepo.findAll({
      where: {
        organizationId,
        status: 'COMPLETED',
      },
      order: [['completed_at', 'DESC']],
      limit: includeLastNJobs,
    });
    
    if (previousJobs.length === 0) {
      return baseContext;
    }
    
    // Add historical context
    const historySection = [];
    historySection.push('\n# PREVIOUS RESEARCH INSIGHTS');
    
    for (const job of previousJobs) {
      historySection.push(`\n## Research from ${job.completed_at.toLocaleDateString()}`);
      
      // Get top recommendations from that job
      const recommendations = await this.recommendationRepo.findAll({
        where: { research_job_id: job.id },
        order: [['priority', 'ASC']],
        limit: 3,
      });
      
      recommendations.forEach((rec, i) => {
        historySection.push(`${i + 1}. ${rec.recommendation_text.substring(0, 200)}...`);
      });
    }
    
    return baseContext + '\n' + historySection.join('\n');
  }
}
```

**Benefits of This Approach:**
1. ✅ **No vector DB infrastructure needed**
2. ✅ **No embedding API costs** (Voyage/OpenAI)
3. ✅ **Simpler codebase** - one less system
4. ✅ **Faster queries** - direct PostgreSQL read
5. ✅ **Perfect isolation** - SQL WHERE clause
6. ✅ **Easier debugging** - just read from DB

**When to Add Pinecone Later:**
- Need: "Find companies similar to ours"
- Need: "Show research about products like ours"
- Need: Semantic search across historical insights
- Have: 100+ organizations with rich research history

**If You Want Vector DB Later (Pinecone with Namespaces):**

```typescript
// src/vectorstore/pinecone.service.ts (OPTIONAL - for later)

import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class PineconeService {
  private client: Pinecone;
  private indexName = 'market-analysis';
  
  async init() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  
  /**
   * CRITICAL: Use namespaces for perfect org isolation!
   */
  private getNamespace(organizationId: string): string {
    return `org-${organizationId}`;
  }
  
  async upsertCompanyContext(organizationId: string, org: Organization) {
    const index = this.client.index(this.indexName);
    const namespace = this.getNamespace(organizationId);
    
    // Get embeddings
    const embedding = await this.getEmbedding(org.product_or_service);
    
    // Upsert to org-specific namespace
    await index.namespace(namespace).upsert([{
      id: `company-${organizationId}`,
      values: embedding,
      metadata: {
        type: 'company_context',
        name: org.name,
        industry: org.industry,
        content: org.product_or_service,
      },
    }]);
  }
  
  async search(organizationId: string, query: string, topK: number = 10) {
    const index = this.client.index(this.indexName);
    const namespace = this.getNamespace(organizationId);
    
    const queryEmbedding = await this.getEmbedding(query);
    
    // Query ONLY this org's namespace - no leakage!
    const results = await index.namespace(namespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    return results.matches;
  }
  
  private async getEmbedding(text: string): Promise<number[]> {
    // Use Voyage AI, OpenAI, or local model
    // Implementation depends on your choice
  }
}
```

**Namespace Isolation Guarantee:**
```typescript
// Org A writes to 'org-uuid-a' namespace
await index.namespace('org-uuid-a').upsert(vectors);

// Org B writes to 'org-uuid-b' namespace  
await index.namespace('org-uuid-b').upsert(vectors);

// Org A queries - ONLY sees org-uuid-a data
await index.namespace('org-uuid-a').query(vector);  // ✅ Isolated

// Org B queries - ONLY sees org-uuid-b data
await index.namespace('org-uuid-b').query(vector);  // ✅ Isolated

// NO WAY for cross-contamination! Namespaces are completely separate.
```

---

### Phase 2: Multi-Agent System Core (Week 2-4)

**Goal**: Build agent orchestration framework

**Tasks:**
1. Create BaseAgent abstract class
2. Implement SearcherAgent
3. Implement AnalystAgent
4. Implement WriterAgent
5. Build LangGraph orchestrator
6. Add job queue (BullMQ)

**Job Queue Setup:**

```typescript
// src/queue/research-queue.service.ts

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

export class ResearchQueueService {
  private queue: Queue;
  private worker: Worker;
  
  constructor(private orchestrator: AgentOrchestrator) {
    const connection = new IORedis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });
    
    this.queue = new Queue('research-jobs', { connection });
    
    this.worker = new Worker(
      'research-jobs',
      async (job) => {
        return await this.orchestrator.executeResearch(
          job.data.organizationId,
          job.data.researchType,
        );
      },
      { connection }
    );
  }
  
  async addResearchJob(organizationId: string, researchType: ResearchType) {
    const job = await this.queue.add('research', {
      organizationId,
      researchType,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    return job.id;
  }
  
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    return {
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
    };
  }
}
```

---

### Phase 3: Web Scraping Integration (Week 4-5)

**Goal**: Implement scraping with Firecrawl + Apify

**Tasks:**
1. Setup Firecrawl service
2. Setup Apify service
3. Implement scraping strategies per source type
4. Add rate limiting and error handling
5. Build source credibility scoring

**Credibility Scoring:**

```typescript
// src/scraping/credibility.service.ts

export class CredibilityService {
  scoreSource(source: ResearchSource): number {
    let score = 0.5; // Base score
    
    // Domain authority
    if (this.isHighAuthorityDomain(source.url)) score += 0.2;
    
    // Recency
    const daysOld = this.getDaysOld(source.scrapedAt);
    if (daysOld < 30) score += 0.1;
    if (daysOld < 90) score += 0.05;
    
    // Content quality
    if (source.content.length > 1000) score += 0.05;
    if (this.hasAuthor(source.metadata)) score += 0.05;
    if (this.hasPublishedDate(source.metadata)) score += 0.05;
    
    // Source type
    const typeScores = {
      NEWS: 0.1,
      WEBSITE: 0.05,
      SOCIAL: -0.05,
      REVIEW: 0.1,
      VIDEO: 0.0,
    };
    score += typeScores[source.sourceType] || 0;
    
    return Math.max(0, Math.min(1, score));
  }
  
  private isHighAuthorityDomain(url: string): boolean {
    const highAuthority = [
      'techcrunch.com',
      'forbes.com',
      'bloomberg.com',
      'reuters.com',
      'wsj.com',
      'ft.com',
      'nytimes.com',
      // ... add more
    ];
    
    return highAuthority.some(domain => url.includes(domain));
  }
}
```

---

### Phase 4: Strategic Analysis Engine (Week 5-6)

**Goal**: Implement AnalystAgent logic

**Tasks:**
1. Competitor analysis module
2. Market gap detection
3. Customer needs extraction
4. Opportunity scoring algorithm
5. Evidence validation

**Opportunity Scoring:**

```typescript
// src/agents/analyst/opportunity-scorer.service.ts

export class OpportunityScorerService {
  async scoreOpportunity(
    opportunity: RawOpportunity,
    companyContext: CompanyKnowledge,
    sources: ResearchSource[]
  ): Promise<ScoredOpportunity> {
    const prompt = `
Company Context:
- Product: ${companyContext.product}
- Target: ${companyContext.targetCustomers}
- Goals: ${companyContext.goals}

Opportunity:
${JSON.stringify(opportunity, null, 2)}

Supporting Evidence:
${sources.map(s => `[${s.id}] ${s.title}: ${s.content.slice(0, 500)}...`).join('\n\n')}

Score this opportunity on a scale of 1-10 for:
1. Impact Potential: How much could this move the needle?
2. Implementation Difficulty: How hard is this to execute?
3. Time to Value: How quickly can we see results?
4. Evidence Strength: How solid is the supporting data?
5. Market Demand: How much do customers want this?

Return:
{
  "impact": 8,
  "difficulty": 6,
  "timeToValue": 7,
  "evidenceStrength": 9,
  "marketDemand": 8,
  "priorityScore": <calculated>,
  "reasoning": "Detailed explanation of scores",
  "evidenceSourceIds": ["uuid1", "uuid2"]
}

Priority Score Formula:
(impact * marketDemand * evidenceStrength) / (difficulty * timeToValue)
    `;
    
    const result = await this.llm.generateStructured(
      prompt,
      OpportunityScoreSchema
    );
    
    return {
      ...opportunity,
      scores: result,
      priorityScore: result.priorityScore,
    };
  }
}
```

---

### Phase 5: Report Generation (Week 6-7)

**Goal**: Professional PDF reports with citations

**Tasks:**
1. Implement WriterAgent
2. Citation management system
3. PDF generation (pdf-lib)
4. Markdown export
5. Report templates

**PDF Generation:**

```typescript
// src/reports/pdf-generator.service.ts

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export class PDFGeneratorService {
  async generateReport(
    report: StrategicReport,
    organization: Organization
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    
    // Title page
    await this.addTitlePage(pdfDoc, organization, report.createdAt);
    
    // Executive summary
    await this.addSection(pdfDoc, 'Executive Summary', report.executiveSummary);
    
    // Main sections
    await this.addSection(pdfDoc, 'Competitor Landscape', report.competitorLandscape);
    await this.addSection(pdfDoc, 'Market Opportunities', report.marketOpportunities);
    await this.addSection(pdfDoc, 'Strategic Recommendations', report.strategicRecommendations);
    await this.addSection(pdfDoc, 'Implementation Roadmap', report.implementationRoadmap);
    await this.addSection(pdfDoc, 'Risks & Mitigation', report.risksAndMitigation);
    
    // Appendix (sources)
    await this.addBibliography(pdfDoc, report.appendix.sources);
    
    return await pdfDoc.save();
  }
  
  private async addSection(
    pdfDoc: PDFDocument,
    title: string,
    content: string
  ) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Title
    page.drawText(title, {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Content with word wrapping
    const lines = this.wrapText(content, width - 100, font, 12);
    let yPosition = height - 100;
    
    for (const line of lines) {
      if (yPosition < 50) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 20;
    }
  }
  
  private wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
    // Implementation of text wrapping...
  }
}
```

---

### Phase 6: Human Verification Workflow (Week 7)

**Goal**: Allow users to approve/reject recommendations

**Tasks:**
1. Recommendation review API
2. Approval/rejection endpoints
3. Revision request flow
4. Status tracking

**API Implementation:**

```typescript
// src/recommendations/recommendations.controller.ts

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  @Get('pending')
  async getPendingRecommendations(@CurrentUser() user: User) {
    return await this.recommendationsService.findPending(
      user.organizationId
    );
  }
  
  @Post(':id/approve')
  async approveRecommendation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.recommendationsService.approve(id, user.id);
  }
  
  @Post(':id/reject')
  async rejectRecommendation(
    @Param('id') id: string,
    @Body() dto: RejectRecommendationDto,
    @CurrentUser() user: User,
  ) {
    return await this.recommendationsService.reject(
      id,
      user.id,
      dto.reason
    );
  }
  
  @Post(':id/revise')
  async requestRevision(
    @Param('id') id: string,
    @Body() dto: RevisionRequestDto,
    @CurrentUser() user: User,
  ) {
    // Trigger agent to regenerate recommendation with feedback
    return await this.recommendationsService.requestRevision(
      id,
      dto.feedback
    );
  }
  
  @Post('generate-final-report')
  async generateFinalReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: User,
  ) {
    // Only approved recommendations
    const report = await this.reportsService.generateFinal(
      dto.researchJobId,
      user.organizationId
    );
    
    return { reportUrl: report.fileUrl };
  }
}
```

---

### Phase 7: Testing & Optimization (Week 8)

**Goal**: Ensure reliability and performance

**Tasks:**
1. Unit tests for agents
2. Integration tests for orchestrator
3. E2E test for full pipeline
4. Performance optimization
5. Cost monitoring dashboard

**E2E Test Example:**

```typescript
// test/e2e/research-pipeline.e2e-spec.ts

describe('Research Pipeline E2E', () => {
  it('should complete full research cycle', async () => {
    // 1. Create user & organization
    const user = await createTestUser();
    const org = await createTestOrganization(user.id, {
      name: 'Test SaaS Co',
      industry: 'Software',
      product_or_service: 'Project management tool',
      target_customers: 'Remote teams',
      business_goals: 'Reach 1000 customers',
      current_challenges: 'Low brand awareness',
      known_competitors: ['Asana', 'Monday.com'],
    });
    
    // 2. Trigger research
    const jobId = await request(app.getHttpServer())
      .post('/research/start')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ researchType: 'COMPREHENSIVE' })
      .expect(201)
      .then(res => res.body.jobId);
    
    // 3. Wait for completion (or mock)
    await waitForJobCompletion(jobId, 60000);
    
    // 4. Verify sources were collected
    const sources = await researchSourceRepo.findByJobId(jobId);
    expect(sources.length).toBeGreaterThan(10);
    
    // 5. Verify recommendations were generated
    const recommendations = await recommendationRepo.findByJobId(jobId);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].evidenceSourceIds.length).toBeGreaterThan(0);
    
    // 6. Approve recommendations
    for (const rec of recommendations) {
      await request(app.getHttpServer())
        .post(`/recommendations/${rec.id}/approve`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
    }
    
    // 7. Generate final report
    const report = await request(app.getHttpServer())
      .post('/recommendations/generate-final-report')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ researchJobId: jobId })
      .expect(201)
      .then(res => res.body);
    
    expect(report.reportUrl).toBeDefined();
    expect(fs.existsSync(report.reportUrl)).toBe(true);
  }, 120000); // 2 minute timeout
});
```

---

### Phase 8: MVP Launch (Week 9-10)

**Goal**: Deploy and monitor

**Tasks:**
1. Deploy to production (Railway/Render/AWS)
2. Setup monitoring (Sentry, LogRocket)
3. Create admin dashboard
4. User documentation
5. Beta user onboarding

---

## 8. File Structure

```
market-analysis/
├── src/
│   ├── agents/
│   │   ├── base/
│   │   │   ├── base.agent.ts
│   │   │   └── agent.types.ts
│   │   ├── searcher/
│   │   │   ├── searcher.agent.ts
│   │   │   ├── searcher.module.ts
│   │   │   └── strategies/
│   │   │       ├── competitor-search.strategy.ts
│   │   │       ├── market-search.strategy.ts
│   │   │       └── customer-search.strategy.ts
│   │   ├── analyst/
│   │   │   ├── analyst.agent.ts
│   │   │   ├── analyst.module.ts
│   │   │   ├── opportunity-scorer.service.ts
│   │   │   └── evidence-validator.service.ts
│   │   ├── writer/
│   │   │   ├── writer.agent.ts
│   │   │   ├── writer.module.ts
│   │   │   ├── citation-manager.service.ts
│   │   │   └── templates/
│   │   │       ├── executive-summary.template.ts
│   │   │       └── strategic-recommendations.template.ts
│   │   └── orchestrator/
│   │       ├── orchestrator.service.ts
│   │       ├── orchestrator.module.ts
│   │       └── workflows/
│   │           ├── comprehensive-research.workflow.ts
│   │           ├── competitor-only.workflow.ts
│   │           └── customer-voice.workflow.ts
│   │
│   ├── llm/
│   │   ├── llm.factory.ts
│   │   ├── llm.module.ts
│   │   ├── providers/
│   │   │   ├── anthropic.provider.ts
│   │   │   ├── google.provider.ts
│   │   │   └── groq.provider.ts
│   │   ├── token-tracker.service.ts
│   │   └── schemas/
│   │       ├── search-queries.schema.ts
│   │       ├── competitor-analysis.schema.ts
│   │       └── opportunity-score.schema.ts
│   │
│   ├── scraping/
│   │   ├── firecrawl.service.ts
│   │   ├── apify.service.ts
│   │   ├── credibility.service.ts
│   │   ├── scraping.module.ts
│   │   └── strategies/
│   │       ├── website.strategy.ts
│   │       ├── social-media.strategy.ts
│   │       ├── reddit.strategy.ts
│   │       └── youtube.strategy.ts
│   │
│   ├── vectorstore/
│   │   ├── qdrant.service.ts
│   │   ├── embedding.service.ts
│   │   ├── vectorstore.module.ts
│   │   └── company-knowledge.service.ts
│   │
│   ├── queue/
│   │   ├── research-queue.service.ts
│   │   ├── queue.module.ts
│   │   └── processors/
│   │       └── research-job.processor.ts
│   │
│   ├── reports/
│   │   ├── pdf-generator.service.ts
│   │   ├── markdown-exporter.service.ts
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   └── reports.module.ts
│   │
│   ├── recommendations/
│   │   ├── recommendations.controller.ts
│   │   ├── recommendations.service.ts
│   │   ├── recommendations.module.ts
│   │   └── dto/
│   │       ├── approve-recommendation.dto.ts
│   │       ├── reject-recommendation.dto.ts
│   │       └── revision-request.dto.ts
│   │
│   ├── research/
│   │   ├── research.controller.ts
│   │   ├── research.service.ts
│   │   ├── research.module.ts
│   │   └── dto/
│   │       └── start-research.dto.ts
│   │
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── organization.model.ts
│   │   ├── research-job.model.ts
│   │   ├── research-source.model.ts
│   │   ├── strategic-recommendation.model.ts
│   │   ├── company-knowledge-vector.model.ts
│   │   ├── agent-execution-log.model.ts
│   │   └── generated-report.model.ts
│   │
│   ├── auth/
│   │   └── ... (existing)
│   │
│   ├── common/
│   │   ├── enums.ts
│   │   ├── interfaces/
│   │   └── utils/
│   │
│   └── config/
│       ├── database.config.ts
│       ├── llm.config.ts
│       ├── scraping.config.ts
│       └── queue.config.ts
│
├── migrations/
│   ├── 001-initial-schema.ts
│   ├── 002-add-research-tables.ts
│   └── 003-simplify-organization-schema.ts
│
├── test/
│   ├── unit/
│   │   ├── agents/
│   │   └── services/
│   ├── integration/
│   │   └── orchestrator.integration.spec.ts
│   └── e2e/
│       └── research-pipeline.e2e-spec.ts
│
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## 9. API Design

### Research Endpoints

```typescript
POST /research/start
Authorization: Bearer <token>
Body: {
  researchType: 'COMPREHENSIVE' | 'COMPETITOR' | 'MARKET' | 'CUSTOMER',
  parameters?: {
    focusAreas?: string[],
    maxSources?: number,
    includeVideos?: boolean,
    includeSocialMedia?: boolean,
  }
}
Response: { jobId: string, estimatedTime: string }

GET /research/jobs/:jobId/status
Response: {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
  progress: {
    currentAgent: 'Searcher' | 'Analyst' | 'Writer',
    percentage: number,
    message: string,
  },
  startedAt: string,
  completedAt?: string,
  error?: string,
}

GET /research/jobs/:jobId/sources
Response: {
  sources: [
    {
      id: string,
      url: string,
      title: string,
      sourceType: string,
      scrapedAt: string,
      credibilityScore: number,
      preview: string,
    }
  ],
  total: number,
}

GET /research/jobs/:jobId/recommendations
Response: {
  recommendations: [
    {
      id: string,
      category: string,
      priority: string,
      text: string,
      reasoning: string,
      evidenceSources: number[],  // Citation numbers
      confidenceScore: number,
      verificationStatus: string,
    }
  ]
}

GET /research/jobs
Query: ?status=COMPLETED&limit=10&offset=0
Response: {
  jobs: [...],
  total: number,
}
```

### Recommendations Endpoints

```typescript
GET /recommendations/pending
Response: { recommendations: [...] }

POST /recommendations/:id/approve
Response: { success: true, message: 'Recommendation approved' }

POST /recommendations/:id/reject
Body: { reason: string }
Response: { success: true, message: 'Recommendation rejected' }

POST /recommendations/:id/revise
Body: { feedback: string }
Response: { success: true, newRecommendationId: string }

POST /recommendations/generate-final-report
Body: { researchJobId: string, format: 'PDF' | 'MARKDOWN' | 'HTML' }
Response: {
  reportId: string,
  reportUrl: string,
  generatedAt: string,
}
```

### Reports Endpoints

```typescript
GET /reports
Response: { reports: [...] }

GET /reports/:id
Response: {
  id: string,
  researchJobId: string,
  format: string,
  fileUrl: string,
  metadata: { ... },
  generatedAt: string,
}

GET /reports/:id/download
Response: <PDF file stream>
```

---

## 10. Testing Strategy

### Unit Tests

```typescript
// Test individual agents
describe('SearcherAgent', () => {
  it('should generate relevant search queries', async () => {
    const context = createMockContext();
    const queries = await searcherAgent.generateSearchQueries(context);
    expect(queries.competitors.length).toBeGreaterThan(0);
  });
  
  it('should scrape content successfully', async () => {
    const url = 'https://example.com';
    const content = await searcherAgent.scrapeContent([url]);
    expect(content[0].markdown).toBeDefined();
  });
});

describe('AnalystAgent', () => {
  it('should score opportunities correctly', async () => {
    const opportunity = createMockOpportunity();
    const scored = await analystAgent.scoreOpportunity(opportunity);
    expect(scored.priorityScore).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Agent Orchestrator', () => {
  it('should execute full workflow', async () => {
    const result = await orchestrator.executeResearch(
      mockOrgId,
      'COMPREHENSIVE'
    );
    expect(result).toBeDefined();
  });
  
  it('should handle agent failures gracefully', async () => {
    // Mock Searcher to fail
    jest.spyOn(searcherAgent, 'execute').mockRejectedValue(new Error());
    
    await expect(
      orchestrator.executeResearch(mockOrgId, 'COMPREHENSIVE')
    ).rejects.toThrow();
  });
});
```

### E2E Tests

See Phase 7 example above.

---

## 11. Cost Optimization

### Token Usage Estimates (Per Research Job)

| Agent | Task | Model | Input Tokens | Output Tokens | Cost |
|-------|------|-------|--------------|---------------|------|
| Searcher | Query generation | Groq Llama | 2K | 500 | $0 |
| Searcher | Content extraction | Groq Llama | 50K | 1K | $0 |
| Analyst | Competitor analysis | Gemini Pro | 30K | 2K | $0 |
| Analyst | Opportunity scoring | Gemini Pro | 20K | 3K | $0 |
| Writer | Report generation | Claude Sonnet | 40K | 5K | $0.20 |
| **Total** | | | **142K** | **11.5K** | **~$0.20** |

**With all Claude (worst case):**
- Input: 142K * $3/MTok = $0.43
- Output: 11.5K * $15/MTok = $0.17
- **Total: ~$0.60 per report**

**Monthly Cost Estimates (100 users, 10 reports/month each):**
- Free tier strategy: **$200/month** (only final reports)
- All Claude strategy: **$600/month**

### Scraping Costs

| Service | Pricing | Est. Cost/Report |
|---------|---------|------------------|
| Firecrawl | $0.50/1K pages | $0.02 (40 pages) |
| Apify | Compute-based | $0.10 (social scraping) |
| **Total** | | **$0.12/report** |

**Total Cost per Report: $0.20 (LLM) + $0.12 (Scraping) = $0.32**

**Monthly (1000 reports): ~$320**

---

## 12. Environment Variables

```bash
# .env

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/market_analysis

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=5h

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
GROQ_API_KEY=gsk_...

# Embedding
VOYAGE_API_KEY=pa-...  # or OPENAI_API_KEY

# Scraping
FIRECRAWL_API_KEY=fc-...
APIFY_API_TOKEN=apify_api_...

# Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional for cloud

# Queue
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage (for PDFs)
AWS_S3_BUCKET=market-analysis-reports
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Monitoring
SENTRY_DSN=https://...
```

---

## Next Steps

1. **Week 1**: Database migration + Qdrant setup
2. **Week 2-4**: Build multi-agent core (SearcherAgent first)
3. **Week 5**: Integrate Firecrawl + Apify
4. **Week 6**: Implement AnalystAgent
5. **Week 7**: Implement WriterAgent + PDF generation
6. **Week 8**: Human verification flow
7. **Week 9**: Testing + optimization
8. **Week 10**: Deploy MVP

**Priority Decision Points:**
1. ✅ Keep or remove OrganizationMember? → **REMOVE for MVP**
2. ✅ LangGraph or CrewAI? → **LangGraph (TypeScript)**
3. ✅ Firecrawl or Apify? → **Firecrawl primary, Apify fallback**
4. ✅ LLM strategy? → **Groq + Gemini free tiers + Claude for final**

---

## Questions?

- Need clarification on any architecture decision?
- Want to dive deeper into a specific agent implementation?
- Need help with migration strategy?
- Want to discuss cost optimization further?

Let me know and I'll provide detailed implementation code!
