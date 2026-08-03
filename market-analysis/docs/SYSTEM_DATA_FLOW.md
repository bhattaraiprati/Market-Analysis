# System & Data Flow Documentation

## Overview
This document provides a detailed technical flow of how data moves through the AI Persona-based Knowledge Management System, from user input to response delivery.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                          │
│                    (Web Portal, Mobile App, API)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Auth &     │  │   Persona    │  │   Conversation           │  │
│  │   User Mgmt  │  │   Manager    │  │   Orchestrator           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Knowledge   │  │   Query      │  │   Response               │  │
│  │  Base Mgmt   │  │   Processor  │  │   Generator              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          AGENT LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Search     │  │   Analyst    │  │   Writer                 │  │
│  │   Agent      │  │   Agent      │  │   Agent                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA & STORAGE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL  │  │   Vector DB  │  │   Object Storage         │  │
│  │  (Primary)   │  │  (Pinecone/  │  │   (S3/MinIO)             │  │
│  │              │  │   Weaviate)  │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │    Redis     │  │   Message    │                                 │
│  │   (Cache)    │  │   Queue      │                                 │
│  │              │  │  (RabbitMQ)  │                                 │
│  └──────────────┘  └──────────────┘                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   LLM API    │  │  Web Search  │  │   Email/Notifications    │  │
│  │  (Claude)    │  │  (Firecrawl) │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Data Flows

## Flow 1: Organization & User Onboarding

```
┌──────────────┐
│ User submits │
│ org details  │
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│ API Gateway            │
│ - Validate input       │
│ - Check duplicates     │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Auth Service           │
│ - Hash password        │
│ - Generate tokens      │
│ - Create session       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ PostgreSQL Write       │
│ - organizations table  │
│ - users table          │
│ - org_members table    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Event Queue            │
│ - Publish              │
│   'org.created' event  │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Async Workers          │
│ - Send welcome email   │
│ - Setup defaults       │
│ - Initialize quota     │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│ Response to User       │
│ - Auth tokens          │
│ - Org details          │
└────────────────────────┘
```

**Data Stored**:
- PostgreSQL: Organization profile, user credentials, role assignments
- Redis: Session tokens, temporary verification codes
- Event Log: Audit trail for organization creation

---

## Flow 2: Knowledge Base Creation & Indexing

### 2A: File Upload Flow

```
┌──────────────────┐
│ User uploads     │
│ files (PDF, CSV) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ API Endpoint             │
│ - Validate file type     │
│ - Check file size        │
│ - Generate unique ID     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Object Storage (S3)      │
│ - Store original file    │
│ - Path: org_id/kb_id/    │
│        file_id.ext       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL Write         │
│ - knowledge_bases table  │
│ - kb_files table         │
│ - Status: 'processing'   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Message Queue            │
│ - Publish 'file.process' │
│   job to queue           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Background Worker        │
│ PROCESSING PIPELINE:     │
│ 1. Download from S3      │
│ 2. Extract text          │
│    - PDF → PyPDF2        │
│    - CSV → Pandas        │
│    - DOCX → python-docx  │
│ 3. Clean & normalize     │
│ 4. Chunk text            │
│    - Strategy: sliding   │
│      window (512 tokens) │
│    - Overlap: 50 tokens  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Embedding Generation     │
│ - Send chunks to         │
│   embedding API          │
│ - Model: text-embedding- │
│          ada-002 or      │
│          custom model    │
│ - Generate vectors       │
│   (1536 dimensions)      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Vector Database Write    │
│ - Store embeddings       │
│ - Metadata:              │
│   * kb_id                │
│   * file_id              │
│   * chunk_index          │
│   * original_text        │
│   * timestamp            │
│   * org_id               │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL Update        │
│ - kb_files status:       │
│   'indexed'              │
│ - chunk_count            │
│ - indexed_at timestamp   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Notification Service     │
│ - Notify user:           │
│   "KB ready for use"     │
└──────────────────────────┘
```

### 2B: Database Connection Flow

