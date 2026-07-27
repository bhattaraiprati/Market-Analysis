# MVP Quick Start Guide

## TL;DR - Start Here

### What You're Building (Simplified)

**Input:** Company fills out onboarding form (industry, product, goals, competitors)

**Process:**
1. **Searcher Agent** → Scrapes competitor websites, Reddit discussions, news
2. **Analyst Agent** → Finds opportunities, gaps, threats
3. **Writer Agent** → Generates professional strategic report

**Output:** 10-15 page PDF report with actionable recommendations + source citations

---

## MVP Architecture (Simplified)

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│  "Create organization" → "Start research" → "Review report"  │
└─────────────────────────────────┬────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────┐
│                    NestJS Backend (PostgreSQL Only)           │
├───────────────────────────────────────────────────────────────┤
│  Auth → Organization → ResearchJob → Sources → Recommendations│
└─────────────────────────────────┬────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────┐
│               Manual Agent Orchestrator                       │
│                                                               │
│   Step 1: SearcherAgent.execute()                           │
│           ├── Generate search queries (Groq Llama - FREE)   │
│           ├── Scrape websites (Firecrawl - $0.02)          │
│           └── Store sources in PostgreSQL                   │
│                                                               │
│   Step 2: AnalystAgent.execute()                            │
│           ├── Analyze opportunities (Gemini Pro - FREE)     │
│           ├── Score & prioritize                            │
│           └── Store recommendations in PostgreSQL           │
│                                                               │
│   Step 3: WriterAgent.execute()                             │
│           ├── Generate report (Claude Sonnet - $0.20)      │
│           ├── Add citations                                 │
│           └── Generate PDF                                  │
└───────────────────────────────────────────────────────────────┘
```

**Key Decisions:**
- ✅ PostgreSQL ONLY (no vector database for MVP)
- ✅ Manual orchestration (no LangGraph/CrewAI)
- ✅ Single user per organization
- ✅ Free LLMs where possible (Groq + Gemini)

---

## Phase-by-Phase Implementation

### Phase 0: Database Setup (Day 1-2)

**Goal:** Simplify schema and add research tables

#### 1. Remove OrganizationMember Table

```typescript
// Migration: Add owner_id to organizations table
await queryInterface.addColumn('organizations', 'owner_id', {
  type: DataType.UUID,
  references: { model: 'users', key: 'id' },
  allowNull: false,
});

// Migrate existing data
await queryInterface.sequelize.query(`
  UPDATE organizations 
  SET owner_id = (
    SELECT user_id 
    FROM organization_members 
    WHERE organization_id = organizations.id 
      AND role = 'OWNER' 
    LIMIT 1
  );
`);

// Drop the join table
await queryInterface.dropTable('organization_members');
```

#### 2. Add Research Tables

```sql
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  research_type VARCHAR(50) NOT NULL,
  input_parameters JSONB,
  agent_orchestration_state JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id UUID NOT NULL REFERENCES research_jobs(id),
  source_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  scraped_at TIMESTAMP DEFAULT NOW(),
  credibility_score FLOAT,
  metadata JSONB
);

CREATE TABLE strategic_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id UUID NOT NULL REFERENCES research_jobs(id),
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  recommendation_text TEXT NOT NULL,
  reasoning TEXT,
  evidence_source_ids UUID[],
  confidence_score FLOAT,
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT
);

CREATE INDEX idx_research_jobs_org ON research_jobs(organization_id);
CREATE INDEX idx_research_sources_job ON research_sources(research_job_id);
CREATE INDEX idx_recommendations_job ON strategic_recommendations(research_job_id);
```

---

### Phase 1: Company Context Service (Day 3)

**Goal:** Load company data from PostgreSQL (NO VECTOR DB!)

```typescript
// src/company-context/company-context.service.ts

@Injectable()
export class CompanyContextService {
  constructor(
    @InjectModel(Organization)
    private organizationRepo: typeof Organization,
  ) {}
  
