# Architecture Decisions & Best Practices

## Critical Questions Answered

### 1. Do We Need a Vector Database?

**Short Answer: NO for MVP! Use PostgreSQL only.**

#### What Vector DBs Are Actually For

Vector databases are designed for **semantic similarity search**:
- "Find documents similar to this one"
- "Show me companies like ours"
- "What are similar products in the market?"

They work by:
1. Converting text to numerical vectors (embeddings)
2. Finding vectors close together in high-dimensional space
3. Returning semantically similar content

#### When You DON'T Need Vector DB (Your Case for MVP)

✅ **Use PostgreSQL if you:**
- Have structured, queryable data
- Can identify data by exact IDs/filters
- Need simple lookups: "Get organization by ID"
- Want to avoid infrastructure complexity
- Are just starting out

**For your project:**
```typescript
// This works perfectly without vector DB:
const org = await Organization.findByPk(organizationId);

const companyContext = `
Company: ${org.name}
Product: ${org.product_or_service}
Goals: ${org.business_goals}
`;

// Pass this to agents - NO VECTOR SEARCH NEEDED!
```

#### When You WOULD Need Vector DB (Maybe Later)

❌ **Consider vector DB only if you need:**

1. **Cross-organization pattern matching:**
   ```
   User: "Show me how similar SaaS companies solved customer churn"
   → Need to find semantically similar companies across all orgs
   ```

2. **Semantic search in historical research:**
   ```
   User: "What did we learn about pricing strategies 6 months ago?"
   → Need to search through old research by meaning, not exact keywords
   ```

3. **Similar competitor discovery:**
   ```
   User: "Find competitors we haven't researched yet that are similar to Competitor A"
   → Need semantic similarity between competitor descriptions
   ```

**MVP Reality Check:**
- First version: 1-10 organizations
- Simple: "Research MY company"
- No need for: "What are others doing?"

**Verdict: Skip vector DB entirely for MVP.**

---

### 2. Organization Data Isolation (CRITICAL!)

#### The Problem You Identified

> "If many organizations use this system, won't their data mix together and contaminate each other's results?"

**YES! This is a real concern. Here's how to prevent it:**

#### Solution 1: PostgreSQL Isolation (RECOMMENDED for MVP)

```typescript
// Every query ALWAYS includes organization filter
const sources = await ResearchSource.findAll({
  where: {
    research_job_id: jobId,
    // Job belongs to specific org, so this is isolated
  }
});

const job = await ResearchJob.findOne({
  where: {
    id: jobId,
    organization_id: organizationId,  // ✅ Always filter by org
  }
});
```

**How to Guarantee Isolation:**

1. **Foreign Key Chain:**
```
User → Organization → ResearchJob → ResearchSources → Recommendations
```

2. **Always Query from Organization:**
```typescript
// ✅ CORRECT - Isolated
const jobs = await ResearchJob.findAll({
  where: { organization_id: user.organizationId }
});

// ❌ WRONG - Could leak data
const jobs = await ResearchJob.findAll();  // Returns ALL orgs!
```

3. **Use Scopes in Sequelize:**
```typescript
// models/research-job.model.ts
@DefaultScope(() => ({
  where: {
    // Force org filter on every query
  }
}))
@Scopes(() => ({
  forOrganization: (orgId: string) => ({
    where: { organization_id: orgId }
  })
}))
export class ResearchJob extends Model {
  // ...
}

// Usage
const jobs = await ResearchJob.scope('forOrganization', orgId).findAll();
```

4. **Guard in Orchestrator:**
```typescript
async executeResearch(organizationId: string, researchType: string) {
  // ALWAYS verify job belongs to org
  const job = await this.researchJobRepo.findOne({
    where: {
      id: jobId,
      organization_id: organizationId,  // ✅ Double-check
    }
  });
  
  if (!job) {
    throw new ForbiddenException('Access denied');
  }
}
```

#### Solution 2: Vector DB Isolation (If You Use Pinecone Later)

**Use Namespaces - Perfect Isolation:**

```typescript
// Each organization gets its own isolated namespace
const namespace = `org-${organizationId}`;

// Write data - goes to org's namespace only
await index.namespace(namespace).upsert([{
  id: 'vector-1',
  values: embedding,
  metadata: { type: 'research' }
}]);

// Query data - only from this org's namespace
const results = await index.namespace(namespace).query({
  vector: queryEmbedding,
  topK: 10
});
```

**How Namespaces Work:**

