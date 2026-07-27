# SearcherAgent - Complete Explanation 🎓

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Execution Flow](#execution-flow)
4. [Key Technologies](#key-technologies)
5. [Important Logic Explained](#important-logic-explained)
6. [Deep Dive: Each Method](#deep-dive-each-method)
7. [Design Patterns Used](#design-patterns-used)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Performance Optimizations](#performance-optimizations)
10. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Overview

### What is SearcherAgent?
The **SearcherAgent** is a specialized agent that automatically finds and scrapes competitor information from the web. It's the **first agent** in your multi-agent competitive intelligence pipeline.

### Primary Goal
**Input**: Your company information (name, industry, location, known competitors)  
**Output**: Rich, structured data about 10-15 competitors (homepages + important deep pages)

### High-Level Process
```
User Company Info → SearcherAgent → Competitor Data
                    ↓
                [3 External APIs]
                1. PostgreSQL (company data)
                2. Groq API (AI query generation)
                3. Firecrawl API (web scraping)
```

---

## System Architecture

### Class Hierarchy
```
BaseAgent (Abstract)
    ↓
SearcherAgent (Concrete Implementation)
```

### Dependencies
```typescript
@Injectable()
export class SearcherAgent extends BaseAgent<SearcherResult> {
  private readonly groq: Groq;              // AI for query generation
  private readonly firecrawl: FirecrawlApp; // Web scraping
  
  constructor(
    private readonly companyContextService: CompanyContextService // DB access
  ) { }
}
```

### Key Interfaces
```typescript
// Input to the agent
interface AgentContext {
  organizationId: string;      // Your company's ID
  researchJobId: string;       // Tracking ID for this job
  companyContext: string;      // Formatted company description
  userId?: string;
  additionalParams?: any;
}

// Output from the agent
interface SearcherResult {
  sources: ScrapedSource[];    // All scraped pages
  competitors: CompetitorInfo[]; // Competitor list
  totalScraped: number;        // Count of pages
  executionTimeMs: number;     // Performance metric
}

// Individual scraped page
interface ScrapedSource {
  url: string;                 // Page URL
  title: string;               // Page title
  content: string;             // Markdown content
  sourceType: SourceType.COMPETITOR;
  metadata: {
    competitorName: string;
    location: string;
    priority: 'domestic' | 'international';
    pageType: 'homepage' | 'pricing' | 'limits' | ...;
  };
  scrapedAt: Date;
}
```

---

## Execution Flow

### The Main Pipeline (execute() method)

```
┌─────────────────────────────────────────────┐
│  1. LOAD COMPANY DATA (PostgreSQL)         │
│     ↓                                       │
│     Get organization details from DB       │
│     Extract: name, industry, location      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  2. GENERATE SEARCH QUERIES (Groq AI)      │
│     ↓                                       │
│     Use AI to create 15 smart queries      │
│     e.g., "digital payment Nepal"          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  3. IDENTIFY COMPETITORS (Groq AI)         │
│     ↓                                       │
│     Use AI to find 10-15 competitors       │
│     Extract: name, website, location       │
│     Sort: domestic first, then int'l       │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  4. SCRAPE HOMEPAGES (Firecrawl)           │
│     ↓                                       │
│     Scrape each competitor's homepage      │
│     Batch processing: 3 at a time          │
│     Rate limiting: 2s between batches      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  5. ENRICH WITH DEEP PAGES (Firecrawl)     │  ← NEW!
│     ↓                                       │
│     For each homepage:                     │
│       - Extract candidate URLs             │
│       - Score by importance                │
│       - Scrape top 5-7 pages               │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  6. RETURN RESULTS                         │
│     ↓                                       │
│     Combined: homepages + deep pages       │
│     Total: ~8-15 sources per competitor    │
└─────────────────────────────────────────────┘
```

### Detailed Step Breakdown

#### Step 1: Load Company Data
```typescript
const orgData = await this.companyContextService.getKeyInfo(
  context.organizationId,
);
// Returns: { name, industry, location, knownCompetitors }
```

**Why?** Need context to generate relevant search queries and identify competitors.

---

#### Step 2: Generate Search Queries (AI-Powered)
```typescript
const searchQueries = await this.generateCompetitorSearchQueries(
  context.companyContext,
  orgData,
);
// Returns: 15 search queries with priority scores
```

**How it works:**
1. Constructs a detailed prompt with company context
2. Sends to Groq AI (Llama 3.3 70B model)
3. AI generates 15 search queries optimized for finding competitors
4. Queries are categorized by priority (high/medium/low)

**Example Output:**
```json
[
  {
    "query": "digital payment platforms Nepal",
    "type": "competitor",
    "priority": "high",
    "region": "domestic"
  },
  {
    "query": "mobile wallet services Asia",
    "type": "competitor",
    "priority": "medium",
    "region": "international"
  }
]
```

**Important Logic:**
- Uses **temperature 0.6** (controlled creativity)
- **Fallback mechanism**: If AI fails, uses hardcoded queries
- **JSON extraction**: Regex to find JSON in AI response

---

#### Step 3: Identify Competitors (AI-Powered)
```typescript
const competitors = await this.identifyCompetitors(orgData, context.companyContext);
// Returns: 10-15 competitors with websites
```

**How it works:**
1. AI analyzes company context + known competitors
2. Generates list of 10-15 competitors with:
   - Name
   - Website URL
   - Location
   - Description
   - Priority (domestic/international)

**Important Logic:**
- **Prioritizes domestic competitors** (same country as your company)
- **Sorts results**: domestic first, international second
- **Fallback mechanism**: Uses known competitors if AI fails
- **Includes competitor websites** (critical for scraping)

**Example Output:**
```json
[
  {
    "name": "Khalti",
    "website": "https://khalti.com",
    "location": "Nepal",
    "description": "Digital payment service in Nepal",
    "priority": "domestic"
  },
  {
    "name": "PayPal",
    "website": "https://paypal.com",
    "location": "United States",
    "description": "Global online payment system",
    "priority": "international"
  }
]
```

---

#### Step 4: Scrape Homepages (Web Scraping)
```typescript
const homepageSources = await this.scrapeCompetitorSources(competitors, orgData);
// Returns: Array of ScrapedSource (homepage content)
```

**How it works:**
1. Separates domestic vs international competitors
2. Scrapes domestic first (higher priority)
3. Uses **batch processing** to avoid rate limits
4. Converts HTML to clean markdown

**Batch Processing Logic:**
```typescript
const batchSize = 3; // Scrape 3 at a time
for (let i = 0; i < competitors.length; i += batchSize) {
  const batch = competitors.slice(i, i + batchSize);
  
  // Scrape all 3 in parallel
  const results = await Promise.allSettled(
    batch.map(competitor => scrapeWebsite(competitor))
  );
  
  // Wait 2 seconds before next batch
  await this.sleep(2000);
}
```

**Why batch processing?**
- Prevents API rate limiting
- Balances speed vs API costs
- Allows graceful failure (one failed scrape doesn't stop others)

**Firecrawl Configuration:**
```typescript
await this.firecrawl.scrapeUrl(url, {
  formats: ['markdown'],      // Output as markdown (clean, structured)
  onlyMainContent: true,      // Skip headers, footers, ads
  waitFor: 2000,              // Wait 2s for JS to load
});
```

---

#### Step 5: Enrich with Deep Pages (NEW FEATURE)
```typescript
const allSources = await this.enrichWithDeepPages(homepageSources, competitors);
// Returns: homepages + deep pages (pricing, about, etc.)
```

**This is the most complex part!** Let me break it down:

##### 5a. Extract Candidate URLs
```typescript
const candidateUrls = this.extractCandidateUrls(
  homepageSource.content,  // Markdown content
  baseUrl                  // e.g., https://khalti.com
);
```

**What it does:**
- Scans markdown content for links: `[text](url)`
- Extracts direct URLs: `https://...`
- Converts relative URLs to absolute: `/pricing` → `https://khalti.com/pricing`
- Filters out:
  - External links (different domain)
  - Anchor links (#section)
  - Homepage itself
  - Excluded patterns (login, privacy, etc.)

**Example:**
```markdown
Homepage content:
[Pricing](/pricing)
[About Us](https://khalti.com/about)
[Login](https://khalti.com/login)  ← Excluded
[Privacy](/privacy)                 ← Excluded

Candidate URLs extracted:
1. https://khalti.com/pricing
2. https://khalti.com/about
```

##### 5b. Score and Select Priority URLs
```typescript
const priorityUrls = this.scoreAndSelectPriorityUrls(candidateUrls, baseUrl);
// Returns: Top 7 URLs by importance score
```

**Scoring Algorithm:**
```typescript
// Each URL gets a score based on keywords in the URL

High Priority (100-80 points):
- /pricing, /plans, /charges → 100 points
- /transaction-limit, /limits → 95 points
- /about-us, /company → 90 points
- /business, /enterprise, /payment-gateway → 85 points

Medium Priority (70-50 points):
- /features, /products → 70 points
- /faq, /help, /support → 65 points
- /api, /developers → 55 points

Low Priority (40-20 points):
- /blog, /news → 40 points
- /partners → 30 points

Bonus:
- Shorter URLs get +10 points (/pricing > /help/pricing/guide)
```

**Example Scoring:**
```
URL: https://khalti.com/pricing
Match: /pricing → 100 points
Depth: 1 level → +10 bonus
Total: 110 points ✅ Selected

URL: https://khalti.com/blog/post-123
Match: /blog → 40 points
Depth: 2 levels → +0 bonus
Total: 40 points ⚠️ Low priority

URL: https://khalti.com/login
Match: excluded pattern
Total: 0 points ❌ Rejected
```

**After scoring, select top 7:**
```typescript
return scoredUrls
  .sort((a, b) => b.score - a.score)  // Highest score first
  .filter(item => item.score > 0)     // Must have positive score
  .slice(0, 7)                         // Take top 7
  .map(item => item.url);
```

##### 5c. Scrape Deep Pages
```typescript
const deepPageSources = await this.scrapeDeepPages(priorityUrls, competitor);
```

**Batch Processing (again):**
```typescript
const batchSize = 2; // Scrape 2 pages at a time
for (let i = 0; i < urls.length; i += batchSize) {
  const batch = urls.slice(i, i + batchSize);
  
  // Scrape batch in parallel
  await Promise.allSettled(
    batch.map(url => this.safeScrape(url, competitor))
  );
  
  // Wait 1 second between batches
  await this.sleep(1000);
}
```

##### 5d. Safe Scraping with Retry
```typescript
private async safeScrape(url, competitor, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Attempt to scrape
      const result = await this.firecrawl.scrapeUrl(url, { ... });
      
      // Validate content quality
      if (result.markdown.length < 200) {
        return null; // Too short, likely error page
      }
      
      // Detect page type
      const pageType = this.detectPageType(url);
      
      return {
        url,
        title: result.metadata?.title,
        content: result.markdown,
        metadata: {
          competitorName: competitor.name,
          pageType, // 'pricing', 'about', 'limits', etc.
        },
        scrapedAt: new Date(),
      };
      
    } catch (error) {
      if (attempt === retries) {
        return null; // Give up after 3 attempts
      }
      // Exponential backoff: wait 1s, 2s, 3s
      await this.sleep(1000 * (attempt + 1));
    }
  }
}
```

**Why retry logic?**
- Network issues are common
- Websites might temporarily block requests
- Exponential backoff reduces load on target site

---

## Key Technologies

### 1. **Groq API (Llama 3.3 70B)**
**Purpose**: AI-powered query generation and competitor identification

**Why Groq?**
- ⚡ **Ultra-fast inference** (10x faster than OpenAI)
- 💰 **Cost-effective** (cheaper than GPT-4)
- 🧠 **Llama 3.3 70B** is powerful enough for structured JSON output

**Configuration:**
```typescript
this.groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

await this.groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.6,  // Balance between creativity and consistency
  max_tokens: 2000,  // Limit response length
});
```

**Temperature explained:**
- `0.0`: Very deterministic (same output every time)
- `0.6`: Balanced (used here) - consistent but not robotic
- `1.0`: Very creative (unpredictable output)

---

### 2. **Firecrawl API**
**Purpose**: Convert websites to clean markdown

**Why Firecrawl?**
- 🎯 **Extracts main content only** (no ads, headers, footers)
- 📝 **Markdown output** (easy to parse and analyze)
- 🤖 **Handles JavaScript** (waits for dynamic content to load)
- 🛡️ **Built-in anti-bot bypass** (uses real browsers)

**Configuration:**
```typescript
this.firecrawl = new FirecrawlApp({
  apiKey: process.env.Firecrawl_API_KEY,
});

await this.firecrawl.scrapeUrl(url, {
  formats: ['markdown'],     // Clean, structured output
  onlyMainContent: true,     // Skip navigation, ads, etc.
  waitFor: 2000,             // Wait 2s for JS to render
});
```

**Output Example:**
```markdown
# Khalti - Digital Payment Nepal

## Features
- Wallet to wallet transfer
- Bill payments
- QR code payments

## Pricing
| Service | Fee |
|---------|-----|
| Transfer | Free |
| Bill Pay | Rs 10 |
```

---

### 3. **PostgreSQL + Sequelize ORM**
**Purpose**: Store and retrieve organization data

**Why Sequelize?**
- 🏗️ **Type-safe** (works well with TypeScript)
- 🔄 **Migrations** (version control for database schema)
- 🔍 **Easy queries** (no raw SQL needed)

**Organization Model:**
```typescript
@Table({ tableName: 'organizations' })
export class Organization extends Model {
  @Column name: string;
  @Column industry: string;
  @Column location: string;
  @Column({ type: DataType.ARRAY(DataType.STRING) })
  known_competitors: string[];
  // ... more fields
}
```

---

## Important Logic Explained

### 1. **Promise.allSettled() vs Promise.all()**

**Your code uses `Promise.allSettled()`:**
```typescript
const results = await Promise.allSettled(
  batch.map(competitor => scrapeWebsite(competitor))
);
```

**Why not `Promise.all()`?**

| Scenario | Promise.all() | Promise.allSettled() |
|----------|---------------|---------------------|
| All succeed | ✅ Returns all | ✅ Returns all |
| One fails | ❌ **Throws error, loses all data** | ✅ **Returns mix of success/failure** |
| Continues after error | ❌ No | ✅ Yes |

**Example:**
```typescript
// Promise.all - ONE failure ruins everything
const results = await Promise.all([
  scrape('khalti.com'),     // Success
  scrape('broken.com'),     // FAILS ❌
  scrape('esewa.com'),      // Never runs!
]);
// ERROR! All data lost!

// Promise.allSettled - Graceful failure
const results = await Promise.allSettled([
  scrape('khalti.com'),     // Success ✅
  scrape('broken.com'),     // FAILS, but doesn't stop others
  scrape('esewa.com'),      // Success ✅
]);
// Result: [success, failed, success]
// You get 2 out of 3! 🎉
```

---

### 2. **Regex for JSON Extraction**

**Your code:**
```typescript
const jsonMatch = content.match(/\[[\s\S]*\]/);
```

**What does `[\s\S]*` mean?**
- `\s` = whitespace (space, tab, newline)
- `\S` = non-whitespace (any character)
- `[\s\S]*` = **any character, including newlines** (greedy match)

**Why not just `.*`?**
- `.` doesn't match newlines in JavaScript
- `[\s\S]` is a hack to match "everything, including newlines"

**Example:**
```javascript
const response = `
Here are the competitors:
[
  {"name": "Khalti"},
  {"name": "eSewa"}
]
Hope this helps!
`;

// Extract just the JSON array
const json = response.match(/\[[\s\S]*\]/)[0];
// Result: '[{"name": "Khalti"},{"name": "eSewa"}]'
```

---

### 3. **URL Normalization**

**Your code:**
```typescript
private normalizeUrl(url: string): string {
  const parsed = new URL(url);
  let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  normalized = normalized.replace(/\/$/, '');        // Remove trailing slash
  normalized = normalized.replace(/^https?:\/\/www\./, 'https://'); // Remove www
  return normalized.toLowerCase();
}
```

**Why normalize?**
Compare these URLs:
```
https://khalti.com/
https://khalti.com
https://www.khalti.com
https://Khalti.com
HTTPS://KHALTI.COM/
```

All are the **same website**, but string comparison says they're different!

**After normalization:**
```
https://khalti.com  ← All become this
```

**Use case in your code:**
```typescript
const normalizedUrl = this.normalizeUrl(url);
const normalizedBase = this.normalizeUrl(baseUrl);

// Now comparison works correctly
if (normalizedUrl === normalizedBase) {
  // Skip homepage
}
```

---

### 4. **Exponential Backoff**

**Your retry logic:**
```typescript
for (let attempt = 0; attempt <= retries; attempt++) {
  try {
    return await this.firecrawl.scrapeUrl(url);
  } catch (error) {
    await this.sleep(1000 * (attempt + 1));
  }
}
```

**Wait times:**
- Attempt 0: Immediate
- Attempt 1: Wait 1 second (1000 * 1)
- Attempt 2: Wait 2 seconds (1000 * 2)
- Attempt 3: Wait 3 seconds (1000 * 3)

**Why exponential backoff?**
- If server is overloaded, waiting longer gives it time to recover
- Standard practice for API retries
- Prevents "thundering herd" problem (all clients retrying at once)

---

### 5. **Relative to Absolute URL Conversion**

**Your code:**
```typescript
private resolveUrl(url: string, baseUrl: string): string | null {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url; // Already absolute
  }
  
  const base = new URL(baseUrl);
  const resolved = new URL(url, base);
  return resolved.href;
}
```

**Example conversions:**
```javascript
baseUrl = 'https://khalti.com/about'

resolveUrl('/pricing', baseUrl)
// → 'https://khalti.com/pricing'

resolveUrl('../contact', baseUrl)
// → 'https://khalti.com/contact'

resolveUrl('team', baseUrl)
// → 'https://khalti.com/team'

resolveUrl('https://esewa.com', baseUrl)
// → 'https://esewa.com' (already absolute)
```

**The magic:**
```typescript
new URL(relativeUrl, baseUrl)
```
This is built into JavaScript! Handles all edge cases correctly.

---

## Design Patterns Used

### 1. **Template Method Pattern**
```typescript
abstract class BaseAgent {
  abstract execute(context): Promise<Result>;
}

class SearcherAgent extends BaseAgent {
  execute(context) {
    // Specific implementation
  }
}
```

**Benefit**: All agents follow the same interface, making them interchangeable.

---

### 2. **Dependency Injection**
```typescript
constructor(
  private readonly companyContextService: CompanyContextService
) { }
```

**Benefit**: 
- Easy to test (can inject mock service)
- Loose coupling (agent doesn't create its own dependencies)
- NestJS automatically provides the service

---

### 3. **Strategy Pattern** (Fallback Mechanism)
```typescript
try {
  return await this.groq.chat.completions.create({ ... });
} catch (error) {
  return this.getFallbackQueries(orgData); // Alternative strategy
}
```

**Benefit**: System never fully fails; always has a backup plan.

---

### 4. **Builder Pattern** (Result Construction)
```typescript
return this.createSuccessResult<SearcherResult>(
  {
    sources: allSources,
    competitors,
    totalScraped: allSources.length,
    executionTimeMs,
  },
  {
    queriesGenerated: searchQueries.length,
    competitorsFound: competitors.length,
  },
);
```

**Benefit**: Consistent result structure across all agents.

---

## Error Handling Strategy

### Levels of Error Handling

#### Level 1: Method-Level Try-Catch
```typescript
private async scrapeWebsite(competitor) {
  try {
    return await this.firecrawl.scrapeUrl(competitor.website);
  } catch (error) {
    this.logger.error(`Failed to scrape ${competitor.name}`);
    return null; // Graceful failure
  }
}
```

#### Level 2: Batch-Level Promise.allSettled
```typescript
const results = await Promise.allSettled(
  batch.map(competitor => this.scrapeWebsite(competitor))
);
// Some succeed, some fail - both are OK
```

#### Level 3: Agent-Level Try-Catch
```typescript
async execute(context) {
  try {
    // Main logic
  } catch (error) {
    return this.createErrorResult(error); // Top-level catch-all
  }
}
```

### Error Propagation Strategy
```
Individual scrape fails
  ↓ (catches error, returns null)
Batch continues
  ↓ (filters out nulls)
Agent continues
  ↓ (partial results returned)
User gets some data (better than nothing!)
```

---

## Performance Optimizations

### 1. **Batch Processing**
```typescript
// BAD: Scrape one at a time (slow!)
for (const competitor of competitors) {
  await scrape(competitor); // 10 competitors × 3s = 30s
}

// GOOD: Scrape 3 at a time (fast!)
for (let i = 0; i < competitors.length; i += 3) {
  await Promise.all([
    scrape(competitors[i]),
    scrape(competitors[i + 1]),
    scrape(competitors[i + 2]),
  ]); // 10 competitors ÷ 3 × 3s = 10s
}
```

**3x faster!** ⚡

---

### 2. **Rate Limiting**
```typescript
await this.sleep(2000); // Wait between batches
```

**Why?**
- Prevents API rate limit errors (HTTP 429)
- Avoids IP blocking
- More reliable than making 100 requests at once

---

### 3. **Early Validation**
```typescript
if (result.markdown.length < 200) {
  return null; // Skip immediately, don't waste time processing
}
```

**Why?**
- Avoids processing garbage data
- Saves memory
- Faster overall execution

---

### 4. **Priority-Based Processing**
```typescript
// Scrape domestic competitors first
const domesticSources = await this.scrapeCompetitors(domesticCompetitors);

// Then international
const intlSources = await this.scrapeCompetitors(internationalCompetitors);
```

**Why?**
- Most relevant data collected first
- If system fails mid-way, you still have the important stuff
- Better user experience (shows progress)

---

## Common Pitfalls & Solutions

### Pitfall 1: Not Handling URL Edge Cases
```typescript
// BAD
if (url.includes('login')) { // Misses 'signin', 'log-in'
  skip();
}

// GOOD
if (/\b(login|signin|sign[- ]in)\b/i.test(url)) {
  skip();
}
```

### Pitfall 2: Losing Data on Error
```typescript
// BAD
const results = await Promise.all([...]); // One error = lose all

// GOOD
const results = await Promise.allSettled([...]); // Get partial results
```

### Pitfall 3: Infinite Loops
```typescript
// BAD
while (hasMore) {
  await fetch(); // What if hasMore never becomes false?
}

// GOOD
const MAX_PAGES = 7;
for (let i = 0; i < MAX_PAGES && hasMore; i++) {
  await fetch();
}
```

### Pitfall 4: Memory Leaks
```typescript
// BAD
const allUrls = new Set();
// Keep adding URLs forever...

// GOOD
const candidateUrls = this.extractUrls(content);
const topUrls = candidateUrls.slice(0, 7); // Limit size
```

---

## Summary: Key Takeaways 🎯

### What the SearcherAgent Does
1. ✅ Loads your company data from database
2. ✅ Uses AI to generate smart search queries
3. ✅ Uses AI to identify 10-15 competitors
4. ✅ Scrapes all competitor homepages
5. ✅ **NEW**: Scrapes 5-7 important deep pages per competitor
6. ✅ Returns rich, structured data for analysis

### Important Concepts
- **Batch Processing**: Scrape multiple pages in parallel (faster)
- **Rate Limiting**: Wait between batches (avoid API blocks)
- **Graceful Failure**: Keep going even if some scrapes fail
- **Priority Scoring**: Focus on important pages (pricing, about, etc.)
- **Retry Logic**: Try 3 times with increasing delays

### Technologies Used
- **Groq API**: Fast AI for query generation (Llama 3.3 70B)
- **Firecrawl**: Convert websites to clean markdown
- **PostgreSQL**: Store company and competitor data
- **NestJS**: Dependency injection, logging, error handling

### Design Patterns
- **Template Method**: BaseAgent → SearcherAgent
- **Dependency Injection**: Services injected via constructor
- **Strategy Pattern**: Fallback mechanisms when AI fails
- **Builder Pattern**: Consistent result structure

### Performance
- **Speed**: ~2 minutes for 10 competitors (80 pages total)
- **Reliability**: Continues even if 20% of scrapes fail
- **Quality**: Prioritizes important pages over random links

---

## What's Next?

Now that SearcherAgent has collected competitor data, the next agents in your pipeline are:

1. **AnalystAgent**: Analyzes the scraped content
2. **WriterAgent**: Generates reports and insights

The SearcherAgent's output (`ScrapedSource[]`) becomes the input to these agents!

---

🎉 **You now understand how the SearcherAgent works!**

Questions to ask yourself to test your understanding:
1. Why does the agent use `Promise.allSettled()` instead of `Promise.all()`?
2. How does the priority scoring algorithm work?
3. What happens if Groq API fails?
4. Why is batch processing important?
5. How does URL normalization help?

If you can answer these, you've mastered it! 🚀