  async loadContext(organizationId: string): Promise<string> {
    const org = await this.organizationRepo.findByPk(organizationId);
    
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    
    return `
# COMPANY PROFILE
Company Name: ${org.name}
Industry: ${org.industry}
Website: ${org.website || 'N/A'}

# PRODUCT/SERVICE
${org.product_or_service}

# TARGET CUSTOMERS
${org.target_customers}

# BUSINESS GOALS
${org.business_goals}

# CURRENT CHALLENGES
${org.current_challenges || 'None specified'}

# KNOWN COMPETITORS
${org.known_competitors?.join(', ') || 'None specified'}
    `.trim();
  }
}
```

**Test it:**
```bash
curl http://localhost:3000/context/:orgId \
  -H "Authorization: Bearer $TOKEN"
```

---

### Phase 2: Searcher Agent (Day 4-6)

**Goal:** Scrape web sources using Firecrawl

#### 1. Install Dependencies

```bash
npm install @mendable/firecrawl-js groq-sdk
```

#### 2. Create Searcher Agent

```typescript
// src/agents/searcher/searcher.agent.ts

import FirecrawlApp from '@mendable/firecrawl-js';
import Groq from 'groq-sdk';

@Injectable()
export class SearcherAgent {
  private firecrawl: FirecrawlApp;
  private groq: Groq;
  
  constructor(
    @InjectModel(ResearchSource)
    private sourceRepo: typeof ResearchSource,
  ) {
    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });
    
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  
  async execute(context: AgentContext): Promise<AgentResult> {
    const { researchJobId, companyContext } = context;
    
    try {
      // 1. Generate search queries using Groq (FREE!)
      const queries = await this.generateSearchQueries(companyContext);
      
      // 2. Scrape sources in parallel
      const sources = await this.scrapeSources(queries);
      
      // 3. Store in PostgreSQL
      await this.storeSources(researchJobId, sources);
      
      return {
        success: true,
        data: { sources, count: sources.length },
        tokensUsed: 0,  // Groq is free
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  private async generateSearchQueries(companyContext: string): Promise<string[]> {
    const prompt = `
Given this company context:

${companyContext}

Generate 15 specific Google search queries to research:
1. Direct competitors (5 queries)
2. Market trends in this industry (5 queries)
3. Customer discussions and reviews (5 queries)

Return ONLY a JSON array of search query strings.
Example: ["competitor analysis saas tools", "reddit discussions project management software"]
    `;
    
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    
    const queries = JSON.parse(response.choices[0].message.content);
    return queries;
  }
  
  private async scrapeSources(queries: string[]): Promise<ScrapedSource[]> {
    const sources: ScrapedSource[] = [];
    
    // For MVP: Manually construct URLs from queries
    // Later: Integrate with SerpAPI to get actual search results
    const urls = this.queriesToUrls(queries);
    
    // Scrape in parallel (max 5 at a time to avoid rate limits)
    const chunks = this.chunk(urls, 5);
    
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(url => this.scrapeUrl(url))
      );
      sources.push(...results.filter(Boolean));
    }
    
    return sources;
  }
  
  private async scrapeUrl(url: string): Promise<ScrapedSource | null> {
    try {
      const result = await this.firecrawl.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
      });
      
      return {
        url,
        title: result.metadata?.title || 'Untitled',
        content: result.markdown,
        sourceType: this.detectSourceType(url),
        metadata: result.metadata,
      };
      
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error.message);
      return null;
    }
  }
  
  private detectSourceType(url: string): string {
    if (url.includes('reddit.com')) return 'SOCIAL';
    if (url.includes('youtube.com')) return 'VIDEO';
    if (url.includes('news')) return 'NEWS';
    return 'WEBSITE';
  }
  
  private async storeSources(
    jobId: string,
    sources: ScrapedSource[]
  ): Promise<void> {
    await this.sourceRepo.bulkCreate(
      sources.map(s => ({
        research_job_id: jobId,
        url: s.url,
        title: s.title,
        content: s.content,
        source_type: s.sourceType,
        credibility_score: 0.5,  // Default, improve later
        metadata: s.metadata,
        scraped_at: new Date(),
      }))
    );
  }
  
  private chunk<T>(array: T[], size: number): T[][] {
    return array.reduce((acc, _, i) => 
      i % size === 0 
        ? [...acc, array.slice(i, i + size)]
        : acc
    , []);
  }
  
  private queriesToUrls(queries: string[]): string[] {
    // For MVP: Hardcode some URLs based on query patterns
    // Later: Use SerpAPI to get real search results
    return [
      'https://www.g2.com/categories/project-management',
      'https://www.capterra.com/project-management-software/',
      // Add more based on your industry
    ];
  }
}
```

**Test it:**
```typescript
const result = await searcherAgent.execute({
  researchJobId: 'test-job-id',
  companyContext: 'Company: TestCo\nProduct: SaaS tool',
});