```
┌──────────────────┐
│ User configures  │
│ DB connection    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ API Endpoint             │
│ - Validate credentials   │
│ - Test connection        │
│ - Encrypt credentials    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL Write         │
│ - kb_data_sources table  │
│ - Encrypted connection   │
│   string                 │
│ - Sync schedule          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Scheduled Job (Cron)     │
│ - Trigger: per schedule  │
│ - Action: sync_database  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Database Sync Worker     │
│ 1. Connect to source DB  │
│ 2. Query configured      │
│    tables/views          │
│ 3. Fetch incremental     │
│    changes (by timestamp)│
│ 4. Transform to text     │
│    representation        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Embedding & Indexing     │
│ (Same as file upload     │
│  pipeline above)         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Vector DB Write          │
│ - Upsert vectors         │
│ - Tag with source_type:  │
│   'database'             │
└──────────────────────────┘
```

**Data Stored**:
- PostgreSQL: KB metadata, file references, sync schedules, processing status
- Object Storage: Original files (unmodified)
- Vector DB: Text embeddings with metadata
- Redis: Processing job status, progress tracking

---

## Flow 3: Persona Creation & Configuration

```
┌──────────────────┐
│ User creates     │
│ persona          │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ API Endpoint             │
│ - Validate persona data  │
│ - Check permissions      │
│ - Verify KB access       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL Write         │
│ TABLES AFFECTED:         │
│ - personas               │
│   * id, name, role       │
│   * config (JSONB)       │
│   * created_by           │
│ - persona_knowledge_bases│
│   * persona_id           │
│   * kb_id                │
│   * priority             │
│ - persona_permissions    │
│   * persona_id           │
│   * user_id / role_id    │
│   * access_level         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Redis Cache              │
│ - Cache persona config   │
│ - Key: persona:{id}      │
│ - TTL: 1 hour            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Event Log                │
│ - Log persona creation   │
│ - Audit trail            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Response to User         │
│ - Persona details        │
│ - Ready to use           │
└──────────────────────────┘
```

**Data Stored**:
- PostgreSQL: Persona configuration, KB assignments, permissions
- Redis: Cached persona configs for fast access
- Audit Log: Creation events, permission changes

---

## Flow 4: Conversation Query Processing (CORE FLOW)

This is the most complex flow involving multiple agents and data sources.

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER SENDS QUERY                               │
│  "What are the top 3 competitors and their recent launches?"     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: QUERY RECEPTION & AUTHENTICATION                        │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ API Gateway                                                 │ │
│ │ - Validate auth token                                       │ │
│ │ - Check persona access permissions                          │ │
│ │ - Load conversation context                                 │ │
│ └────────┬───────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Conversation Service                                        │ │
│ │ - Create/update conversation record                         │ │
│ │ - Store user message                                        │ │
│ │ - Retrieve conversation history (last N messages)           │ │
│ └────────┬───────────────────────────────────────────────────┘ │
│          │                                                       │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: QUERY ANALYSIS & INTENT DETECTION                        │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Query Analyzer (LLM-powered)                                │ │
│ │                                                              │ │
│ │ INPUT:                                                       │ │
│ │ - User query                                                 │ │
│ │ - Conversation history                                       │ │
│ │ - Persona configuration                                      │ │
│ │                                                              │ │
│ │ ANALYSIS OUTPUT:                                             │ │
│ │ {                                                            │ │
│ │   "intent": "competitive_analysis",                          │ │
│ │   "entities": ["competitors", "product launches"],           │ │
│ │   "requires_web_search": true,                               │ │
│ │   "requires_internal_search": true,                          │ │
│ │   "query_complexity": "medium",                              │ │
│ │   "expected_sources": ["internal_docs", "web"]               │ │
│ │ }                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: PARALLEL SEARCH ORCHESTRATION                            │
│                                                                   │
│         ┌─────────────────────┐                                  │
│         │  Search Orchestrator│                                  │
│         │  (Decides strategy) │                                  │
│         └───┬─────────────┬───┘                                  │
│             │             │                                       │
│   ┌─────────┘             └──────────┐                           │
│   │ PARALLEL EXECUTION               │                           │
│   │                                  │                           │
│   ▼                                  ▼                           │
│ ┌──────────────────────┐    ┌──────────────────────┐            │
│ │ INTERNAL SEARCH      │    │ WEB SEARCH           │            │
│ │ BRANCH               │    │ BRANCH               │            │
│ └──────────────────────┘    └──────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