```
Pinecone Index: "market-analysis"
├── namespace: "org-123e4567"
│   ├── vector-1 (Org A's data)
│   ├── vector-2 (Org A's data)
│   └── vector-3 (Org A's data)
├── namespace: "org-987f6543"
│   ├── vector-1 (Org B's data)  ← Same ID, different namespace!
│   └── vector-2 (Org B's data)
└── namespace: "org-456a7890"
    └── vector-1 (Org C's data)
```

**Guarantees:**
- ✅ Queries to `org-123e4567` NEVER see data from `org-987f6543`
- ✅ No metadata filtering needed (which can fail)
- ✅ Complete physical isolation
- ✅ No possibility of cross-contamination

**Why Metadata Filtering Is NOT Safe:**

```typescript
// ❌ DANGEROUS - relies on metadata filter
await index.query({
  vector: queryEmbedding,
  filter: { organizationId: { $eq: 'org-123' } },  // Can be bypassed!
  topK: 10
});

// ✅ SAFE - namespace is physical isolation
await index.namespace('org-123').query({
  vector: queryEmbedding,
  topK: 10  // Can only see org-123 data, period.
});
```

---

### 3. What Goes in PostgreSQL vs Vector DB?

#### Decision Matrix

| Data Type | PostgreSQL | Vector DB | Reason |
|-----------|-----------|-----------|--------|
| User accounts | ✅ | ❌ | Exact ID lookup |
| Organization details | ✅ | ❌ | Structured, queryable |
| Research jobs | ✅ | ❌ | Status tracking, exact queries |
| Scraped sources (full text) | ✅ | ⚠️ Optional | Store text in PG, optionally embed for similarity |
| Recommendations | ✅ | ❌ | Structured with foreign keys |
| Agent execution logs | ✅ | ❌ | Time-series data |
| Generated reports | ✅ (metadata) | ❌ | File URL + metadata |
| Historical patterns | ✅ (first) | ⚠️ Later | Start with PG full-text search |

#### The Rule of Thumb

**Use PostgreSQL when:**
- You can write a SQL WHERE clause to find it
- It has a clear ID or foreign key relationship
- You need exact matches
- You need transactions (create job + create sources atomically)

**Use Vector DB when:**
- You need "find similar" functionality
- Exact keywords don't work
- Semantic meaning matters
- No clear query structure

#### Example: Storing Research Sources

```typescript
// PostgreSQL (always do this)
await ResearchSource.create({
  id: uuid(),
  research_job_id: jobId,
  url: 'https://competitor.com/pricing',
  title: 'Competitor A Pricing Page',
  content: '... full text ...',
  source_type: 'WEBSITE',
  credibility_score: 0.85,
  scraped_at: new Date(),
});

// Vector DB (only if you need similarity search later)
// "Find sources similar to this one"
if (USE_VECTOR_DB) {
  const embedding = await getEmbedding(source.content);
  await index.namespace(`org-${orgId}`).upsert([{
    id: source.id,
    values: embedding,
    metadata: {
      url: source.url,
      title: source.title,
      type: source.source_type,
    }
  }]);
}
```

**For MVP: Only the PostgreSQL part!**

---

### 4. Multi-Tenancy Best Practices

#### Database Design for Multi-Tenancy

**Option 1: Shared Schema with Org ID (RECOMMENDED)**

```sql
-- Every table has organization_id
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status VARCHAR(50),
  -- ...
);

CREATE INDEX idx_research_jobs_org ON research_jobs(organization_id);
```

**Benefits:**
- ✅ Simple to implement
- ✅ Easy to query across orgs (admin features)
- ✅ Cost-effective (one database)
- ✅ Easy backups

**Drawbacks:**
- ⚠️ Must ALWAYS filter by org_id (can forget)
- ⚠️ One org's spike affects others

**How to Prevent Leaks:**

```typescript
// 1. Middleware to inject org filter
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Inject org ID into all queries
    request.organizationId = user.organizationId;
    
    return next.handle();
  }
}

// 2. Base repository with org filter
export class BaseRepository<T> {
  async findAll(options: any, orgId: string) {
    return this.model.findAll({
      ...options,
      where: {
        ...options.where,
        organization_id: orgId,  // ✅ Always added
      }
    });
  }
}

// 3. Guard to verify ownership
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const jobId = request.params.jobId;
    
    const job = await ResearchJob.findByPk(jobId);
    
    if (job.organization_id !== user.organizationId) {
      throw new ForbiddenException('Access denied');
    }
    
    return true;
  }
}
```

**Option 2: Separate Schema per Org (Overkill for MVP)**

```sql
-- Each org gets own schema
CREATE SCHEMA org_123e4567;
CREATE SCHEMA org_987f6543;

-- Tables in each schema
CREATE TABLE org_123e4567.research_jobs (...);
CREATE TABLE org_987f6543.research_jobs (...);
```