console.log(`Scraped ${result.data.count} sources`);
```

---

### Phase 3: Analyst Agent (Day 7-9)

**Goal:** Analyze sources and generate opportunities

```typescript
// src/agents/analyst/analyst.agent.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AnalystAgent {
  private genai: GoogleGenerativeAI;
  
  constructor(
    @InjectModel(ResearchSource)
    private sourceRepo: typeof ResearchSource,
    @InjectModel(StrategicRecommendation)
    private recommendationRepo: typeof StrategicRecommendation,
  ) {
    this.genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  
  async execute(context: AgentContext): Promise<AgentResult> {
    const { researchJobId, companyContext } = context;
    
    try {
      // 1. Load scraped sources
      const sources = await this.sourceRepo.findAll({
        where: { research_job_id: researchJobId },
      });
      
      if (sources.length === 0) {
        throw new Error('No sources found to analyze');
      }
      
      // 2. Analyze for opportunities
      const opportunities = await this.analyzeOpportunities(
        companyContext,
        sources
      );
      
      // 3. Score and prioritize
      const scored = await this.scoreOpportunities(opportunities);
      
      // 4. Store recommendations
      await this.storeRecommendations(researchJobId, scored);
      
      return {
        success: true,
        data: { opportunities: scored },
        tokensUsed: 0,  // Gemini free tier
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  private async analyzeOpportunities(
    companyContext: string,
    sources: ResearchSource[]
  ): Promise<Opportunity[]> {
    const model = this.genai.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });
    
    // Combine sources into context
    const sourcesText = sources
      .map((s, i) => `[${i+1}] ${s.title}\n${s.content.slice(0, 2000)}...\n`)
      .join('\n---\n');
    
    const prompt = `
You are a strategic business analyst.

COMPANY CONTEXT:
${companyContext}

RESEARCH SOURCES:
${sourcesText}

Based on the research, identify 5-10 strategic opportunities for this company.

For each opportunity:
1. What should the company do?
2. Why is this an opportunity? (based on evidence)
3. Which sources support this? (cite by [number])
4. What category? (PRODUCT, MARKETING, COMPETITIVE, GROWTH)
5. What priority? (HIGH, MEDIUM, LOW)

Return as JSON array:
[
  {
    "title": "Launch freemium tier to compete with Competitor X",
    "description": "Detailed explanation...",
    "reasoning": "Sources [1] and [3] show customers want free trial...",
    "category": "PRODUCT",
    "priority": "HIGH",
    "sourceIds": [1, 3]
  }
]
    `;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse opportunities from AI response');
    }
    
    return JSON.parse(jsonMatch[0]);
  }
  
  private async scoreOpportunities(
    opportunities: Opportunity[]
  ): Promise<ScoredOpportunity[]> {
    // For MVP: Simple rule-based scoring
    return opportunities.map(opp => ({
      ...opp,
      confidenceScore: this.calculateConfidence(opp),
    }));
  }
  
  private calculateConfidence(opp: Opportunity): number {
    let score = 0.5;
    
    // More sources = higher confidence
    score += Math.min(opp.sourceIds.length * 0.1, 0.3);
    
    // High priority = higher confidence
    if (opp.priority === 'HIGH') score += 0.2;
    
    return Math.min(score, 1.0);
  }
  
  private async storeRecommendations(
    jobId: string,
    opportunities: ScoredOpportunity[]
  ): Promise<void> {
    await this.recommendationRepo.bulkCreate(
      opportunities.map(opp => ({
        research_job_id: jobId,
        category: opp.category,
        priority: opp.priority,
        recommendation_text: opp.title,
        reasoning: opp.description + '\n\n' + opp.reasoning,
        evidence_source_ids: opp.sourceIds,
        confidence_score: opp.confidenceScore,
        verification_status: 'PENDING',
      }))
    );
  }
}
```

---

### Phase 4: Writer Agent (Day 10-12)

**Goal:** Generate professional reports with Claude

```typescript
// src/agents/writer/writer.agent.ts