### Branch 3A: Internal Knowledge Search

```
┌──────────────────────────────────────────────────────────────────┐
│ INTERNAL KNOWLEDGE SEARCH PIPELINE                                │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Query Embedding Generation                                   │ │
│ │ - Convert user query to embedding vector                     │ │
│ │ - Model: Same as indexing (consistency required)             │ │
│ │ - Output: 1536-dim vector                                    │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Vector Database Query                                        │ │
│ │                                                              │ │
│ │ QUERY PARAMETERS:                                            │ │
│ │ - Vector: [user query embedding]                             │ │
│ │ - Filter:                                                    │ │
│ │   * org_id = current_org                                     │ │
│ │   * kb_id IN (persona.assigned_kbs)                          │ │
│ │ - Top K: 20 (configurable)                                   │ │
│ │ - Similarity threshold: > 0.7                                │ │
│ │                                                              │ │
│ │ RESULTS:                                                     │ │
│ │ [                                                            │ │
│ │   {                                                          │ │
│ │     "chunk_id": "uuid",                                      │ │
│ │     "text": "...",                                           │ │
│ │     "similarity_score": 0.89,                                │ │
│ │     "metadata": {                                            │ │
│ │       "kb_id": "...",                                        │ │
│ │       "file_name": "...",                                    │ │
│ │       "chunk_index": 5                                       │ │
│ │     }                                                        │ │
│ │   },                                                         │ │
│ │   ...                                                        │ │
│ │ ]                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Context Relevance Scoring                                    │ │
│ │ - Re-rank results using cross-encoder                        │ │
│ │ - Filter out low-relevance chunks                            │ │
│ │ - Group by source document                                   │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Confidence Assessment                                        │ │
│ │                                                              │ │
│ │ CONFIDENCE CALCULATION:                                      │ │
│ │ - Avg similarity score: 0.85                                 │ │
│ │ - Num relevant chunks: 12                                    │ │
│ │ - Coverage score: 0.78                                       │ │
│ │ - OVERALL CONFIDENCE: 0.81 (HIGH)                            │ │
│ │                                                              │ │
│ │ DECISION:                                                    │ │
│ │ IF confidence > 0.75:                                        │ │
│ │   → Proceed to response generation                           │ │
│ │ ELSE:                                                        │ │
│ │   → Trigger web search enhancement                           │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           └─────→ (Continue to Step 4: Context Aggregation)
```

### Branch 3B: Web Search & Data Enrichment