**Benefits:**
- ✅ Perfect isolation (impossible to leak)
- ✅ Can scale per org

**Drawbacks:**
- ❌ Complex migrations (run for each org)
- ❌ Hard to query across orgs
- ❌ Schema management complexity

**Verdict: Option 1 for MVP, Option 2 only if you get 1000+ orgs**

---

### 5. Manual Agent Orchestration vs Frameworks

#### Why Manual First (Your Request)

**Benefits of Building Without LangGraph/CrewAI:**

1. **Deep Understanding:**
```typescript
// You see exactly what's happening
console.log('🔍 Step 1: Calling Searcher Agent');
const searchResult = await searcherAgent.execute(context);
console.log(`✅ Found ${searchResult.data.sources.length} sources`);

console.log('📊 Step 2: Calling Analyst Agent');
const analysis = await analystAgent.execute({ searchResult });
console.log(`✅ Generated ${analysis.data.opportunities.length} opportunities`);

console.log('✍️ Step 3: Calling Writer Agent');
const report = await writerAgent.execute({ analysis });
console.log('✅ Report generated');
```

2. **Easy Debugging:**
```typescript
// Can add breakpoints anywhere
debugger;  // Pause here

// Can inspect state
console.log('Current state:', JSON.stringify(state, null, 2));

// Can test agents independently
const result = await searcherAgent.execute(mockContext);
```

3. **Full Control:**
```typescript
// Custom error handling
try {
  await searcherAgent.execute(context);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Wait and retry
    await sleep(60000);
    await searcherAgent.execute(context);
  } else {
    throw error;
  }
}
```

4. **Simple State Management:**
```typescript
// Just save to database
await ResearchJob.update(
  { 
    status: 'IN_PROGRESS',
    agent_orchestration_state: {
      currentAgent: 'Analyst',
      searchResults: searchResult.data,
    }
  },
  { where: { id: jobId } }
);
```

#### When to Add Framework Later

**Use LangGraph when:**
- Complex branching: "If X, do A, else do B"
- Parallel execution: Run 3 analysts simultaneously
- Dynamic agent selection: Choose agent based on results
- Cycles: Agent A → B → back to A (with safeguards)

**Example where framework helps:**
```typescript
// Complex flow that's tedious to code manually
if (searchResult.sourceCount < 5) {
  // Not enough data - try different search strategy
  searchResult = await searcherAgent.execute({ strategy: 'aggressive' });
}

if (searchResult.hasCompetitorData) {
  // Run competitive analysis
  competitiveAnalysis = await competitiveAgent.execute();
} else {
  // Run market analysis instead
  marketAnalysis = await marketAgent.execute();
}

// Parallel analysis
const [bugs, opportunities, threats] = await Promise.all([
  bugAnalyst.execute(),
  opportunityAnalyst.execute(),
  threatAnalyst.execute(),
]);

// LangGraph makes this declarative instead of imperative
```

#### Manual Orchestration Template

```typescript
// src/agents/orchestrator/manual-orchestrator.service.ts

@Injectable()
export class ManualOrchestrator {
  async executeResearch(orgId: string): Promise<string> {
    // 1. Initialize
    const job = await this.createJob(orgId);
    const context = await this.loadContext(orgId);
    const state = { job, context, results: {} };
    
    try {
      // 2. Searcher
      state.results.search = await this.runAgent(
        'Searcher',
        () => this.searcherAgent.execute(context)
      );
      await this.saveState(job.id, state);
      
      // 3. Analyst
      state.results.analysis = await this.runAgent(
        'Analyst',
        () => this.analystAgent.execute({
          context,
          searchResults: state.results.search
        })
      );
      await this.saveState(job.id, state);
      
      // 4. Writer
      state.results.report = await this.runAgent(
        'Writer',
        () => this.writerAgent.execute({
          context,
          analysis: state.results.analysis
        })
      );
      await this.saveState(job.id, state);
      
      // 5. Complete
      await this.completeJob(job.id);
      return job.id;
      
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }
  
  private async runAgent(
    name: string,
    fn: () => Promise<any>
  ): Promise<any> {
    console.log(`🤖 Running ${name} Agent...`);
    const start = Date.now();
    
    const result = await fn();
    
    const duration = Date.now() - start;
    console.log(`✅ ${name} completed in ${duration}ms`);
    
    return result;
  }
  
  private async saveState(jobId: string, state: any): Promise<void> {
    await ResearchJob.update(
      { agent_orchestration_state: state },
      { where: { id: jobId } }
    );
  }
}
```

