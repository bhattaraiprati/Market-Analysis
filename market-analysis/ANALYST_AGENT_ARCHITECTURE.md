# AnalystAgent Architecture & Flow Diagrams 📐

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER REQUEST                            │
│            "Analyze my competitors"                         │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  RESEARCH SERVICE                           │
│              (Orchestrates Agents)                          │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
          ┌───────────────┴───────────────┐
          ↓                               ↓
┌──────────────────┐            ┌──────────────────┐
│ SEARCHER AGENT   │            │  ANALYST AGENT   │
│                  │            │                  │
│ • Find competitors│           │ • Analyze data   │
│ • Scrape websites│  ──────→  │ • Find gaps      │
│ • Extract content│            │ • Recommend      │
│                  │            │ • Summarize      │
└──────────────────┘            └──────────────────┘
          ↓                               ↓
┌──────────────────┐            ┌──────────────────┐
│ 80+ Web Pages    │            │ Structured       │
│ • Homepages      │            │ Intelligence     │
│ • Pricing pages  │            │ • Analyses       │
│ • About pages    │            │ • Gaps           │
│ • Feature pages  │            │ • Recommendations│
└──────────────────┘            └──────────────────┘
```

---

## AnalystAgent Internal Flow

```
INPUT: Scraped Sources (80+ pages)
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: Group Sources by Competitor                   │
│                                                         │
│  80 sources → Map {                                     │
│    "Khalti" => [homepage, pricing, about, features...] │
│    "eSewa"  => [homepage, pricing, about, features...] │
│    ...                                                  │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: Analyze Each Competitor (Batched)             │
│                                                         │
│  For each competitor:                                   │
│    1. Combine all pages into one document              │
│    2. Truncate if > 15,000 chars                       │
│    3. Send to Groq AI with prompt                      │
│    4. Extract JSON response                            │
│    5. Return structured analysis                       │
│                                                         │
│  Batch size: 3 competitors at a time                   │
│  Rate limit: 2s between batches                        │
│                                                         │
│  Output: CompetitorAnalysis[]                          │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: Gap Analysis                                   │
│                                                         │
│  1. Aggregate all competitor features                   │
│  2. Aggregate all competitor strengths                  │
│  3. Send to AI: "What do they have that we don't?"     │
│  4. Categorize gaps (feature, pricing, market, tech)   │
│  5. Prioritize by impact (high, medium, low)           │
│                                                         │
│  Output: GapAnalysis[] (5-8 gaps)                      │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 4: Strategic Recommendations                      │
│                                                         │
│  Input:                                                 │
│    - Identified gaps                                    │
│    - Your business goals                                │
│    - Your current challenges                            │
│    - Competitor analyses                                │
│                                                         │
│  AI Task: Generate actionable recommendations           │
│                                                         │
│  Output: StrategicRecommendation[] (6-10 actions)      │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 5: Market Position Analysis                      │
│                                                         │
│  AI Task: Synthesize competitive landscape              │
│                                                         │
│  Output: MarketPosition {                               │
│    yourPosition,                                        │
│    competitiveLandscape,                                │
│    marketTrends,                                        │
│    opportunities,                                       │
│    threats                                              │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 6: Executive Summary                              │
│                                                         │
│  Input: Everything from above phases                    │
│                                                         │
│  AI Task: Distill into:                                 │
│    - 2-3 paragraph summary                              │
│    - Top 5 key insights                                 │
│                                                         │
│  Output: { executiveSummary, keyInsights }             │
└─────────────────────────────────────────────────────────┘
   ↓
OUTPUT: Complete AnalystResult
```

---

## AI Interaction Flow

```
┌──────────────────┐
│  AnalystAgent    │
└────────┬─────────┘
         ↓
         │ 1. Build Prompt
         │    - System message (role)
         │    - User message (task + context)
         │    - Output format (JSON schema)
         ↓
┌────────────────────────────────────┐
│         Groq API                   │
│    (Llama 3.3 70B Model)          │
│                                    │
│  Processes:                        │
│  • Company context                 │
│  • Competitor data (15K chars)     │
│  • Analysis instructions           │
│                                    │
│  Returns:                          │
│  • Structured JSON                 │
│  • ~1000-2000 tokens               │
│  • ~2-5 seconds response           │
└────────────────────────────────────┘
         ↓
         │ 2. Extract JSON
         │    - Regex: /\{[\s\S]*\}/
         │    - Parse JSON
         │    - Validate structure
         ↓
┌──────────────────┐
│  Parsed Result   │
│  (Typed Object)  │
└──────────────────┘
```

---

## Data Transformation Pipeline

```
RAW SCRAPED DATA
├─ Homepage HTML → Markdown (1500 chars)
├─ Pricing HTML → Markdown (800 chars)
├─ About HTML → Markdown (1200 chars)
├─ Features HTML → Markdown (2000 chars)
└─ ... (5-8 pages per competitor)
   ↓
COMBINED CONTENT
"--- HOMEPAGE: Khalti ---
Nepal's #1 Payment Platform...

--- PRICING: Khalti Service Charges ---
Wallet to wallet: Free
Bill payments: Rs 10...

--- ABOUT: About Us ---
Khalti merged with IME Pay..."
(~8000 chars total)
   ↓
TRUNCATED (if needed)
First 15,000 chars + "[Content truncated...]"
   ↓
AI ANALYSIS
{
  "strengths": [...],
  "weaknesses": [...],
  "keyFeatures": [...],
  "pricingModel": {...},
  ...
}
   ↓
STRUCTURED OBJECT
CompetitorAnalysis {
  competitorName: "Khalti",
  strengths: ["10M+ users", "..."],
  ...
}
```

---

## Batching Strategy

```
10 Competitors to Analyze
   ↓
Split into batches of 3
   ↓
┌──────────────────────────────────────┐
│ BATCH 1: [Khalti, eSewa, IME Pay]   │
│                                      │
│ Promise.allSettled([                │
│   analyzeCompetitor("Khalti"),      │
│   analyzeCompetitor("eSewa"),       │
│   analyzeCompetitor("IME Pay")      │
│ ])                                   │
│                                      │
│ Time: ~8s (parallel)                 │
└──────────────────────────────────────┘
   ↓ (wait 2s)
┌──────────────────────────────────────┐
│ BATCH 2: [Fonepay, ConnectIPS, ...]│
│                                      │
│ Promise.allSettled([...])           │
│                                      │
│ Time: ~8s (parallel)                 │
└──────────────────────────────────────┘
   ↓ (wait 2s)
┌──────────────────────────────────────┐
│ BATCH 3: [PrabhuPay, NamastePay, ...]│
│                                      │
│ Promise.allSettled([...])           │
│                                      │
│ Time: ~8s (parallel)                 │
└──────────────────────────────────────┘
   ↓ (wait 2s)
┌──────────────────────────────────────┐
│ BATCH 4: [Competitor10]             │
│                                      │
│ Promise.allSettled([...])           │
│                                      │
│ Time: ~8s                            │
└──────────────────────────────────────┘
   ↓
Total time: ~36s (vs 80s sequential!)
```

---

## Error Handling Strategy

```
┌─────────────────────────────┐
│ API Call to Groq            │
└──────────┬──────────────────┘
           ↓
    ┌──────────────┐
    │  Success?    │
    └──┬──────┬────┘
       │ YES  │ NO
       ↓      ↓
   ┌───────┐ ┌──────────────────┐
   │Parse  │ │ Log Error         │
   │JSON   │ │ Return null       │
   └───┬───┘ │ Continue to next  │
       ↓     └──────────────────┘
   ┌────────────┐
   │ Valid JSON?│
   └──┬──────┬──┘
      │ YES  │ NO
      ↓      ↓
   ┌──────┐ ┌──────────────┐
   │Return│ │ Log Error    │
   │Result│ │ Return null  │
   └──────┘ └──────────────┘
      ↓
   ┌──────────────────────────┐
   │ Filter out nulls         │
   │ Continue with successes  │
   └──────────────────────────┘
```

---

## Prompt Construction Pattern

```
┌─────────────────────────────────────────────┐
│              PROMPT STRUCTURE               │
└─────────────────────────────────────────────┘

1. CONTEXT SETTING
   ┌─────────────────────────────────────┐
   │ YOUR COMPANY CONTEXT:               │
   │ [Formatted company description]     │
   │                                     │
   │ COMPETITOR NAME: Khalti             │
   │ COMPETITOR LOCATION: Nepal          │
   └─────────────────────────────────────┘

2. DATA INPUT
   ┌─────────────────────────────────────┐
   │ COMPETITOR'S WEB CONTENT:           │
   │ [Combined markdown from all pages]  │
   └─────────────────────────────────────┘

3. TASK INSTRUCTIONS
   ┌─────────────────────────────────────┐
   │ Analyze this competitor and:        │
   │ • Identify strengths (what they do well)│
   │ • Identify weaknesses (where they lack)│
   │ • Extract key features              │
   │ • Determine pricing model           │
   │ • Identify target market            │
   │ • Find unique selling points        │
   │ • Assess market position            │
   │ • Evaluate threat level             │
   └─────────────────────────────────────┘

4. OUTPUT FORMAT
   ┌─────────────────────────────────────┐
   │ Return ONLY a JSON object:          │
   │ {                                   │
   │   "strengths": ["...", "..."],      │
   │   "weaknesses": ["...", "..."],     │
   │   ...                               │
   │ }                                   │
   └─────────────────────────────────────┘

5. CONSTRAINTS
   ┌─────────────────────────────────────┐
   │ IMPORTANT:                          │
   │ • Be specific and data-driven       │
   │ • Focus on competitive advantages   │
   │ • Use actual information from content│
   │ • Return ONLY valid JSON           │
   └─────────────────────────────────────┘
```

---

## Output Data Flow

```
AnalystAgent.execute()
   ↓
┌─────────────────────────────────────────┐
│         AnalystResult Object            │
├─────────────────────────────────────────┤
│ competitorAnalyses: [                   │
│   {                                     │
│     competitorName: "Khalti",           │
│     strengths: [...],                   │
│     weaknesses: [...],                  │
│     keyFeatures: [...],                 │
│     pricingModel: {...},                │
│     marketPosition: "leader",           │
│     threatLevel: "high"                 │
│   },                                    │
│   ... (9 more)                          │
│ ]                                       │
│                                         │
│ gapAnalysis: [                          │
│   {                                     │
│     category: "feature",                │
│     gapTitle: "Mobile App Gap",         │
│     impact: "high",                     │
│     recommendation: "..."               │
│   },                                    │
│   ... (4-7 more)                        │
│ ]                                       │
│                                         │
│ strategicRecommendations: [             │
│   {                                     │
│     priority: "critical",               │
│     category: "differentiation",        │
│     title: "...",                       │
│     actionItems: [...]                  │
│   },                                    │
│   ... (5-9 more)                        │
│ ]                                       │
│                                         │
│ marketPosition: {                       │
│   yourPosition: "...",                  │
│   competitiveLandscape: "...",          │
│   marketTrends: [...],                  │
│   opportunities: [...],                 │
│   threats: [...]                        │
│ }                                       │
│                                         │
│ executiveSummary: "..."                 │
│ keyInsights: [...]                      │
└─────────────────────────────────────────┘
   ↓
   ├─→ Save to Database
   ├─→ Return to API caller
   ├─→ Send to WriterAgent (next step)
   └─→ Display in Dashboard
```

---

## Integration Architecture

```
┌────────────────────────────────────────────────────┐
│                  APP LAYER                         │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Controller   │→ │ Service      │              │
│  └──────────────┘  └──────┬───────┘              │
└───────────────────────────┼────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────┐
│              AGENT ORCHESTRATION                   │
│  ┌──────────────────────────────────────────┐     │
│  │         ResearchService                  │     │
│  │                                          │     │
│  │  async startResearch() {                 │     │
│  │    // 1. Run SearcherAgent               │     │
│  │    const search = await searcher.execute()│    │
│  │                                          │     │
│  │    // 2. Run AnalystAgent                │     │
│  │    const analysis = await analyst.execute({│   │
│  │      sources: search.sources,            │     │
│  │      competitors: search.competitors     │     │
│  │    })                                    │     │
│  │                                          │     │
│  │    return { search, analysis }           │     │
│  │  }                                       │     │
│  └──────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────┐
│               AGENT LAYER                          │
│  ┌─────────────┐        ┌──────────────┐          │
│  │SearcherAgent│  ───→  │AnalystAgent  │          │
│  └─────────────┘        └──────────────┘          │
└────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────┐
│            EXTERNAL SERVICES                       │
│  ┌────────┐  ┌────────┐  ┌──────────┐             │
│  │Firecrawl│  │  Groq  │  │PostgreSQL│             │
│  └────────┘  └────────┘  └──────────┘             │
└────────────────────────────────────────────────────┘
```

---

## Dependency Graph

```
AnalystAgent
    ├── Groq SDK
    │   └── llama-3.3-70b-versatile
    │
    ├── CompanyContextService
    │   └── PostgreSQL (via Sequelize)
    │       └── Organization Model
    │
    └── BaseAgent (abstract class)
        ├── Logger (NestJS)
        └── Common utilities
```

---

## Time Distribution

```
Total Execution: ~53 seconds

┌─────────────────────────────────────────┐ 30s (57%)
│ Competitor Analysis (batched)           │
│ • 10 competitors ÷ 3 per batch          │
│ • 4 batches × 8s each = 32s             │
│ • Rate limiting: 3 × 2s = 6s            │
│ Total: ~36s                             │
└─────────────────────────────────────────┘

┌─────────────────┐ 5s (9%)
│ Gap Analysis    │
│ • 1 API call    │
└─────────────────┘

┌───────────────────────┐ 8s (15%)
│ Recommendations       │
│ • 1 API call          │
└───────────────────────┘

┌─────────────────────┐ 5s (9%)
│ Market Position     │
│ • 1 API call        │
└─────────────────────┘

┌────────────────────────┐ 5s (9%)
│ Executive Summary      │
│ • 1 API call           │
└────────────────────────┘

Total: 30 + 5 + 8 + 5 + 5 = 53 seconds
```

---

## Memory Usage Pattern

```
Peak Memory: ~150-200 MB

┌─────────────────────────────────────┐
│ Source Data (80 pages × 2KB avg)   │ ~160 KB
├─────────────────────────────────────┤
│ Combined Content per Competitor     │ ~150 KB
├─────────────────────────────────────┤
│ Truncated Content for AI            │ ~15 KB
├─────────────────────────────────────┤
│ AI Responses (JSON)                 │ ~50 KB
├─────────────────────────────────────┤
│ Parsed Objects                      │ ~100 KB
├─────────────────────────────────────┤
│ Final Result Object                 │ ~200 KB
└─────────────────────────────────────┘

Total: ~675 KB of data
Overhead (Node.js, NestJS, etc.): ~150 MB
```

---

## Scaling Considerations

### Current Capacity

| Metric | Value |
|--------|-------|
| Competitors | 10-15 |
| Sources per Competitor | 8-10 |
| Total Sources | 80-150 |
| Time | 45-60s |
| Cost | $0.10-0.15 |

### At Scale (100 competitors)

| Metric | Current | At Scale | Solution |
|--------|---------|----------|----------|
| Time | 53s | ~450s (7.5min) | Parallel agents, caching |
| Cost | $0.10 | $1.00 | Acceptable |
| API Calls | 14 | 104 | Rate limiting needed |
| Memory | 200MB | 500MB | Stream processing |

### Optimization Strategies

1. **Caching**: Cache competitor analyses for 7 days
2. **Incremental**: Only re-analyze changed competitors
3. **Parallel**: Run multiple AnalystAgent instances
4. **Summarization**: Pre-summarize long content before AI
5. **Batching**: Increase batch size to 5-7 (with care)

---

## Summary

The AnalystAgent is a sophisticated multi-phase analysis system that:

✅ **Processes** 80+ web pages in ~53 seconds  
✅ **Generates** structured, actionable intelligence  
✅ **Batches** API calls for efficiency  
✅ **Handles** errors gracefully  
✅ **Produces** C-suite ready insights  

**Architecture Highlights:**
- Clean separation of concerns (6 distinct phases)
- Batch processing for performance
- Graceful error handling at every level
- Type-safe data structures
- Configurable parameters

**Ready for production!** 🚀