```
┌──────────────────────────────────────────────────────────────────┐
│ WEB SEARCH & ENRICHMENT PIPELINE                                  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Search Query Generation (LLM Agent)                          │ │
│ │                                                              │ │
│ │ INPUT:                                                       │ │
│ │ - Original user query                                        │ │
│ │ - Persona context (e.g., industry, company domain)           │ │
│ │ - Entity extraction results                                  │ │
│ │                                                              │ │
│ │ LLM PROMPT:                                                  │ │
│ │ "Generate 3-5 optimized search queries for finding          │ │
│ │  competitor information and product launches for             │ │
│ │  [company domain]. Focus on recent data (2025-2026)."        │ │
│ │                                                              │ │
│ │ OUTPUT:                                                      │ │
│ │ [                                                            │ │
│ │   "top competitors [industry] 2026",                         │ │
│ │   "[competitor_name] product launch 2025 2026",              │ │
│ │   "market analysis [company_domain] competitive landscape",  │ │
│ │   "[industry] new products recent announcements"             │ │
│ │ ]                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Searcher Agent (Web Search Execution)                        │ │
│ │                                                              │ │
│ │ FOR EACH search query:                                       │ │
│ │   1. Call search API (Google/Bing/SerpAPI)                   │ │
│ │   2. Retrieve top 5-10 URLs                                  │ │
│ │   3. Filter out irrelevant domains                           │ │
│ │                                                              │ │
│ │ RESULT:                                                      │ │
│ │ [                                                            │ │
│ │   {"url": "competitor-a.com/news/launch", "title": "..."},   │ │
│ │   {"url": "techcrunch.com/article", "title": "..."},         │ │
│ │   ...                                                        │ │
│ │ ]                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Web Scraping Service (Firecrawl Integration)                 │ │
│ │                                                              │ │
│ │ FOR EACH URL:                                                │ │
│ │   1. Send URL to Firecrawl API                               │ │
│ │   2. Firecrawl scrapes page content                          │ │
│ │   3. Extract clean text (remove ads, nav, etc.)              │ │
│ │   4. Return structured data                                  │ │
│ │                                                              │ │
│ │ API CALL:                                                    │ │
│ │ POST /scrape                                                 │ │
│ │ {                                                            │ │
│ │   "url": "competitor-a.com/news/launch",                     │ │
│ │   "formats": ["markdown", "html"],                           │ │
│ │   "onlyMainContent": true                                    │ │
│ │ }                                                            │ │
│ │                                                              │ │
│ │ RESPONSE:                                                    │ │
│ │ {                                                            │ │
│ │   "success": true,                                           │ │
│ │   "data": {                                                  │ │
│ │     "markdown": "# Product Launch...",                       │ │
│ │     "metadata": {                                            │ │
│ │       "title": "...",                                        │ │
│ │       "description": "...",                                  │ │
│ │       "publishedTime": "2026-03-15"                          │ │
│ │     }                                                        │ │
│ │   }                                                          │ │
│ │ }                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Raw Data Storage (Temporary)                                 │ │
│ │ - Store scraped data in Redis (TTL: 1 hour)                  │ │
│ │ - Key: scrape:{job_id}:{url_hash}                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: ANALYST AGENT PROCESSING                                  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Analyst Agent (Data Processing & Analysis)                   │ │
│ │                                                              │ │
│ │ INPUT:                                                       │ │
│ │ - Raw scraped data from multiple sources                     │ │
│ │ - User query context                                         │ │
│ │ - Persona configuration                                      │ │
│ │                                                              │ │
│ │ PROCESSING STEPS:                                            │ │
│ │                                                              │ │
│ │ 1. DATA EXTRACTION                                           │ │
│ │    - Identify key entities (company names, products)         │ │
│ │    - Extract dates, facts, figures                           │ │
│ │    - Detect relationships (competitor-to-product)            │ │
│ │                                                              │ │
│ │ 2. DATA STRUCTURING                                          │ │
│ │    LLM Prompt: "Extract structured information about         │ │
│ │    competitors and their product launches from the           │ │
│ │    following text. Format as JSON with schema:               │ │
│ │    {competitors: [{name, products: [{name, launch_date,      │ │
│ │    features, url}]}]}"                                       │ │
│ │                                                              │ │
│ │ 3. COMPARATIVE ANALYSIS                                      │ │
│ │    - Cross-reference data across sources                     │ │
│ │    - Identify patterns and trends                            │ │
│ │    - Generate insights (e.g., "All 3 competitors launched    │ │
│ │      AI features in Q1 2026")                                │ │
│ │                                                              │ │
│ │ 4. SYNTHESIS & SUMMARIZATION                                 │ │
│ │    - Create concise competitor profiles                      │ │
│ │    - Highlight key differentiators                           │ │
│ │    - Generate executive summary                              │ │
│ │                                                              │ │
│ │ OUTPUT:                                                      │ │
│ │ {                                                            │ │
│ │   "summary": "Analysis of top 3 competitors...",             │ │
│ │   "competitors": [                                           │ │
│ │     {                                                        │ │
│ │       "name": "Competitor A",                                │ │
│ │       "recent_launches": [                                   │ │
│ │         {                                                    │ │
│ │           "product": "AI Assistant Pro",                     │ │
│ │           "launch_date": "2026-02-14",                       │ │
│ │           "key_features": [...],                             │ │
│ │           "source_url": "..."                                │ │
│ │         }                                                    │ │
│ │       ],                                                     │ │
│ │       "market_position": "Leader in AI features"             │ │
│ │     },                                                       │ │
│ │     ...                                                      │ │
│ │   ],                                                         │ │
│ │   "insights": [                                              │ │
│ │     "All competitors focused on AI in Q1 2026",              │ │
│ │     "Average launch cycle: 6 months"                         │ │
│ │   ],                                                         │ │
│ │   "sources": [...]                                           │ │
│ │ }                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Analysis Storage (Vector DB)                                 │ │
│ │                                                              │ │
│ │ STORAGE STRATEGY:                                            │ │
│ │ 1. Convert analysis to text representation                   │ │
│ │ 2. Generate embedding                                        │ │
│ │ 3. Store in vector DB with metadata:                         │ │
│ │    {                                                         │ │
│ │      "type": "web_analysis",                                 │ │
│ │      "persona_id": "...",                                    │ │
│ │      "query": "original user query",                         │ │
│ │      "timestamp": "2026-07-29T10:30:00Z",                    │ │
│ │      "source_urls": [...],                                   │ │
│ │      "freshness_score": 0.95,                                │ │
│ │      "analysis_json": {...}  // full structured data         │ │
│ │    }                                                         │ │
│ │                                                              │ │
│ │ PURPOSE:                                                     │ │
│ │ - Future retrieval for similar queries                       │ │
│ │ - Avoid redundant web searches                               │ │
│ │ - Build knowledge over time                                  │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           └─────→ (Continue to Step 5: Context Aggregation)
```