import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class WriterAgent {
  private anthropic: Anthropic;
  
  constructor(
    @InjectModel(StrategicRecommendation)
    private recommendationRepo: typeof StrategicRecommendation,
    @InjectModel(ResearchSource)
    private sourceRepo: typeof ResearchSource,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  async execute(context: AgentContext): Promise<AgentResult> {
    const { researchJobId, companyContext } = context;
    
    try {
      // 1. Load recommendations
      const recommendations = await this.recommendationRepo.findAll({
        where: { research_job_id: researchJobId },
        order: [['priority', 'ASC']],
      });
      
      // 2. Load sources for citations
      const sources = await this.sourceRepo.findAll({
        where: { research_job_id: researchJobId },
      });
      
      // 3. Generate report sections
      const report = await this.generateReport(
        companyContext,
        recommendations,
        sources
      );
      
      return {
        success: true,
        data: { report },
        tokensUsed: 5000,  // Estimate
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  private async generateReport(
    companyContext: string,
    recommendations: StrategicRecommendation[],
    sources: ResearchSource[]
  ): Promise<string> {
    const prompt = `
You are a professional business strategy consultant writing a strategic report.

COMPANY CONTEXT:
${companyContext}

STRATEGIC RECOMMENDATIONS:
${recommendations.map((r, i) => `
${i+1}. ${r.recommendation_text}
   Category: ${r.category}
   Priority: ${r.priority}
   Reasoning: ${r.reasoning}
`).join('\n')}

SOURCES:
${sources.map((s, i) => `
[${i+1}] ${s.title}
    ${s.url}
`).join('\n')}

Write a professional strategic report with these sections:

# Executive Summary
(2-3 paragraphs summarizing key findings and top recommendations)

# Strategic Recommendations

## High Priority
(Detailed write-up of high-priority recommendations with source citations)

## Medium Priority
(Detailed write-up of medium-priority recommendations)

## Low Priority
(Brief mention of low-priority opportunities)

# Implementation Roadmap
(Suggested timeline for executing recommendations)

# Appendix: Sources
(Bibliography of all sources used)

Use professional business language. Cite sources using [1], [2], etc.
    `;
    
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
    
    return message.content[0].text;
  }
}
```

---

### Phase 5: Manual Orchestrator (Day 13-14)

**Goal:** Connect all agents together

```typescript
// src/agents/orchestrator/orchestrator.service.ts

@Injectable()
export class OrchestratorService {
  constructor(
    private companyContextService: CompanyContextService,
    private searcherAgent: SearcherAgent,
    private analystAgent: AnalystAgent,
    private writerAgent: WriterAgent,
    @InjectModel(ResearchJob)
    private researchJobRepo: typeof ResearchJob,
  ) {}
  
  async executeResearch(
    organizationId: string,
    researchType: string
  ): Promise<string> {
    // 1. Create job
    const job = await this.researchJobRepo.create({
      organization_id: organizationId,
      status: 'PENDING',
      research_type: researchType,
      input_parameters: { type: researchType },
    });
    
    console.log(`🚀 Starting research job ${job.id}`);
    
    try {
      // 2. Load company context
      const companyContext = await this.companyContextService.loadContext(
        organizationId
      );
      
      // 3. Update status
      await job.update({ status: 'IN_PROGRESS' });
      
      // 4. Run Searcher
      console.log('🔍 Running Searcher Agent...');
      const searchResult = await this.searcherAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext,
      });
      
      if (!searchResult.success) {
        throw new Error(`Searcher failed: ${searchResult.error}`);
      }
      
      console.log(`✅ Collected ${searchResult.data.count} sources`);
      
      // 5. Run Analyst
      console.log('📊 Running Analyst Agent...');
      const analysisResult = await this.analystAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext,
      });
      
      if (!analysisResult.success) {
        throw new Error(`Analyst failed: ${analysisResult.error}`);
      }
      
      console.log(`✅ Generated ${analysisResult.data.opportunities.length} opportunities`);
      
      // 6. Run Writer
      console.log('✍️ Running Writer Agent...');
      const writerResult = await this.writerAgent.execute({
        organizationId,
        researchJobId: job.id,
        companyContext,
      });
      
      if (!writerResult.success) {
        throw new Error(`Writer failed: ${writerResult.error}`);
      }
      
      console.log('✅ Report generated');
      
      // 7. Mark complete
      await job.update({
        status: 'COMPLETED',
        completed_at: new Date(),
      });
      
      console.log(`🎉 Research job ${job.id} completed successfully`);
      
      return job.id;
      
    } catch (error) {
      console.error(`❌ Research job ${job.id} failed:`, error);
      
      await job.update({
        status: 'FAILED',
        error_message: error.message,
      });
      
      throw error;
    }
  }
}
```

---

### Phase 6: API Endpoints (Day 15)

```typescript
// src/research/research.controller.ts

