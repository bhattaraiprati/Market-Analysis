# Searcher Agent - Testing Guide

## Overview

The Searcher Agent has been successfully implemented! It uses:
- **Groq Llama 3.1 70B** - For generating search queries and identifying competitors
- **Firecrawl** - For web scraping competitor websites
- **PostgreSQL** - For storing research data (no vector DB needed for MVP)

## What It Does

1. **Fetches Organization Context** from PostgreSQL
2. **Generates Smart Search Queries** using Groq AI
3. **Identifies Competitors**:
   - Prioritizes domestic competitors (same location as company)
   - Includes international competitors
   - Uses known competitors + discovers new ones
4. **Scrapes Competitor Websites** using Firecrawl
5. **Stores Results** in PostgreSQL for analysis

---

## API Endpoints

### 1. Start Competitor Research

```http
POST /research/start
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "researchType": "COMPETITOR"
}
```

**Response:**
```json
{
  "jobId": "uuid-here",
  "message": "Competitor research started. This may take 5-10 minutes."
}
```

### 2. Check Research Status

```http
GET /research/jobs/:jobId
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "id": "job-uuid",
  "organization_id": "org-uuid",
  "status": "IN_PROGRESS",
  "research_type": "COMPETITOR",
  "agent_orchestration_state": {
    "currentAgent": "Searcher",
    "currentStep": "Searching and scraping competitor sources",
    "startedAt": "2026-07-23T10:00:00.000Z"
  },
  "created_at": "2026-07-23T10:00:00.000Z",
  "updated_at": "2026-07-23T10:00:05.000Z"
}
```

### 3. Get All Jobs for Organization

```http
GET /research/jobs
Authorization: Bearer <your-jwt-token>
```

### 4. Get Scraped Sources

```http
GET /research/jobs/:jobId/sources
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": "source-uuid",
    "research_job_id": "job-uuid",
    "source_type": "COMPETITOR",
    "url": "https://competitor.com",
    "title": "Competitor Company - Homepage",
    "content": "Full scraped content in markdown...",
    "scraped_at": "2026-07-23T10:02:00.000Z",
    "credibility_score": 0.5,
    "metadata": {
      "competitorName": "Competitor A",
      "location": "United States",
      "priority": "international",
      "description": "Leading project management tool"
    }
  }
]
```

---

## Testing Steps

### Prerequisites

1. **You have a registered user and organization**
2. **You have a JWT token** (from `/auth/login`)
3. **Your organization has these fields filled:**
   - name
   - industry
   - location
   - product_or_service
   - target_customers
   - business_goals
   - known_competitors (optional)

### Step 1: Start the Server

```bash
npm run dev
```

### Step 2: Test with cURL