### Step 5: Context Aggregation & Ranking

```
┌──────────────────────────────────────────────────────────────────┐
│ CONTEXT AGGREGATION ENGINE                                        │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Input Sources                                                │ │
│ │ ┌───────────────────────────────────────────────────────────┐││
│ │ │ 1. Internal KB Results (from vector search)               │││
│ │ │    - 12 relevant chunks                                    │││
│ │ │    - Avg similarity: 0.85                                  │││
│ │ │                                                            │││
│ │ │ 2. Web Analysis Results (from Analyst Agent)               │││
│ │ │    - Structured competitor data                            │││
│ │ │    - Recent insights                                       │││
│ │ │                                                            │││
│ │ │ 3. Conversation History                                    │││
│ │ │    - Last 5 messages (context continuity)                  │││
│ │ │                                                            │││
│ │ │ 4. Persona Configuration                                   │││
│ │ │    - Role: Market Analysis                                 │││
│ │ │    - Response style: Professional, data-driven             │││
│ │ └───────────────────────────────────────────────────────────┘││
│ └─────────────┬───────────────────────────────────────────────┘ │
│               │                                                   │
│               ▼                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Ranking & Prioritization                                     │ │
│ │                                                              │ │
│ │ RANKING ALGORITHM:                                           │ │
│ │                                                              │ │
│ │ Score(chunk) = w1*relevance + w2*freshness + w3*source_trust │ │
│ │                                                              │ │
│ │ Where:                                                       │ │
│ │ - relevance: semantic similarity score                       │ │
│ │ - freshness: time decay function (newer = higher)            │ │
│ │ - source_trust: KB priority + source credibility             │ │
│ │                                                              │ │
│ │ WEIGHTS (configurable per persona):                          │ │
│ │ w1 = 0.5, w2 = 0.3, w3 = 0.2                                 │ │
│ │                                                              │ │
│ │ RESULT: Ranked list of context pieces                        │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Context Window Management                                    │ │
│ │                                                              │ │
│ │ LLM CONTEXT LIMIT: 200,000 tokens (Claude 3.5)               │ │
│ │                                                              │ │
│ │ ALLOCATION:                                                  │ │
│ │ - System prompt: 1,000 tokens                                │ │
│ │ - Persona config: 500 tokens                                 │ │
│ │ - Conversation history: 2,000 tokens                         │ │
│ │ - Internal KB context: up to 10,000 tokens                   │ │
│ │ - Web analysis: up to 5,000 tokens                           │ │
│ │ - Reserved for response: 4,000 tokens                        │ │
│ │                                                              │ │
│ │ STRATEGY:                                                    │ │
│ │ - Include highest-ranked chunks first                        │ │
│ │ - Truncate if exceeding limit                                │ │
│ │ - Preserve chunk boundaries (don't cut mid-sentence)         │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: RESPONSE GENERATION                                       │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ LLM Response Generator                                       │ │
│ │                                                              │ │
│ │ PROMPT STRUCTURE:                                            │ │
│ │                                                              │ │
│ │ <system>                                                     │ │
│ │ You are a Market Analysis AI assistant. Your role is to     │ │
│ │ provide data-driven insights about competitors and market    │ │
│ │ trends. Be professional, cite sources, and structure         │ │
│ │ responses clearly.                                           │ │
│ │ </system>                                                    │ │
│ │                                                              │ │
│ │ <persona_config>                                             │ │
│ │ {persona configuration JSON}                                 │ │
│ │ </persona_config>                                            │ │
│ │                                                              │ │
│ │ <conversation_history>                                       │ │
│ │ {last 5 messages}                                            │ │
│ │ </conversation_history>                                      │ │
│ │                                                              │ │
│ │ <internal_knowledge>                                         │ │
│ │ {top-ranked chunks from KB}                                  │ │
│ │ </internal_knowledge>                                        │ │
│ │                                                              │ │
│ │ <web_research>                                               │ │
│ │ {analyst agent output}                                       │ │
│ │ </web_research>                                              │ │
│ │                                                              │ │
│ │ <user_query>                                                 │ │
│ │ What are the top 3 competitors and their recent launches?    │ │
│ │ </user_query>                                                │ │
│ │                                                              │ │
│ │ <instructions>                                               │ │
│ │ Answer the user's question using the provided context.       │ │
│ │ Cite sources with [Source: filename/URL]. If information     │ │
│ │ is recent web research, indicate freshness.                  │ │
│ │ </instructions>                                              │ │
│ │                                                              │ │
│ │ LLM API CALL:                                                │ │
│ │ POST https://api.anthropic.com/v1/messages                   │ │
│ │ {                                                            │ │
│ │   "model": "claude-3-5-sonnet-20240620",                     │ │
│ │   "max_tokens": 4000,                                        │ │
│ │   "messages": [...],                                         │ │
│ │   "temperature": 0.7                                         │ │
│ │ }                                                            │ │
│ │                                                              │ │
│ │ RESPONSE:                                                    │ │
│ │ {                                                            │ │
│ │   "content": "Based on recent market analysis, the top 3     │ │
│ │                competitors are:\n\n1. **Competitor A**\n     │ │
│ │                Recently launched AI Assistant Pro on         │ │
│ │                February 14, 2026 [Source: Web Research]..."  │ │
│ │ }                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Response Post-Processing                                     │ │
│ │                                                              │ │
│ │ 1. Parse response text                                       │ │
│ │ 2. Extract source citations                                  │ │
│ │ 3. Enrich with metadata:                                     │ │
│ │    - Source links (clickable)                                │ │
│ │    - Confidence indicators                                   │ │
│ │    - Timestamp                                               │ │
│ │ 4. Generate follow-up suggestions:                           │ │
│ │    - "Compare features in detail"                            │ │
│ │    - "Show pricing comparison"                               │ │
│ │    - "Analyze market trends"                                 │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: RESPONSE STORAGE & DELIVERY                               │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PostgreSQL Write                                             │ │
│ │                                                              │ │
│ │ TABLES UPDATED:                                              │ │
│ │                                                              │ │
│ │ 1. messages table:                                           │ │
│ │    INSERT INTO messages (                                    │ │
│ │      conversation_id,                                        │ │
│ │      role,              -- 'assistant'                       │ │
│ │      content,           -- LLM response text                 │ │
│ │      metadata,          -- sources, confidence, etc.         │ │
│ │      created_at                                              │ │
│ │    )                                                         │ │
│ │                                                              │ │
│ │ 2. message_sources table:                                    │ │
│ │    INSERT INTO message_sources (                             │ │
│ │      message_id,                                             │ │
│ │      source_type,       -- 'knowledge_base', 'web', 'analysis'│ │
│ │      source_id,         -- KB file ID or URL                 │ │
│ │      relevance_score                                         │ │
│ │    )                                                         │ │
│ │                                                              │ │
│ │ 3. conversation_metadata update:                             │ │
│ │    UPDATE conversations                                      │ │
│ │    SET last_message_at = NOW(),                              │ │
│ │        message_count = message_count + 1                     │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Analytics & Logging                                          │ │
│ │                                                              │ │
│ │ LOG EVENTS:                                                  │ │
│ │ - Query processing time (end-to-end latency)                 │ │
│ │ - Component latencies:                                       │ │
│ │   * Vector search: 120ms                                     │ │
│ │   * Web search: 2.3s                                         │ │
│ │   * Analyst processing: 4.1s                                 │ │
│ │   * LLM generation: 3.8s                                     │ │
│ │   * Total: 10.32s                                            │ │
│ │ - Token usage (input/output)                                 │ │
│ │ - Cost calculation                                           │ │
│ │ - Cache hit/miss rates                                       │ │
│ └────────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│          ▼                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ WebSocket / HTTP Response                                    │ │
│ │                                                              │ │
│ │ RESPONSE PAYLOAD:                                            │ │
│ │ {                                                            │ │
│ │   "message_id": "msg_abc123",                                │ │
│ │   "conversation_id": "conv_xyz789",                          │ │
│ │   "content": {                                               │ │
│ │     "text": "Based on recent market analysis...",            │ │
│ │     "formatted": "<markdown>",                               │ │
│ │     "sources": [                                             │ │
│ │       {                                                      │ │
│ │         "type": "knowledge_base",                            │ │
│ │         "title": "Sales Data 2025",                          │ │
│ │         "file": "competitors.pdf",                           │ │
│ │         "relevance": 0.89                                    │ │
│ │       },                                                     │ │
│ │       {                                                      │ │
│ │         "type": "web",                                       │ │
│ │         "title": "Competitor A Product Launch",              │ │
│ │         "url": "https://competitor-a.com/news",              │ │
│ │         "date": "2026-02-14"                                 │ │
│ │       }                                                      │ │
│ │     ],                                                       │ │
│ │     "follow_up_suggestions": [                               │ │
│ │       "Compare features in detail",                          │ │
│ │       "Show pricing comparison"                              │ │
│ │     ]                                                        │ │
│ │   },                                                         │ │
│ │   "metadata": {                                              │ │
│ │     "confidence": 0.92,                                      │ │
│ │     "processing_time_ms": 10320,                             │ │
│ │     "model": "claude-3-5-sonnet"                             │ │
│ │   },                                                         │ │
│ │   "timestamp": "2026-07-29T10:30:10Z"                        │ │
│ │ }                                                            │ │
│ └────────┬────────────────────────────────────────────────────┘ │
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
   ┌─────────────────┐
   │ USER RECEIVES   │
   │ RESPONSE        │
   └─────────────────┘
```

