# AnalystAgent - The Brain of Your Competitive Intelligence System 🧠

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Execution Flow](#execution-flow)
4. [Core Analysis Components](#core-analysis-components)
5. [AI Prompting Strategy](#ai-prompting-strategy)
6. [Data Structures](#data-structures)
7. [How It Works: Deep Dive](#how-it-works-deep-dive)
8. [Integration with SearcherAgent](#integration-with-searcheragent)
9. [Output Examples](#output-examples)
10. [Testing & Usage](#testing--usage)

---

## Overview

### What is AnalystAgent?

The **AnalystAgent** is the **brain** of your competitive intelligence system. While SearcherAgent collects data, AnalystAgent **understands** it and generates **actionable insights**.

### Primary Role

**Input**: Scraped competitor data (homepages, pricing pages, about pages, etc.)  
**Output**: Strategic analysis with gaps, recommendations, and market insights

### Key Capabilities

1. 🔍 **Deep Competitor Analysis** - Analyze each competitor's strengths, weaknesses, features, pricing
2. 📊 **Gap Detection** - Identify where your company falls behind
3. 💡 **Strategic Recommendations** - Generate prioritized action items
4. 🎯 **Market Positioning** - Understand your place in the competitive landscape
5. 📝 **Executive Summary** - Distill everything into actionable insights

---

## System Architecture

### The Analysis Pipeline

```
SearcherAgent Output (80+ pages)
        ↓
    AnalystAgent
        ↓
    [5 Analysis Phases]
        ↓
1. Individual Competitor Analysis (per competitor)
2. Gap Analysis (cross-competitor)
3. Strategic Recommendations (actionable)
4. Market Position (landscape view)
5. Executive Summary (C-suite ready)
        ↓
    Structured JSON Output
```

### Class Structure

```typescript
BaseAgent (Abstract)
    ↓
AnalystAgent extends BaseAgent<AnalystResult>
    ↓
Dependencies:
    - Groq API (AI reasoning)
    - CompanyContextService (your company data)
```

---

## Execution Flow

### Main Pipeline (execute() method)

```
┌──────────────────────────────────────────┐
│  1. LOAD COMPANY DATA                    │
│     ↓                                    │
│     Get your company info from DB       │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  2. GET SCRAPED DATA                     │
│     ↓                                    │
│     Receive sources from SearcherAgent   │
│     Group by competitor                  │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  3. ANALYZE EACH COMPETITOR              │
│     ↓                                    │
│     For each competitor:                 │
│       - Combine all scraped pages        │
│       - Send to AI for deep analysis     │
│       - Extract structured insights      │
│     Batch processing: 3 at a time        │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  4. PERFORM GAP ANALYSIS                 │
│     ↓                                    │
│     Compare ALL competitors vs you       │
│     Identify missing features            │
│     Prioritize by impact                 │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  5. GENERATE RECOMMENDATIONS             │
│     ↓                                    │
│     Based on gaps + business goals       │
│     Prioritized action items             │
│     With expected impact                 │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  6. ANALYZE MARKET POSITION              │
│     ↓                                    │
│     Your position in landscape           │
│     Opportunities & threats              │
│     Market trends                        │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│  7. GENERATE EXECUTIVE SUMMARY           │
│     ↓                                    │
│     Synthesize everything                │
│     C-suite friendly format              │
│     Top 5 key insights                   │
└──────────────────────────────────────────┘
                ↓
           JSON OUTPUT
```

---

## Core Analysis Components

### 1. Individual Competitor Analysis

**What it analyzes:**
- ✅ Strengths (what they do well)
- ❌ Weaknesses (where they fall short)
- 🎯 Key Features (their product capabilities)
- 💰 Pricing Model (how they charge)
- 👥 Target Market (who they serve)
- 🌟 Unique Selling Points (what makes them different)
- 📊 Market Position (leader/challenger/follower/niche)
- ⚠️ Threat Level (high/medium/low)

**Example Output:**
```json
{
  "competitorName": "Khalti",
  "location": "Nepal",
  "priority": "domestic",
  "strengths": [
    "10M+ user base with strong local presence",
    "Integrated with 200K+ merchants nationwide",
    "Handles 10M+ monthly transactions reliably",
    "Merged with IME Pay for broader ecosystem"
  ],
  "weaknesses": [
    "Limited international presence",
    "Complex fee structure compared to competitors",
    "Mobile-first approach may limit desktop users"
  ],
  "keyFeatures": [
    "Wallet-to-wallet transfers",
    "Bill payments (utilities, telecom, internet)",
    "QR code payments for merchants",
    "Travel booking (flights, hotels, buses)",
    "Financial services (insurance, investments)",
    "Remittance support"
  ],
  "pricingModel": {
    "model": "transaction-based",
    "details": "Free wallet transfers, small fees on bill payments (Rs 10), merchant fees vary",
    "competitiveness": "similar"
  },
  "targetMarket": [
    "Nepali consumers (urban and rural)",
    "Small to medium businesses",
    "Merchants and vendors",
    "Remittance receivers"
  ],
  "uniqueSellingPoints": [
    "First unified payment platform after merger",
    "Deepest merchant network in Nepal",
    "One-stop financial services hub",
    "Local customer support in Nepali"
  ],
  "marketPosition": "leader",
  "threatLevel": "high"
}
```

---

### 2. Gap Analysis

**What it identifies:**

| Category | Description | Example |
|----------|-------------|---------|
| **Feature Gap** | Features competitors have that you lack | "Competitors offer QR code payments, you don't" |
| **Pricing Gap** | Pricing advantages they have | "Competitors offer freemium tier, you're fully paid" |
| **Market Gap** | Market segments they serve better | "Competitors serve enterprise, you're SMB-focused" |
| **Technology Gap** | Technical capabilities they have | "Competitors have mobile app, you're web-only" |
| **Service Gap** | Service quality differences | "Competitors have 24/7 support, you have business hours" |

**Example Output:**
```json
{
  "category": "feature",
  "gapTitle": "Mobile App Ecosystem Gap",
  "description": "Top competitors (Khalti, eSewa, IME Pay) all have mature mobile apps with 1M+ downloads, offering seamless payment experiences. Your company currently lacks a mobile presence, limiting accessibility for mobile-first users in Nepal.",
  "competitorsDoingWell": ["Khalti", "eSewa", "IME Pay"],
  "yourCompanyStatus": "missing",
  "impact": "high",
  "recommendation": "Develop a mobile app with core payment features as a priority. Start with Android (dominant in Nepal) before iOS. Focus on offline capabilities and low data usage for rural users."
}
```

---

### 3. Strategic Recommendations

**What it generates:**

- **Prioritized** (critical → high → medium → low)
- **Categorized** (differentiation, pricing, features, marketing, expansion)
- **Actionable** (specific steps, not vague advice)
- **Time-bound** (immediate, short-term, mid-term, long-term)
- **Impact-driven** (with expected business outcomes)

**Example Output:**
```json
{
  "priority": "critical",
  "category": "differentiation",
  "title": "Develop Unique Value Proposition for Underserved Markets",
  "rationale": "Analysis shows all major competitors (Khalti, eSewa) focus on urban markets. Rural and semi-urban Nepal (60% of population) remains underserved with limited digital payment adoption. This is a blue ocean opportunity.",
  "actionItems": [
    "Partner with rural cooperatives and microfinance institutions",
    "Develop offline-first mobile app with SMS fallback",
    "Create vernacular language interfaces (Nepali, Maithili, Bhojpuri)",
    "Implement agent banking model for cash-in/cash-out",
    "Launch financial literacy program in rural areas"
  ],
  "expectedImpact": "Capture 5-10% of underserved market (3-6M users) within 18 months. Establish first-mover advantage in rural fintech. Create defensible moat through community relationships.",
  "timeframe": "short-term"
}
```

---

### 4. Market Position Analysis

**What it reveals:**

- **Your Position**: Where you stand vs competitors
- **Competitive Landscape**: Who's who in the market
- **Market Trends**: What's changing in the industry
- **Opportunities**: Untapped potential
- **Threats**: What could hurt you

**Example Output:**
```json
{
  "yourPosition": "You are a challenger player in the Nepali digital payment market, positioned behind market leaders Khalti and eSewa. While you have solid technology and a growing user base, you lack the market penetration and merchant network of the top 2 players. Your strength lies in flexibility and potential to target underserved niches.",
  
  "competitiveLandscape": "The market is dominated by 3 major players (Khalti, eSewa, IME Pay) who collectively control 80% market share. Khalti leads with 10M+ users after merging with IME Pay. The market is consolidating, with smaller players struggling to compete. International players (PayPal, Stripe) are not yet localized for Nepal, creating a protected domestic market.",
  
  "marketTrends": [
    "Rapid mobile wallet adoption (50% YoY growth)",
    "Government push for cashless economy",
    "QR code payments becoming standard",
    "Integration of payments with lifestyle services (travel, entertainment)",
    "Rise of merchant solutions and B2B payments",
    "Regulatory focus on consumer protection and KYC"
  ],
  
  "opportunities": [
    "Rural and semi-urban markets (60% of population) underserved",
    "Enterprise payment solutions (B2B) relatively untapped",
    "Remittance market (Nepal receives $8B+ annually)",
    "Cross-border payments with India (major trade partner)",
    "Niche vertical markets (agriculture, tourism, education)",
    "Value-added services (lending, insurance, investments)"
  ],
  
  "threats": [
    "Market consolidation (mergers like Khalti-IME Pay)",
    "Network effects favor existing leaders",
    "High customer acquisition costs",
    "Regulatory changes (transaction limits, KYC requirements)",
    "Potential entry of international giants (Google Pay, PayPal)",
    "Price wars eroding margins"
  ]
}
```

---

### 5. Executive Summary

**What it includes:**

- **2-3 paragraph summary** of entire analysis
- **Top 5 key insights** (bullet points)
- **C-suite friendly** (no technical jargon)
- **Action-oriented** (focuses on "what to do")

**Example Output:**
```json
{
  "executiveSummary": "Your company operates in a rapidly growing but increasingly consolidated Nepali digital payment market. Analysis of 10 competitors reveals that while you have solid technology, you're positioned as a challenger behind market leaders Khalti (10M+ users) and eSewa. The most critical finding is a significant feature gap in mobile capabilities—all top competitors have mature mobile apps while you lack mobile presence, putting you at a severe disadvantage in a mobile-first market.\n\nHowever, the analysis reveals three high-potential opportunities: (1) Rural markets remain underserved by all major players, (2) Enterprise B2B payments are underdeveloped, and (3) The remittance corridor represents $8B+ in annual transactions. Your immediate priorities should be: developing a mobile app (critical), targeting underserved rural markets (high ROI), and building out merchant payment solutions (competitive necessity).\n\nThe competitive landscape is tightening with recent consolidation (Khalti-IME Pay merger), making speed of execution critical. You have a 12-18 month window to establish a defensible position before the market fully consolidates. Focus on differentiation through underserved segments rather than competing head-to-head with entrenched leaders.",
  
  "keyInsights": [
    "Mobile App Gap: All top competitors have mobile apps with 1M+ downloads. Your lack of mobile presence is the #1 competitive disadvantage in a mobile-first market.",
    
    "Rural Blue Ocean: 60% of Nepal's population in rural/semi-urban areas is underserved by all major players, representing a 30M+ addressable market with low competition.",
    
    "Market Consolidation Risk: Recent Khalti-IME Pay merger signals industry consolidation. Acting quickly is essential before the window closes.",
    
    "Merchant Network is Critical: Leaders have 100K-200K merchants. Building a strong merchant network is table stakes for growth—you need partnerships or aggressive merchant acquisition.",
    
    "Regulatory Advantage Window: Current NRB regulations favor domestic players over international ones. This protected market won't last forever—capitalize now before global giants enter."
  ]
}
```

---

## AI Prompting Strategy

### Why Groq + Llama 3.3 70B?

| Factor | Why It Matters |
|--------|----------------|
| **Speed** | 10x faster than GPT-4 → Real-time analysis |
| **Cost** | ~5x cheaper than GPT-4 → Scalable |
| **Reasoning** | 70B parameters → Strong analytical capabilities |
| **JSON Output** | Reliable structured output → Easy to parse |
| **Context Window** | 32K tokens → Can analyze long documents |

---

### Prompt Engineering Principles Used

#### 1. **Role-Based System Messages**
```typescript
{
  role: 'system',
  content: 'You are a competitive intelligence expert. Return only valid JSON objects.'
}
```

**Why?** Sets the AI's persona and output format expectations.

---

#### 2. **Structured Output Format**
Every prompt includes:
```
Return ONLY a JSON object in this EXACT format:
{
  "field1": "type",
  "field2": ["array"],
  ...
}
```

**Why?** Forces consistent, parseable output. No free-form text.

---

#### 3. **Context Layering**
```
YOUR COMPANY CONTEXT:
[Your company details]

COMPETITOR DATA:
[Competitor information]

TASK:
[What to analyze]

OUTPUT FORMAT:
[JSON schema]
```

**Why?** AI needs context before task. Order matters!

---

#### 4. **Specificity Over Generalization**
```
BAD:  "Analyze the competitor"
GOOD: "Identify strengths, weaknesses, key features, pricing model,
       target market, USPs, market position, and threat level"
```

**Why?** Specific requests → Specific answers.

---

#### 5. **Temperature Tuning**

| Analysis Type | Temperature | Reasoning |
|---------------|-------------|-----------|
| Competitor Analysis | 0.4 | Need consistent, factual output |
| Gap Analysis | 0.5 | Balance facts with insights |
| Recommendations | 0.6 | Want creative but grounded ideas |
| Executive Summary | 0.6 | Need engaging but accurate prose |

**Lower temperature** = More deterministic, factual  
**Higher temperature** = More creative, varied

---

#### 6. **Content Truncation**
```typescript
const maxLength = 15000; // ~4000 tokens
const truncatedContent = content.length > maxLength
  ? content.substring(0, maxLength) + '\n\n[Content truncated...]'
  : content;
```

**Why?** Groq has token limits. Must fit within context window.

---

#### 7. **JSON Extraction with Regex**
```typescript
const jsonMatch = content.match(/\{[\s\S]*\}/);
const result = JSON.parse(jsonMatch[0]);
```

**Why?** AI sometimes adds extra text. Regex extracts just the JSON.

---

## Data Structures

### Input Structure

```typescript
interface AgentContext {
  organizationId: string;
  researchJobId: string;
  companyContext: string;
  
  additionalParams: {
    sources: ScrapedSource[];      // From SearcherAgent
    competitors: CompetitorInfo[]; // From SearcherAgent
  };
}
```

---

### Output Structure

```typescript
interface AnalystResult {
  // Individual analyses
  competitorAnalyses: CompetitorAnalysis[]; // One per competitor
  
  // Cross-competitor insights
  gapAnalysis: GapAnalysis[];               // 5-8 gaps
  strategicRecommendations: StrategicRecommendation[]; // 6-10 recommendations
  marketPosition: MarketPosition;           // Single object
  
  // Summary
  executiveSummary: string;                 // 2-3 paragraphs
  keyInsights: string[];                    // Top 5 insights
  
  // Metadata
  totalCompetitorsAnalyzed: number;
  totalSourcesAnalyzed: number;
  executionTimeMs: number;
}
```

---

## How It Works: Deep Dive

### Phase 1: Group Sources by Competitor

```typescript
private groupSourcesByCompetitor(
  sources: ScrapedSource[]
): Map<string, ScrapedSource[]> {
  const grouped = new Map<string, ScrapedSource[]>();
  
  for (const source of sources) {
    const competitorName = source.metadata?.competitorName;
    if (!grouped.has(competitorName)) {
      grouped.set(competitorName, []);
    }
    grouped.get(competitorName)!.push(source);
  }
  
  return grouped;
}
```

**Why?** Need to analyze all pages for each competitor together.

**Example:**
```
Input: [
  { url: 'khalti.com', competitorName: 'Khalti' },
  { url: 'khalti.com/pricing', competitorName: 'Khalti' },
  { url: 'esewa.com', competitorName: 'eSewa' },
  { url: 'esewa.com/about', competitorName: 'eSewa' },
]

Output: Map {
  'Khalti' => [{ url: 'khalti.com' }, { url: 'khalti.com/pricing' }],
  'eSewa' => [{ url: 'esewa.com' }, { url: 'esewa.com/about' }]
}
```

---

### Phase 2: Analyze Each Competitor

```typescript
private async analyzeCompetitor(
  competitorName: string,
  sources: ScrapedSource[],
  competitor: CompetitorInfo,
  companyContext: string
): Promise<CompetitorAnalysis> {
  // 1. Combine all pages into one document
  const combinedContent = this.combineSourceContent(sources);
  
  // 2. Truncate if too long
  const truncatedContent = combinedContent.length > 15000
    ? combinedContent.substring(0, 15000) + '\n[Truncated...]'
    : combinedContent;
  
  // 3. Build AI prompt
  const prompt = `
    YOUR COMPANY: ${companyContext}
    COMPETITOR: ${competitorName}
    CONTENT: ${truncatedContent}
    
    Analyze and return JSON: { strengths, weaknesses, ... }
  `;
  
  // 4. Send to Groq
  const response = await this.groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a competitive analyst...' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4
  });
  
  // 5. Extract JSON
  const json = response.choices[0].message.content.match(/\{[\s\S]*\}/)[0];
  return JSON.parse(json);
}
```

**Why batch processing?**
```typescript
// Process 3 competitors at a time
const batchSize = 3;
for (let i = 0; i < competitors.length; i += batchSize) {
  const batch = competitors.slice(i, i + batchSize);
  await Promise.allSettled(batch.map(analyzeCompetitor));
  await this.sleep(2000); // Rate limiting
}
```

**Benefits:**
- Faster (parallel processing)
- Respects rate limits
- Graceful failure (some succeed even if others fail)

---

### Phase 3: Gap Analysis

**How it works:**

1. **Aggregate** all competitor features and strengths
2. **Send to AI** with your company context
3. **AI identifies** what competitors have that you don't
4. **Categorize** gaps (feature, pricing, market, technology, service)
5. **Prioritize** by impact (high, medium, low)

**Key Logic:**
```typescript
// Collect all competitor capabilities
const allFeatures = new Set<string>();
const allStrengths = new Set<string>();

competitorAnalyses.forEach((analysis) => {
  analysis.keyFeatures.forEach((f) => allFeatures.add(f));
  analysis.strengths.forEach((s) => allStrengths.add(s));
});

// AI analyzes: "What does this list have that YOUR company doesn't?"
const prompt = `
  YOUR COMPANY: ${companyContext}
  COMPETITOR CAPABILITIES: ${Array.from(allFeatures).join(', ')}
  
  Identify 5-8 gaps where YOUR company falls behind.
`;
```

---

### Phase 4: Generate Recommendations

**How it works:**

1. Takes **gaps** + **business goals** + **competitor analyses**
2. AI generates **actionable recommendations**
3. Each recommendation has:
   - Priority level
   - Category
   - Rationale (why)
   - Action items (how)
   - Expected impact (result)
   - Timeframe (when)

**Smart prompting:**
```typescript
const prompt = `
  YOUR COMPANY: ${companyContext}
  YOUR GOALS: ${orgData.business_goals}
  YOUR CHALLENGES: ${orgData.current_challenges}
  
  IDENTIFIED GAPS:
  - Gap 1: Description (high impact)
  - Gap 2: Description (medium impact)
  
  TOP COMPETITORS:
  - Competitor A (leader, high threat)
  - Competitor B (challenger, medium threat)
  
  Generate 6-10 strategic recommendations that are:
  - Specific and actionable (not vague)
  - Prioritized by impact
  - Realistic to implement
  - Data-driven based on competitor analysis
`;
```

**Output is immediately actionable!**

---

### Phase 5: Market Position Analysis

**What it does:**

Synthesizes everything into a **big picture view**:
- Where YOU stand in the market
- Who the key players are
- What trends are shaping the industry
- What opportunities exist
- What threats to watch for

**Why it matters:**
C-suite executives need the **forest view**, not just individual trees.

---

### Phase 6: Executive Summary

**The grand synthesis:**

Takes all previous analyses and distills into:
1. **2-3 paragraph summary** (the story)
2. **Top 5 key insights** (the takeaways)

**Prompt engineering:**
```typescript
const prompt = `
  COMPANY: ${orgData.name}
  COMPETITORS ANALYZED: ${competitorAnalyses.length}
  MARKET POSITION: ${marketPosition.yourPosition}
  
  CRITICAL GAPS: [list]
  TOP RECOMMENDATIONS: [list]
  OPPORTUNITIES: [list]
  THREATS: [list]
  
  Create an executive summary that:
  - Tells a clear story
  - Focuses on what matters most
  - Is action-oriented
  - Uses no jargon
  - Fits on one page
`;
```

---

## Integration with SearcherAgent

### How Data Flows

```
User triggers research
        ↓
ResearchService orchestrates
        ↓
┌─────────────────────────────┐
│  SearcherAgent.execute()    │
│  ↓                          │
│  Returns: {                 │
│    sources: [...],          │  ← 80+ scraped pages
│    competitors: [...]       │  ← 10-15 competitors
│  }                          │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  AnalystAgent.execute()     │
│  ↓                          │
│  Input: sources + competitors│
│  ↓                          │
│  Returns: {                 │
│    competitorAnalyses,      │
│    gapAnalysis,             │
│    recommendations,         │
│    marketPosition,          │
│    executiveSummary         │
│  }                          │
└─────────────────────────────┘
        ↓
Save to database / Return to user
```

### Orchestration Code (ResearchService)

```typescript
// 1. Run SearcherAgent
const searcherResult = await this.searcherAgent.execute(context);

// 2. Pass results to AnalystAgent
const analystContext = {
  ...context,
  additionalParams: {
    sources: searcherResult.data.sources,
    competitors: searcherResult.data.competitors,
  },
};

// 3. Run AnalystAgent
const analystResult = await this.analystAgent.execute(analystContext);

// 4. Save results
await this.saveAnalysis(analystResult);
```

---

## Output Examples

### Complete Output Structure

```json
{
  "competitorAnalyses": [
    {
      "competitorName": "Khalti",
      "location": "Nepal",
      "priority": "domestic",
      "strengths": ["10M+ users", "200K+ merchants", "..."],
      "weaknesses": ["Limited international", "..."],
      "keyFeatures": ["Wallet transfers", "Bill payments", "..."],
      "pricingModel": {
        "model": "transaction-based",
        "details": "Free transfers, Rs 10 bill payments",
        "competitiveness": "similar"
      },
      "targetMarket": ["Nepali consumers", "SMBs", "..."],
      "uniqueSellingPoints": ["First unified platform", "..."],
      "marketPosition": "leader",
      "threatLevel": "high",
      "analyzedPages": ["khalti.com", "khalti.com/pricing", "..."]
    }
    // ... 9 more competitors
  ],
  
  "gapAnalysis": [
    {
      "category": "feature",
      "gapTitle": "Mobile App Ecosystem Gap",
      "description": "All top competitors have mobile apps...",
      "competitorsDoingWell": ["Khalti", "eSewa", "IME Pay"],
      "yourCompanyStatus": "missing",
      "impact": "high",
      "recommendation": "Develop Android app as priority..."
    }
    // ... 4-7 more gaps
  ],
  
  "strategicRecommendations": [
    {
      "priority": "critical",
      "category": "differentiation",
      "title": "Target Underserved Rural Markets",
      "rationale": "60% of Nepal's population underserved...",
      "actionItems": [
        "Partner with rural cooperatives",
        "Develop offline-first app",
        "Create vernacular interfaces"
      ],
      "expectedImpact": "Capture 5-10% of underserved market...",
      "timeframe": "short-term"
    }
    // ... 5-9 more recommendations
  ],
  
  "marketPosition": {
    "yourPosition": "Challenger player behind leaders...",
    "competitiveLandscape": "Dominated by 3 major players...",
    "marketTrends": ["Mobile wallet growth", "QR payments", "..."],
    "opportunities": ["Rural markets", "B2B payments", "..."],
    "threats": ["Market consolidation", "Network effects", "..."]
  },
  
  "executiveSummary": "Your company operates in a rapidly growing...",
  
  "keyInsights": [
    "Mobile App Gap: Critical competitive disadvantage...",
    "Rural Blue Ocean: 30M+ addressable market...",
    "Market Consolidation Risk: 12-18 month window...",
    "Merchant Network Critical: Need 100K+ merchants...",
    "Regulatory Advantage: Protected market for now..."
  ],
  
  "totalCompetitorsAnalyzed": 10,
  "totalSourcesAnalyzed": 87,
  "executionTimeMs": 45230
}
```

---

## Testing & Usage

### Running the Analyst

```typescript
// In your ResearchService or controller

import { AnalystAgent } from './agents/analyst/analyst.agent';

@Injectable()
export class ResearchService {
  constructor(
    private readonly searcherAgent: SearcherAgent,
    private readonly analystAgent: AnalystAgent,
  ) {}
  
  async runCompetitiveAnalysis(organizationId: string) {
    // 1. Scrape competitors
    const searcherResult = await this.searcherAgent.execute({
      organizationId,
      researchJobId: 'job-123',
      companyContext: await this.loadCompanyContext(organizationId),
    });
    
    // 2. Analyze scraped data
    const analystResult = await this.analystAgent.execute({
      organizationId,
      researchJobId: 'job-123',
      companyContext: await this.loadCompanyContext(organizationId),
      additionalParams: {
        sources: searcherResult.data.sources,
        competitors: searcherResult.data.competitors,
      },
    });
    
    return analystResult.data;
  }
}
```

---

### API Endpoint

```typescript
@Controller('research')
export class ResearchController {
  @Post('analyze')
  async analyze(@Body() body: { organizationId: string }) {
    const result = await this.researchService.runCompetitiveAnalysis(
      body.organizationId
    );
    
    return {
      success: true,
      data: result,
    };
  }
}
```

---

### Testing

```bash
# Start server
npm run start:dev

# Trigger analysis
curl -X POST http://localhost:3000/research/analyze \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-id"}'

# Expected response
{
  "success": true,
  "data": {
    "competitorAnalyses": [...],
    "gapAnalysis": [...],
    "strategicRecommendations": [...],
    "marketPosition": {...},
    "executiveSummary": "...",
    "keyInsights": [...]
  }
}
```

---

## Performance Characteristics

### Time Estimates (10 competitors)

| Phase | Time | API Calls |
|-------|------|-----------|
| Individual Analysis | ~30s | 10 (batched 3 at a time) |
| Gap Analysis | ~5s | 1 |
| Recommendations | ~8s | 1 |
| Market Position | ~5s | 1 |
| Executive Summary | ~5s | 1 |
| **Total** | **~53s** | **14 calls** |

### Cost Estimates (Groq API)

- **Per analysis**: ~$0.10 (14 API calls)
- **Per competitor**: ~$0.01
- **Highly cost-effective!** 💰

---

## Key Takeaways 🎯

### What AnalystAgent Does
1. ✅ Analyzes each competitor deeply (strengths, weaknesses, features, pricing)
2. ✅ Identifies gaps where you fall behind
3. ✅ Generates prioritized strategic recommendations
4. ✅ Maps your market position
5. ✅ Synthesizes everything into executive summary

### Why It's Powerful
- **Multi-document reasoning**: Analyzes 80+ pages per research job
- **Structured output**: Clean JSON, ready to display/store
- **Action-oriented**: Not just insights, but what to DO about them
- **Context-aware**: Uses YOUR company's goals and challenges
- **Fast & cheap**: 53 seconds, ~$0.10 per analysis

### Technology Stack
- **Groq API**: Ultra-fast AI inference
- **Llama 3.3 70B**: Strong reasoning capabilities
- **NestJS**: Dependency injection, error handling
- **TypeScript**: Type-safe data structures

### Design Patterns
- **Template Method**: Extends BaseAgent
- **Strategy Pattern**: Different analysis strategies per phase
- **Builder Pattern**: Structured result construction
- **Batch Processing**: 3 competitors at a time

---

## What's Next?

Now that you have **AnalystAgent** generating insights, the next step is:

**WriterAgent**: Takes the analysis and generates polished reports (PDF, markdown, presentations)

The pipeline becomes:
```
SearcherAgent → AnalystAgent → WriterAgent → Deliverable Report
```

🎉 **You now have the brain of your competitive intelligence system!**

Let me know when you're ready to build the WriterAgent! 🚀