@Controller('research')
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(private orchestrator: OrchestratorService) {}
  
  @Post('start')
  async startResearch(
    @CurrentUser() user: User,
    @Body() dto: StartResearchDto,
  ) {
    const jobId = await this.orchestrator.executeResearch(
      user.organization_id,
      dto.researchType
    );
    
    return {
      jobId,
      message: 'Research started',
      estimatedTime: '5-10 minutes',
    };
  }
  
  @Get('jobs/:jobId')
  async getJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ) {
    const job = await ResearchJob.findOne({
      where: {
        id: jobId,
        organization_id: user.organization_id,
      },
    });
    
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    
    return job;
  }
}
```

---

## Testing Your MVP

### 1. Create Test Organization

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Create organization
curl -X POST http://localhost:3000/auth/organization \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test SaaS Co",
    "industry": "Software",
    "product_or_service": "Project management tool for remote teams",
    "target_customers": "Small to medium-sized tech companies with distributed teams",
    "business_goals": "Reach 1000 paying customers by end of year",
    "current_challenges": "Low brand awareness, high customer acquisition cost",
    "known_competitors": ["Asana", "Monday.com", "ClickUp"]
  }'
```

### 2. Start Research

```bash
curl -X POST http://localhost:3000/research/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "researchType": "COMPREHENSIVE"
  }'
```

### 3. Check Status

```bash
curl http://localhost:3000/research/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 4. View Report

```bash
curl http://localhost:3000/research/jobs/$JOB_ID/report \
  -H "Authorization: Bearer $TOKEN"
```

---

## Estimated Costs (Monthly)

**Assumptions:** 100 organizations, 10 reports each = 1000 reports/month

| Service | Cost |
|---------|------|
| Groq Llama (Searcher) | $0 (free tier) |
| Gemini Pro (Analyst) | $0 (free tier) |
| Claude Sonnet (Writer) | $200 (1000 reports × $0.20) |
| Firecrawl (Scraping) | $20 (40 pages/report × $0.50/1K) |
| Apify (Social scraping) | $100 (occasional use) |
| PostgreSQL (Neon/Railway) | $25 (hosted DB) |
| **Total** | **~$345/month** |

**Per report: $0.35**

---

## Next Steps

1. ✅ Review this guide
2. ✅ Set up environment variables
3. ✅ Run database migrations
4. ✅ Implement Phase 1 (Company Context Service)
5. ✅ Test with one organization
6. ✅ Implement Searcher Agent
7. ✅ Implement Analyst Agent
8. ✅ Implement Writer Agent
9. ✅ Connect with Orchestrator
10. ✅ Test end-to-end

**Ready to start? Begin with Phase 0 (database migrations)!**