---

## Flow 5: Persona Sharing

```
┌──────────────────┐
│ Owner shares     │
│ persona          │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ API Endpoint             │
│ - Validate ownership     │
│ - Check target users     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL Write         │
│ - persona_permissions    │
│   INSERT per user/role   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Notification Service     │
│ - Email to shared users  │
│ - In-app notification    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Redis Cache Update       │
│ - Invalidate user's      │
│   persona list cache     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Shared users can now     │
│ access persona           │
└──────────────────────────┘
```

---

## Data Synchronization & Consistency

### Real-time Updates Flow

```
┌────────────────────────────────────────────────────────────┐
│ Change Event (KB update, persona config change)            │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ PostgreSQL + Event Trigger                                 │
│ - NOTIFY channel with event payload                        │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ Event Listener (Backend Service)                           │
│ - Subscribed to NOTIFY channels                            │
└────────────┬───────────────────────────────────────────────┘
             │
             ├──────────────────┬─────────────────────────────┐
             │                  │                             │
             ▼                  ▼                             ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Redis Cache     │  │ WebSocket Clients │  │ Background Worker    │
│ Invalidation    │  │ (Browser updates) │  │ (Re-index if needed) │
└─────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## Performance Optimization Strategies

### 1. Caching Layers

```
Request → Redis L1 Cache → PostgreSQL → Response
             ↓ (miss)
        Vector DB Query
             ↓ (miss)
        Full Processing