```bash
# 1. Login (if you don't have a token)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Save the token from response
TOKEN="your-jwt-token-here"

# 2. Start competitor research
curl -X POST http://localhost:4000/research/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "researchType": "COMPETITOR"
  }'

# Save the jobId from response
JOB_ID="job-uuid-here"

# 3. Check status (run this multiple times until status is COMPLETED)
curl -X GET "http://localhost:4000/research/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get scraped sources
curl -X GET "http://localhost:4000/research/jobs/$JOB_ID/sources" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Test with Thunder Client / Postman

1. **Import this collection:**

```json
{
  "clientName": "Thunder Client",
  "collectionName": "Market Analysis - Searcher Agent",
  "requests": [
    {
      "name": "Start Competitor Research",
      "method": "POST",
      "url": "http://localhost:4000/research/start",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{token}}" },
        { "name": "Content-Type", "value": "application/json" }
      ],
      "body": {
        "type": "json",
        "raw": "{\n  \"researchType\": \"COMPETITOR\"\n}"
      }
    },
    {
      "name": "Get Job Status",
      "method": "GET",
      "url": "http://localhost:4000/research/jobs/{{jobId}}",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{token}}" }
      ]
    },
    {
      "name": "Get Job Sources",
      "method": "GET",
      "url": "http://localhost:4000/research/jobs/{{jobId}}/sources",
      "headers": [
        { "name": "Authorization", "value": "Bearer {{token}}" }
      ]
    }
  ]
}
```

---

## Expected Flow

### Phase 1: Query Generation (1-2 seconds)
```
🤖 [SearcherAgent] Starting competitor search for organization abc-123
📋 Organization: TechCo (Software Development)
📍 Location: San Francisco, CA
🎯 Known Competitors: Asana, Monday.com
🤖 [SearcherAgent] Generating search queries with Groq Llama 3.1...
✅ [SearcherAgent] Generated 15 search queries
```

### Phase 2: Competitor Identification (2-3 seconds)
```
🤖 [SearcherAgent] Identifying competitor websites...
✅ [SearcherAgent] Identified 12 competitors
```

### Phase 3: Web Scraping (3-8 minutes)
```
🤖 [SearcherAgent] Scraping competitor websites with Firecrawl...
🏠 Scraping 5 domestic competitors (San Francisco, CA)...
✅ Scraped: LocalCompetitor (12,450 chars)
✅ Scraped: StartupX (8,230 chars)
⚠️ Failed to scrape: OldSite - Connection timeout
🌍 Scraping 7 international competitors...
✅ Scraped: Asana (15,670 chars)
✅ Scraped: Monday.com (18,340 chars)
✅ [SearcherAgent] Successfully scraped 10 sources
```

### Phase 4: Storage (1 second)
```
📦 Stored 10 sources for job job-uuid-123
✅ Research job job-uuid-123 completed successfully
```

---

## What the Searcher Agent Returns

```typescript
{
  success: true,
  data: {
    sources: [
      {
        url: "https://competitor.com",
        title: "Competitor Homepage",
        content: "Full markdown content...",
        sourceType: "COMPETITOR",
        metadata: {
          competitorName: "Competitor A",
          location: "San Francisco, CA",
          priority: "domestic", // or "international"
          description: "Brief description"
        },
        scrapedAt: "2026-07-23T10:00:00.000Z"
      }
    ],
    competitors: [
      {
        name: "Competitor A",
        website: "https://competitor.com",
        location: "San Francisco, CA",
        description: "Project management tool",
        priority: "domestic"
      }
    ],
    totalScraped: 10,
    executionTimeMs: 245000
  }
}
```

---

## Database Tables Created

### `research_jobs`
Stores research job metadata and status.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Foreign key to organizations |
| status | VARCHAR(50) | PENDING, IN_PROGRESS, COMPLETED, FAILED |
| research_type | VARCHAR(50) | COMPETITOR, MARKET, CUSTOMER, etc. |
| input_parameters | JSONB | Initial request parameters |
| agent_orchestration_state | JSONB | Current agent state & progress |
| completed_at | TIMESTAMP | When job completed |
| error_message | TEXT | Error if failed |

### `research_sources`
Stores scraped content from competitors.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| research_job_id | UUID | Foreign key to research_jobs |
| source_type | VARCHAR(50) | COMPETITOR, WEBSITE, SOCIAL, etc. |
| url | TEXT | Source URL |
| title | TEXT | Page title |
| content | TEXT | Full scraped content (markdown) |
| scraped_at | TIMESTAMP | When scraped |
| credibility_score | FLOAT | 0.0 - 1.0 |
| metadata | JSONB | Additional data (competitor info, etc.) |

---

## Troubleshooting

### 1. Error: "Organization not found"
- Make sure your user is a member of an organization
- Check `/auth/profile` to verify organization membership

### 2. Error: "Groq API key invalid"
- Verify `GROQ_API_KEY` in `.env`
- Test: https://console.groq.com/keys

### 3. Error: "Firecrawl failed"
- Verify `Firecrawl_API_KEY` in `.env`
- Test: https://firecrawl.dev/app/api-keys
- Check if competitor website is accessible

### 4. Job stays "IN_PROGRESS" forever
- Check server logs for errors
- Searcher agent runs asynchronously
- Look for error_message in job data

### 5. No sources returned
- Check if competitors have valid websites
- Firecrawl may fail on:
  - Sites with anti-scraping protection
  - Sites requiring authentication
  - Invalid URLs

---

## Next Steps

After the Searcher Agent completes:

1. **Analyst Agent** (Next to build)
   - Reads scraped sources
   - Identifies opportunities & gaps
   - Generates strategic recommendations

2. **Writer Agent**
   - Synthesizes analysis into report
   - Adds citations
   - Generates PDF

3. **Full Orchestration**
   - Chain all 3 agents
   - Searcher → Analyst → Writer
   - End-to-end report generation

---

## Performance Expectations

**For typical SaaS company with 10 competitors:**

| Phase | Time | Tokens | Cost |
|-------|------|--------|------|
| Query Generation | 1-2s | ~500 | $0 (Groq free) |
| Competitor ID | 2-3s | ~800 | $0 (Groq free) |
| Web Scraping | 3-5min | 0 | ~$0.05 (Firecrawl) |
| **Total** | **3-5min** | **~1,300** | **~$0.05** |

**Rate Limits:**
- Groq: 14,400 requests/day (plenty)
- Firecrawl: Depends on plan (Free: 500 credits)

---

## Code Structure

```
src/
├── agents/
│   ├── base/
│   │   ├── agent.types.ts      # Shared types
│   │   └── base.agent.ts       # Base agent class
│   └── searcher/
│       ├── searcher.agent.ts   # Main Searcher implementation
│       └── searcher.module.ts  # NestJS module
├── company-context/
│   ├── company-context.service.ts  # Loads org data
│   └── company-context.module.ts
├── models/
│   ├── research-job.model.ts
│   └── research-source.model.ts
└── research/
    ├── research.controller.ts  # API endpoints
    ├── research.service.ts     # Orchestration
    └── research.module.ts
```

---

## Success! ✅

You now have a fully functional Searcher Agent that:
- ✅ Fetches company context from PostgreSQL
- ✅ Generates intelligent search queries with Groq
- ✅ Identifies domestic & international competitors
- ✅ Scrapes competitor websites with Firecrawl
- ✅ Stores structured data for analysis
- ✅ Prioritizes local competitors over international
- ✅ Handles errors gracefully with fallbacks

**Ready to test!** 🚀
