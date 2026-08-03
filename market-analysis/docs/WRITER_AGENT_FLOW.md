# WriterAgent Flow Diagram

## Complete Research Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER REQUEST                                │
│                   POST /api/research/start                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       RESEARCH SERVICE                               │
│                     Creates ResearchJob                              │
│                    Status: PENDING → IN_PROGRESS                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SEARCHER AGENT                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Generate search queries                                     │  │
│  │ 2. Search for competitors (Brave API)                         │  │
│  │ 3. Scrape competitor websites (Firecrawl)                     │  │
│  │ 4. Return ScrapedSource[]                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Output: {                                                           │
│    sources: ScrapedSource[]  (25+ sources)                          │
│    competitors: CompetitorInfo[]  (5 competitors)                   │
│    totalScraped: 25                                                 │
│    executionTimeMs: 180000                                          │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ storeSources()
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                     │
│                   research_sources table                             │
│              Stores 25+ scraped sources                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ANALYST AGENT                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Uses: Claude Sonnet 4.5 via Amazon Bedrock                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Processing Steps:                                                   │
│  1. analyzeCompetitors()      → CompetitorAnalysis[]                │
│  2. performGapAnalysis()       → GapAnalysis[]                      │
│  3. generateRecommendations()  → StrategicRecommendation[]          │
│  4. analyzeMarketPosition()    → MarketPosition                     │
│  5. generateExecutiveSummary() → executiveSummary + keyInsights     │
│                                                                       │
│  Output: AnalystResult {                                             │
│    competitorAnalyses: CompetitorAnalysis[]  (5)                    │
│    gapAnalysis: GapAnalysis[]  (6-8)                                │
│    strategicRecommendations: StrategicRecommendation[]  (8-10)      │
│    marketPosition: MarketPosition                                   │
│    executiveSummary: string                                         │
│    keyInsights: string[]  (5)                                       │
│    totalCompetitorsAnalyzed: 5                                      │
│    totalSourcesAnalyzed: 25                                         │
│    executionTimeMs: 45000                                           │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ storeAnalysis()
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                     │
│              research_jobs.output_results                            │
│         Stores structured analysis results                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WRITER AGENT (NEW)                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Uses: Claude Sonnet 4.5 via Amazon Bedrock                    │  │
│  │ Model: us.anthropic.claude-sonnet-4-5-20250929-v1:0           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Processing Steps:                                                   │
│  1. generateHeader()                     → Markdown header           │
│  2. generateExecutiveSummarySection()    → LLM-enhanced prose       │
│  3. generateKeyInsightsSection()         → Formatted list           │
│  4. generateMarketPositionSection()      → LLM-enhanced narrative   │
│  5. generateCompetitorAnalysisSection()  → Overview + Profiles      │
│  6. generateGapAnalysisSection()         → Overview + Details       │
│  7. generateRecommendationsSection()     → Overview + Actions       │
│  8. generateAppendix()                   → Metadata + Methodology   │
│                                                                       │
│  LLM Calls: 5-7 calls                                                │
│  - Executive Summary (1)                                             │
│  - Market Position (1)                                               │
│  - Competitor Overview (1)                                           │
│  - Gap Analysis Overview (1)                                         │
│  - Recommendations Overview (1)                                      │
│                                                                       │
│  Output: WriterResult {                                              │
│    reportMarkdown: string  (2000-5000 words)                        │
│    reportTitle: "Competitive Intelligence Report - CompanyName"     │
│    generatedAt: Date                                                │
│    wordCount: 3542                                                  │
│    executionTimeMs: 15000                                           │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ storeReport()
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                     │
│              research_jobs.output_results.report                     │
│                   Stores Markdown report                             │
│  {                                                                   │
│    markdown: "# Competitive Intelligence Report...",                │
│    title: "Competitive Intelligence Report - CompanyName",          │
│    generatedAt: "2024-01-15T10:30:00.000Z",                         │
│    wordCount: 3542                                                  │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      JOB COMPLETED                                   │
│  Status: COMPLETED                                                   │
│  completed_at: 2024-01-15T10:30:00.000Z                             │
│                                                                       │
│  agent_orchestration_state: {                                        │
│    currentAgent: 'Completed',                                        │
│    searcherResults: { sourcesFound: 25, ... },                      │
│    analystResults: { competitorsAnalyzed: 5, ... },                 │
│    writerResults: { reportGenerated: true, wordCount: 3542 }        │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       USER ACCESS                                    │
│                                                                       │
│  GET /api/research/jobs/:jobId                                       │
│  → Full job status + results                                         │
│                                                                       │
│  GET /api/research/jobs/:jobId/report                                │
│  → Markdown report download                                          │
│  → Content-Type: text/markdown                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## WriterAgent Internal Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WriterAgent.execute()                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    Validate Input (AnalystResult)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  generateFullReport()                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
   Template-Based            LLM-Enhanced             Template-Based
     Sections                  Sections                  Sections
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│ generateHeader()      │ generateExecutive │        │ generateKey  │
│                │      │ SummarySection()  │        │ InsightsSection()
│ Input: company │      │                   │        │              │
│ name, metadata │      │ LLM Call:         │        │ Input: key   │
│                │      │ - System: writer  │        │ insights[]   │
│ Output: MD     │      │ - User: raw data  │        │              │
│ header         │      │ - Temp: 0.6       │        │ Output: MD   │
│                │      │ - Tokens: 1500    │        │ list         │
└────────────────┘      │                   │        └──────────────┘
                        │ Output: polished  │
                        │ prose (2-3 para)  │
                        └───────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ generateMarket     │
                        │ PositionSection()  │
                        │                    │
                        │ LLM Call:          │
                        │ - System: market   │
                        │   intelligence     │
                        │ - User: position   │
                        │   data, trends     │
                        │ - Temp: 0.5        │
                        │ - Tokens: 2500     │
                        │                    │
                        │ Output: structured │
                        │ narrative with     │
                        │ subsections        │
                        └────────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ generateCompetitor │
                        │ AnalysisSection()  │
                        │                    │
                        │ LLM Call (overview):
                        │ - System: competitive
                        │   intelligence     │
                        │ - User: competitor │
                        │   summary data     │
                        │ - Temp: 0.5        │
                        │ - Tokens: 1000     │
                        │                    │
                        │ Then: Loop through │
                        │ competitors and    │
                        │ format profiles    │
                        │ (template-based)   │
                        │                    │
                        │ Output: overview + │
                        │ detailed profiles  │
                        └────────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ generateGapAnalysis│
                        │ Section()          │
                        │                    │
                        │ LLM Call (overview):
                        │ - System: strategic│
                        │   gap analyst      │
                        │ - User: gap summary│
                        │ - Temp: 0.5        │
                        │ - Tokens: 1000     │
                        │                    │
                        │ Then: Format gaps  │
                        │ by impact level    │
                        │ (template-based)   │
                        │                    │
                        │ Output: overview + │
                        │ gap details        │
                        └────────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ generateRecommend  │
                        │ ationsSection()    │
                        │                    │
                        │ LLM Call (overview):
                        │ - System: strategic│
                        │   advisor          │
                        │ - User: rec summary│
                        │ - Temp: 0.6        │
                        │ - Tokens: 1000     │
                        │                    │
                        │ Then: Format recs  │
                        │ by priority        │
                        │ (template-based)   │
                        │                    │
                        │ Output: overview + │
                        │ action items       │
                        └────────────────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ generateAppendix() │
                        │                    │
                        │ Template-based:    │
                        │ - Data sources     │
                        │ - Methodology      │
                        │ - Competitors list │
                        │ - Disclaimer       │
                        │                    │
                        │ Output: appendix   │
                        │ section            │
                        └────────────────────┘
                                  │
                                  ▼
                    Combine all sections with '---' separator
                                  │
                                  ▼
                    Calculate wordCount & executionTime
                                  │
                                  ▼
                           Return WriterResult
```

## Report Structure

```markdown
# Competitive Intelligence Report
## Company Name

**Report Date:** January 15, 2024
**Competitors Analyzed:** 5
**Data Sources:** 25
**Analysis Type:** Comprehensive Market & Competitive Analysis

---

## Executive Summary
[2-3 paragraphs - LLM-enhanced]
- Market position overview
- Key competitive threats
- Strategic priorities

---

## Key Insights
[Numbered list - Template]
1. **Insight 1**
2. **Insight 2**
3. **Insight 3**
4. **Insight 4**
5. **Insight 5**

---

## Market Position & Competitive Landscape
[LLM-enhanced narrative with subsections]

### Current Position
[2 paragraphs]

### Competitive Landscape
[2 paragraphs]

### Market Trends
- Trend 1
- Trend 2
- Trend 3

### Opportunities
- Opportunity 1
- Opportunity 2
- Opportunity 3

### Threats
- Threat 1
- Threat 2
- Threat 3

---

## Competitor Analysis
[LLM-enhanced overview paragraph]

### Detailed Competitor Profiles
[Template-based profiles]

#### Competitor 1
**Location:** ...
**Market Position:** ...
**Threat Level:** ...
**Strengths:** ...
**Weaknesses:** ...
**Key Features:** ...
**Pricing:** ...
**Target Market:** ...
**Unique Selling Points:** ...

[Repeat for each competitor]

---

## Gap Analysis
[LLM-enhanced overview]

### Critical Gaps (High Impact)
[Template-based gap details]

#### Gap 1
**Category:** ...
**Your Status:** ...
**Description:** ...
**Competitors Excelling:** ...
**Recommendation:** ...

### Medium Impact Gaps
[Similar structure]

---

## Strategic Recommendations
[LLM-enhanced overview]

### Critical Priority
#### Recommendation 1
**Category:** ...
**Timeframe:** ...
**Expected Impact:** ...
**Rationale:** ...
**Action Items:**
- Action 1
- Action 2
- Action 3

### High Priority
[Similar structure]

### Medium Priority
[Similar structure]

---

## Appendix

### Data Sources
- Total Sources: 25
- Analysis Date: ...
- Execution Time: ...

### Methodology
[Description of process]

### Competitors Analyzed
- Competitor 1 (Location)
- Competitor 2 (Location)
- ...

---

*This report was generated by an AI-powered competitive intelligence system.*
*All findings should be validated through additional research and human judgment.*
```

## Bedrock API Call Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                   callClaude(system, user, tokens, temp)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                        Build Request Payload
                        {
                          anthropic_version: 'bedrock-2023-05-31',
                          max_tokens: 1500,
                          temperature: 0.6,
                          system: 'You are a professional writer...',
                          messages: [{
                            role: 'user',
                            content: [{ type: 'text', text: '...' }]
                          }]
                        }
                                  │
                                  ▼
                        Create InvokeModelCommand
                        {
                          modelId: 'us.anthropic.claude-sonnet-4-5-...',
                          contentType: 'application/json',
                          accept: 'application/json',
                          body: JSON.stringify(payload)
                        }
                                  │
                                  ▼
                        Send to Bedrock Runtime
                        await bedrock.send(command)
                                  │
                                  ▼
                        Decode & Parse Response
                        const text = parsed.content?.[0]?.text
                                  │
                                  ▼
                        Return Generated Text
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WriterAgent.execute()                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                            Try Block
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
  No Analyst Result         Bedrock API Error       Section Generation
        │                         │                    Error
        │                         │                         │
        ▼                         ▼                         ▼
  throw Error           retry (future)            graceful fallback
        │                         │                    (section-level)
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
                            Catch Block
                                  │
                                  ▼
                        logError(message, error)
                                  │
                                  ▼
                        createErrorResult(error)
                                  │
                                  ▼
                        Return {
                          success: false,
                          error: error.message
                        }
```

## Timing Diagram

```
Time (seconds)    Agent           Activity
─────────────────────────────────────────────────────────────────────
0                 User            POST /api/research/start
1                 System          Create ResearchJob (PENDING)
2                 System          Update status (IN_PROGRESS)
                                 
2-180            SearcherAgent    ┌─ Generate queries
                                  ├─ Search Brave API
                                  ├─ Scrape with Firecrawl
                                  └─ Return 25 sources
                                 
180              System           storeSources()
181              System           Update orchestration state
                                 
181-226          AnalystAgent     ┌─ Analyze 5 competitors
                                  ├─ Gap analysis
                                  ├─ Recommendations
                                  ├─ Market position
                                  └─ Executive summary
                                 
226              System           storeAnalysis()
227              System           Update orchestration state
                                 
227-242          WriterAgent      ┌─ Generate header
                                  ├─ Executive summary (LLM)
                                  ├─ Key insights
                                  ├─ Market position (LLM)
                                  ├─ Competitor analysis (LLM)
                                  ├─ Gap analysis (LLM)
                                  ├─ Recommendations (LLM)
                                  └─ Appendix
                                 
242              System           storeReport()
243              System           Job COMPLETED
                                 
243+             User             GET /api/research/jobs/:id/report
                                  ↓
                                  Download Markdown report
```

---

**Total Pipeline Time:** ~4 minutes
- SearcherAgent: ~3 minutes
- AnalystAgent: ~45 seconds
- WriterAgent: ~15 seconds
- System overhead: ~3 seconds

**WriterAgent Contribution:** ~6% of total time
**WriterAgent Value:** Professional, shareable report format