```

**Cache Keys**:
- `persona:{id}` - Persona configuration (TTL: 1 hour)
- `kb:{id}:metadata` - KB metadata (TTL: 30 min)
- `user:{id}:personas` - User's accessible personas (TTL: 15 min)
- `conversation:{id}:history` - Recent messages (TTL: 5 min)
- `query:{hash}` - Cached query results (TTL: 24 hours, if fresh enough)

### 2. Database Query Optimization

**Read Replicas**:
- Primary: Write operations
- Replica 1: Vector search queries
- Replica 2: Analytics & reporting

**Indexing Strategy**:
```sql
-- Critical indexes
CREATE INDEX idx_personas_org_id ON personas(organization_id);
CREATE INDEX idx_conversations_persona_user ON conversations(persona_id, user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_kb_org_type ON knowledge_bases(organization_id, type);
```

### 3. Async Processing

```
User Request → Fast Response (< 500ms)
     ↓
Background Jobs:
  - Vector indexing (async)
  - Analytics aggregation (batch)
  - Data sync (scheduled)
```

---

## Error Handling & Fallbacks

```
┌──────────────────────────┐
│ Primary LLM API Call     │
└────────┬─────────────────┘
         │
         ├─ Success → Continue
         │
         ├─ Rate Limit → Retry with backoff
         │
         ├─ Timeout → Fallback to cached response
         │                (if available)
         │
         └─ Error → Return partial results +
                     "Some features unavailable"
```

---

## Security & Data Flow Controls

### Authentication Flow
```
User Request → JWT Validation → Role Check → Permission Check → Execute
                     │              │              │
                     ↓              ↓              ↓
                  Redis          PostgreSQL    Policy Engine
                  Token           Roles         Rules
```

### Data Access Control
```
Query → Org Isolation Filter → Role-based KB Access → Row-level Security
         (WHERE org_id=X)       (JOIN permissions)     (PostgreSQL RLS)
```

### Audit Trail
```
All write operations → audit_log table
  - who: user_id
  - what: action type
  - when: timestamp
  - where: resource (persona_id, kb_id)
  - details: JSON payload
```

---

## Monitoring & Observability Data Flow

```
Application Metrics → Prometheus → Grafana Dashboard
                         ↓
                    Alert Manager
                         ↓
                   Slack/PagerDuty

Application Logs → Elasticsearch → Kibana
                         ↓
                    Pattern Detection
                         ↓
                    Anomaly Alerts
```

**Key Metrics**:
- Query latency (p50, p95, p99)
- Vector search performance
- LLM API response time
- Cache hit rates
- Error rates by component
- Token usage & costs
- User engagement (DAU, conversations/user)

---

## Scalability Considerations

### Horizontal Scaling Strategy

```
┌──────────────────────────────────────────────────────────┐
│                    Load Balancer                          │
└─────────┬────────────────────────────────────────────────┘
          │
     ┌────┴────┬────────┬────────┐
     │         │        │        │
     ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ App    │ │ App    │ │ App    │ │ App    │
│ Server │ │ Server │ │ Server │ │ Server │
│   1    │ │   2    │ │   3    │ │   N    │
└────────┘ └────────┘ └────────┘ └────────┘
     │         │        │        │
     └────┬────┴────────┴────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│           Shared Data Layer (Stateless Apps)             │
│  - Redis Cluster                                          │
│  - PostgreSQL (Primary + Replicas)                        │
│  - Vector DB (Distributed)                                │
└──────────────────────────────────────────────────────────┘
```

---

## Summary: Complete End-to-End Flow

1. **User authenticates** → Session established
2. **Selects persona** → Persona config + KB assignments loaded
3. **Asks query** → Query analysis determines strategy
4. **Parallel execution**:
   - Internal KB search via vector similarity
   - Web search (if needed) → Scraping → Analysis
5. **Analyst agent** processes raw data → Structured insights
6. **Results stored** in vector DB for future retrieval
7. **Context aggregation** combines all sources
8. **LLM generates response** with citations
9. **Response delivered** to user with metadata
10. **Feedback loop** improves future responses

**Total typical latency**: 5-15 seconds (depending on web search requirements)
**Cached query response**: < 1 second