---

### 6. Cost & Performance Considerations

#### LLM Token Costs (2026 Pricing)

| Provider | Model | Input $/MTok | Output $/MTok | Free Tier |
|----------|-------|--------------|---------------|-----------|
| Groq | Llama 3.1 70B | $0 | $0 | 14,400 req/day |
| Google | Gemini 1.5 Pro | $0 | $0 | 1M tokens/day |
| Anthropic | Claude 3.5 Sonnet | $3 | $15 | None |
| Anthropic | Claude 3.5 Haiku | $0.25 | $1.25 | None |

**Cost-Optimized Strategy for MVP:**

```typescript
// Searcher: Fast extraction, high volume
const searcherLLM = new Groq({
  model: 'llama-3.1-70b-versatile'  // FREE, fast
});

// Analyst: Complex reasoning, moderate volume
const analystLLM = new GoogleGenerativeAI({
  model: 'gemini-1.5-pro'  // FREE, 1M tokens/day
});

// Writer: Best quality, low volume (once per report)
const writerLLM = new Anthropic({
  model: 'claude-3-5-sonnet'  // PAID, but only 5K tokens/report
});
```

**Estimated Costs per Report:**

```
Searcher (Groq):        FREE
Analyst (Gemini):       FREE
Writer (Claude):        $0.20
Scraping (Firecrawl):   $0.12
-------------------------
Total:                  $0.32 per report

Monthly (100 users × 10 reports):  $320/month
```

#### Scraping Costs

**Firecrawl vs Apify:**

| Service | Pricing | Best For | Cost/Report |
|---------|---------|----------|-------------|
| Firecrawl | $0.50/1K pages | Clean markdown for LLMs | $0.02 (40 pages) |
| Apify | Compute-based | Social media, complex scraping | $0.10 (Reddit/YT) |

**Strategy:**
1. Use Firecrawl for competitor websites, blogs, news (80% of sources)
2. Use Apify for Reddit, YouTube, Twitter (20% of sources)

#### Performance Targets

**MVP Benchmarks:**

```
Total Research Time:       5-10 minutes
├── Searcher Agent:        2-3 min (parallel scraping)
├── Analyst Agent:         2-3 min (batch analysis)
└── Writer Agent:          1-2 min (report generation)

Sources Collected:         30-50 sources
Recommendations:           5-10 strategic recommendations
Report Length:             10-15 pages
```

**How to Achieve:**

1. **Parallel Scraping:**
```typescript
// Don't scrape sequentially!
const sources = await Promise.all(
  urls.map(url => this.firecrawl.scrape(url))
);
```

2. **Batch LLM Calls:**
```typescript
// Analyze multiple opportunities in one prompt
const prompt = `
Analyze these 10 opportunities:
1. ${opp1}
2. ${opp2}
...
`;
```

3. **Use Fast Models for Extraction:**
```typescript
// Groq Llama 3.1 is 10x faster than Claude for simple tasks
```

---

## Summary: Your MVP Architecture

### What You SHOULD Build

✅ **PostgreSQL-only data storage**
- Organizations, users, jobs, sources, recommendations
- Direct queries with org_id filtering
- Full-text search if needed

✅ **Manual agent orchestration**
- Simple service with clear step-by-step flow
- Easy to debug and understand
- Save state after each agent

✅ **3 specialized agents**
- Searcher: Firecrawl + Apify
- Analyst: Gemini 1.5 Pro (free)
- Writer: Claude 3.5 Sonnet (paid)

✅ **Multi-tenancy via org_id**
- Every table has organization_id
- Always filter queries by org
- Guards to prevent cross-org access

### What You Should SKIP for MVP

❌ **Vector database (Pinecone/Qdrant)**
- Add only when you need semantic similarity search
- Not needed for "get my company's data"

❌ **Agent frameworks (LangGraph/CrewAI)**
- Add when orchestration gets complex
- Manual control teaches you how it works

❌ **Complex features**
- Multi-user per org (start with single owner)
- Real-time updates (polling is fine)
- Historical pattern matching (add later)

### What You Can Add Later

⚠️ **Phase 2 Features:**
- Pinecone for "find similar companies"
- LangGraph for complex workflows
- Real-time WebSocket updates
- Multi-user collaboration
- Advanced analytics dashboard

---

## Next Steps

1. **Start with database migration** (simplify organization schema)
2. **Build company context loader** (PostgreSQL-only)
3. **Create manual orchestrator** (simple service)
4. **Implement Searcher agent** (Firecrawl integration)
5. **Test with one organization** (prove isolation works)

Then proceed step-by-step through the implementation phases!
