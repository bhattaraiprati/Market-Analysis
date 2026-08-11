# Database Design Documentation

## Overview
This document provides the complete database schema design for the AI Persona-based Knowledge Management System, including PostgreSQL tables, Vector Database structure, Redis cache patterns, and data relationships.

---

## Database Technology Stack

### Primary Databases

| Database | Purpose | Justification |
|----------|---------|---------------|
| **PostgreSQL 15+** | Primary relational data | ACID compliance, JSONB support, mature ecosystem, excellent performance |
| **Vector Database** (Pinecone/Weaviate/pgvector) | Embedding storage & similarity search | Optimized for high-dimensional vector operations |
| **Redis 7+** | Caching & session management | Sub-millisecond latency, pub/sub support |
| **S3/MinIO** | Object storage | Scalable file storage for documents |

### Recommended Vector DB: **Weaviate** or **pgvector**
- **Weaviate**: If scale > 10M vectors, need advanced filtering
- **pgvector**: If prefer single DB, scale < 5M vectors, simpler ops

---

## PostgreSQL Schema Design

### Entity Relationship Diagram

```
organizations (1) ──────< (*) users
     │                         │
     │                         │
     ├──────< (*) knowledge_bases
     │             │
     │             ├──────< (*) kb_files
     │             ├──────< (*) kb_data_sources
     │             └──────< (*) kb_api_integrations
     │
     ├──────< (*) personas
     │             │
     │             ├──────< (*) persona_knowledge_bases (M:M)
     │             ├──────< (*) persona_permissions
     │             └──────< (*) conversations
     │                          │
     │                          └──────< (*) messages
     │                                       │
     │                                       ├──────< (*) message_sources
     │                                       └──────< (*) message_feedback
     │
     └──────< (*) org_members (M:M with users)
```

---

## Table Schemas

### 1. Organizations

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Organization details
    industry VARCHAR(100),
    company_size VARCHAR(50),
    domain VARCHAR(255),
    
    -- Subscription & billing
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_starts_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    
    -- Quotas
    max_personas INTEGER DEFAULT 5,
    max_knowledge_bases INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    max_monthly_queries INTEGER DEFAULT 1000,
    
    -- Usage tracking
    current_personas INTEGER DEFAULT 0,
    current_knowledge_bases INTEGER DEFAULT 0,
    current_storage_bytes BIGINT DEFAULT 0,
    current_month_queries INTEGER DEFAULT 0,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'expired'))
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_tier);
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_activity ON users(last_activity_at DESC);
```

---

### 3. Organization Members (Junction Table)

```sql
CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role & permissions
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_org_user UNIQUE(organization_id, user_id),
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'power_user', 'contributor', 'member', 'viewer')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'suspended', 'removed'))
);

-- Indexes
CREATE INDEX idx_org_members_org ON org_members(organization_id, status);
CREATE INDEX idx_org_members_user ON org_members(user_id, status);
CREATE INDEX idx_org_members_role ON org_members(organization_id, role);
```

---

### 4. Knowledge Bases

```sql
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    
    -- Configuration
    type VARCHAR(50) NOT NULL, -- 'file_upload', 'database', 'api', 'hybrid'
    status VARCHAR(50) DEFAULT 'active',
    visibility VARCHAR(50) DEFAULT 'private',
    
    -- Data source settings
    source_config JSONB DEFAULT '{}',
    
    -- Sync settings (for database/API sources)
    sync_enabled BOOLEAN DEFAULT FALSE,
    sync_frequency VARCHAR(50), -- 'realtime', 'hourly', 'daily', 'weekly', 'manual'
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50),
    sync_error TEXT,
    
    -- Indexing status
    indexing_status VARCHAR(50) DEFAULT 'pending',
    total_documents INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    indexed_at TIMESTAMPTZ,
    
    -- Statistics
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_kb_type CHECK (type IN ('file_upload', 'database', 'api', 'hybrid')),
    CONSTRAINT valid_kb_status CHECK (status IN ('active', 'processing', 'error', 'archived')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'organization')),
    CONSTRAINT valid_sync_frequency CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual') OR sync_frequency IS NULL)
);

-- Indexes
CREATE INDEX idx_kb_org ON knowledge_bases(organization_id, status);
CREATE INDEX idx_kb_created_by ON knowledge_bases(created_by);
CREATE INDEX idx_kb_type ON knowledge_bases(type, status);
CREATE INDEX idx_kb_sync ON knowledge_bases(next_sync_at) WHERE sync_enabled = TRUE;
CREATE INDEX idx_kb_deleted ON knowledge_bases(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_kb_search ON knowledge_bases USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

---

### 5. KB Files (for file uploads)

```sql
CREATE TABLE kb_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    
    -- File info
    original_filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    
    -- Storage
    storage_path VARCHAR(1000) NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 's3',
    
    -- Processing
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    processed_at TIMESTAMPTZ,
    
    -- Extraction results
    extracted_text TEXT,
    extracted_metadata JSONB DEFAULT '{}',
    
    -- Chunking
    chunk_count INTEGER DEFAULT 0,
    chunk_strategy VARCHAR(50) DEFAULT 'sliding_window',
    chunk_size INTEGER DEFAULT 512,
    chunk_overlap INTEGER DEFAULT 50,
    
    -- Indexing
    indexed BOOLEAN DEFAULT FALSE,
    indexed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_chunk_strategy CHECK (chunk_strategy IN ('sliding_window', 'sentence', 'paragraph', 'semantic'))
);

-- Indexes
CREATE INDEX idx_kb_files_kb ON kb_files(knowledge_base_id, processing_status);
CREATE INDEX idx_kb_files_status ON kb_files(processing_status) WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_kb_files_deleted ON kb_files(deleted_at) WHERE deleted_at IS NULL;
```

---

### 6. KB Data Sources (for database connections)

```sql
CREATE TABLE kb_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    
    -- Connection details
    source_type VARCHAR(50) NOT NULL, -- 'postgresql', 'mysql', 'mongodb', 'bigquery', etc.
    connection_string TEXT NOT NULL, -- encrypted
    connection_config JSONB DEFAULT '{}',
    
    -- Authentication
    auth_type VARCHAR(50) NOT NULL, -- 'password', 'key', 'oauth', 'iam'
    credentials JSONB NOT NULL, -- encrypted
    
    -- Data selection
    selected_tables TEXT[],
    query_template TEXT,
    incremental_field VARCHAR(255), -- e.g., 'updated_at' for incremental sync
    
    -- Connection status
    connection_status VARCHAR(50) DEFAULT 'pending',
    last_connection_test_at TIMESTAMPTZ,
    connection_error TEXT,
    
    -- Sync tracking
    last_sync_watermark TIMESTAMPTZ,
    total_rows_synced BIGINT DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_source_type CHECK (source_type IN ('postgresql', 'mysql', 'mongodb', 'snowflake', 'bigquery', 'redshift')),
    CONSTRAINT valid_auth_type CHECK (auth_type IN ('password', 'key', 'oauth', 'iam')),
    CONSTRAINT valid_connection_status CHECK (connection_status IN ('pending', 'connected', 'failed', 'disabled'))
);

-- Indexes
CREATE INDEX idx_kb_data_sources_kb ON kb_data_sources(knowledge_base_id);
CREATE INDEX idx_kb_data_sources_status ON kb_data_sources(connection_status);
```

---

### 7. KB API Integrations

```sql
CREATE TABLE kb_api_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    
    -- API details
    api_name VARCHAR(255) NOT NULL,
    api_type VARCHAR(50) NOT NULL, -- 'rest', 'graphql', 'soap'
    base_url VARCHAR(1000) NOT NULL,
    
    -- Authentication
    auth_method VARCHAR(50) NOT NULL, -- 'api_key', 'oauth2', 'bearer', 'basic'
    auth_credentials JSONB NOT NULL, -- encrypted
    
    -- Request configuration
    http_method VARCHAR(10) DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    query_params JSONB DEFAULT '{}',
    request_body JSONB,
    
    -- Response handling
    response_path VARCHAR(500), -- JSONPath to data
    pagination_config JSONB,
    
    -- Sync settings
    refresh_interval INTEGER DEFAULT 3600, -- seconds
    last_refresh_at TIMESTAMPTZ,
    next_refresh_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    last_error TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_api_type CHECK (api_type IN ('rest', 'graphql', 'soap')),
    CONSTRAINT valid_auth_method CHECK (auth_method IN ('api_key', 'oauth2', 'bearer', 'basic', 'none')),
    CONSTRAINT valid_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH'))
);

-- Indexes
CREATE INDEX idx_kb_api_kb ON kb_api_integrations(knowledge_base_id);
CREATE INDEX idx_kb_api_refresh ON kb_api_integrations(next_refresh_at) WHERE status = 'active';
```

---

### 8. Personas

```sql
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Role & specialization
    role VARCHAR(100) NOT NULL,
    specialization TEXT[],
    expertise_level VARCHAR(50),
    
    -- Behavior configuration
    response_tone VARCHAR(50) DEFAULT 'professional',
    response_length VARCHAR(50) DEFAULT 'balanced',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Capabilities
    capabilities JSONB DEFAULT '{"web_search": true, "data_analysis": true, "report_generation": true}',
    
    -- Model configuration
    model_provider VARCHAR(50) DEFAULT 'anthropic',
    model_name VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20240620',
    model_parameters JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 4000}',
    
    -- Context configuration
    context_window_size INTEGER DEFAULT 200000,
    max_knowledge_chunks INTEGER DEFAULT 20,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
    
    -- Sharing & access
    visibility VARCHAR(50) DEFAULT 'private',
    is_template BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Statistics
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),
    last_used_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_response_tone CHECK (response_tone IN ('professional', 'casual', 'technical', 'friendly', 'formal')),
    CONSTRAINT valid_response_length CHECK (response_length IN ('concise', 'balanced', 'detailed', 'comprehensive')),
    CONSTRAINT valid_expertise_level CHECK (expertise_level IN ('beginner', 'intermediate', 'expert', 'specialist') OR expertise_level IS NULL),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'organization', 'public')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'draft', 'archived'))
);

-- Indexes
CREATE INDEX idx_personas_org ON personas(organization_id, status);
CREATE INDEX idx_personas_created_by ON personas(created_by);
CREATE INDEX idx_personas_role ON personas(role, status);
CREATE INDEX idx_personas_visibility ON personas(visibility, status);
CREATE INDEX idx_personas_deleted ON personas(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_personas_search ON personas USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

---

### 9. Persona Knowledge Bases (Junction Table)

```sql
CREATE TABLE persona_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    
    -- Priority & configuration
    priority INTEGER DEFAULT 1, -- Higher number = higher priority in search
    weight DECIMAL(3,2) DEFAULT 1.0, -- Relevance multiplier
    
    -- Retrieval settings
    max_chunks INTEGER DEFAULT 10,
    min_similarity DECIMAL(3,2) DEFAULT 0.70,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_persona_kb UNIQUE(persona_id, knowledge_base_id),
    CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 2),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Indexes
CREATE INDEX idx_persona_kb_persona ON persona_knowledge_bases(persona_id, is_active);
CREATE INDEX idx_persona_kb_kb ON persona_knowledge_bases(knowledge_base_id, is_active);
CREATE INDEX idx_persona_kb_priority ON persona_knowledge_bases(persona_id, priority DESC);
```

---

### 10. Persona Permissions

```sql
CREATE TABLE persona_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    
    -- Grantee (user or role)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Access level
    access_level VARCHAR(50) NOT NULL,
    
    -- Permissions
    can_chat BOOLEAN DEFAULT TRUE,
    can_view_config BOOLEAN DEFAULT FALSE,
    can_edit_config BOOLEAN DEFAULT FALSE,
    can_add_knowledge BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    
    -- Grant details
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_access_level CHECK (access_level IN ('viewer', 'user', 'contributor', 'co-owner')),
    CONSTRAINT user_or_role_check CHECK (
        (user_id IS NOT NULL AND role IS NULL) OR
        (user_id IS NULL AND role IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_persona_perms_persona ON persona_permissions(persona_id);
CREATE INDEX idx_persona_perms_user ON persona_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_persona_perms_role ON persona_permissions(organization_id, role) WHERE role IS NOT NULL;
CREATE INDEX idx_persona_perms_expires ON persona_permissions(expires_at) WHERE expires_at IS NOT NULL;
```

---

### 11. Conversations

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversation details
    title VARCHAR(500),
    summary TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Statistics
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Indexes
CREATE INDEX idx_conversations_user_persona ON conversations(user_id, persona_id, status);
CREATE INDEX idx_conversations_org ON conversations(organization_id, status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NULL;

-- Partitioning strategy (optional, for scale)
-- Partition by organization_id for data isolation
```

---

### 12. Messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message details
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    
    -- Processing metadata
    processing_time_ms INTEGER,
    model_used VARCHAR(100),
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost DECIMAL(10,6),
    
    -- Context used
    context_sources JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2),
    
    -- Message metadata
    metadata JSONB DEFAULT '{}',
    
    -- Parent message (for threading)
    parent_message_id UUID REFERENCES messages(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'delivered',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT valid_content_type CHECK (content_type IN ('text', 'markdown', 'json', 'code')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'delivered', 'error'))
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_role ON messages(conversation_id, role);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
```

---

### 13. Message Sources (for attribution)

```sql
CREATE TABLE message_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Source identification
    source_type VARCHAR(50) NOT NULL, -- 'knowledge_base', 'web', 'analysis', 'database'
    source_id VARCHAR(255), -- KB file ID, URL, etc.
    source_name VARCHAR(500),
    
    -- Source details
    chunk_id VARCHAR(255), -- Vector DB chunk ID
    relevance_score DECIMAL(3,2),
    
    -- Content
    content_snippet TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_source_type CHECK (source_type IN ('knowledge_base', 'web', 'analysis', 'database', 'cache'))
);

-- Indexes
CREATE INDEX idx_message_sources_message ON message_sources(message_id);
CREATE INDEX idx_message_sources_type ON message_sources(source_type, source_id);
```

---

### 14. Message Feedback

```sql
CREATE TABLE message_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Feedback
    rating INTEGER, -- 1-5 stars or -1/0/1 for thumbs down/neutral/up
    feedback_type VARCHAR(50),
    comment TEXT,
    
    -- Issues reported
    issues TEXT[], -- ['inaccurate', 'irrelevant', 'incomplete', 'outdated']
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_message_feedback UNIQUE(message_id, user_id),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= -1 AND rating <= 5)),
    CONSTRAINT valid_feedback_type CHECK (feedback_type IN ('positive', 'negative', 'neutral', 'report') OR feedback_type IS NULL)
);

-- Indexes
CREATE INDEX idx_message_feedback_message ON message_feedback(message_id);
CREATE INDEX idx_message_feedback_user ON message_feedback(user_id);
CREATE INDEX idx_message_feedback_rating ON message_feedback(rating) WHERE rating IS NOT NULL;
```

---

### 15. Audit Log

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- Partitioning by month (recommended for production)
-- CREATE TABLE audit_log_2026_07 PARTITION OF audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

---

### 16. Analytics Events (for usage tracking)

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    
    -- Context
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Properties
    properties JSONB DEFAULT '{}',
    
    -- Metrics
    duration_ms INTEGER,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_events_org ON analytics_events(organization_id, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, event_name, created_at DESC);
CREATE INDEX idx_analytics_events_persona ON analytics_events(persona_id, created_at DESC);

-- Consider using TimescaleDB for better time-series performance
```

---

## Vector Database Schema

### Weaviate Schema Example

```json
{
  "class": "KnowledgeChunk",
  "description": "Text chunks from knowledge bases with embeddings",
  "vectorizer": "text2vec-transformers",
  "moduleConfig": {
    "text2vec-transformers": {
      "model": "sentence-transformers/all-MiniLM-L6-v2",
      "options": {
        "waitForModel": true
      }
    }
  },
  "properties": [
    {
      "name": "content",
      "dataType": ["text"],
      "description": "The actual text content of the chunk"
    },
    {
      "name": "organizationId",
      "dataType": ["string"],
      "description": "Organization UUID for data isolation"
    },
    {
      "name": "knowledgeBaseId",
      "dataType": ["string"],
      "description": "Knowledge base UUID"
    },
    {
      "name": "fileId",
      "dataType": ["string"],
      "description": "Source file UUID (if applicable)"
    },
    {
      "name": "sourceType",
      "dataType": ["string"],
      "description": "Type: file, database, web, api"
    },
    {
      "name": "chunkIndex",
      "dataType": ["int"],
      "description": "Position in the document"
    },
    {
      "name": "metadata",
      "dataType": ["object"],
      "description": "Additional metadata as JSON"
    },
    {
      "name": "timestamp",
      "dataType": ["date"],
      "description": "When this chunk was indexed"
    },
    {
      "name": "fileName",
      "dataType": ["string"],
      "description": "Original file name"
    },
    {
      "name": "pageNumber",
      "dataType": ["int"],
      "description": "Page number (for PDFs)"
    }
  ]
}
```

### Alternative: pgvector Implementation

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    organization_id UUID NOT NULL,
    knowledge_base_id UUID NOT NULL,
    file_id UUID,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Embedding
    embedding vector(1536), -- For OpenAI ada-002 or similar
    
    -- Chunk metadata
    chunk_index INTEGER,
    chunk_strategy VARCHAR(50),
    
    -- Source metadata
    source_type VARCHAR(50) NOT NULL,
    source_metadata JSONB DEFAULT '{}',
    
    -- Document context
    file_name VARCHAR(500),
    page_number INTEGER,
    
    -- Quality metrics
    embedding_model VARCHAR(100),
    
    -- Timestamps
    indexed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_source_type CHECK (source_type IN ('file', 'database', 'web', 'api', 'analysis'))
);

-- Indexes for vector similarity search
CREATE INDEX idx_knowledge_embeddings_org_kb 
    ON knowledge_embeddings(organization_id, knowledge_base_id);

-- Vector similarity index (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_knowledge_embeddings_vector 
    ON knowledge_embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (faster build, slower query)
-- CREATE INDEX idx_knowledge_embeddings_vector 
--     ON knowledge_embeddings 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- Index for filtering
CREATE INDEX idx_knowledge_embeddings_source 
    ON knowledge_embeddings(source_type, indexed_at DESC);
```

### Vector Search Query Examples

```sql
-- Find similar chunks for a query
SELECT 
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    source_metadata
FROM knowledge_embeddings
WHERE 
    organization_id = 'org-uuid'
    AND knowledge_base_id IN ('kb1-uuid', 'kb2-uuid')
    AND (embedding <=> query_embedding) < 0.3  -- Cosine distance < 0.3 (similarity > 0.7)
ORDER BY embedding <=> query_embedding
LIMIT 20;
```

---

## Redis Schema & Caching Patterns

### Key Patterns

```
# Session management
session:{session_id}
  - TTL: 24 hours
  - Value: JSON with user_id, org_id, permissions

# User authentication
user:auth:{user_id}
  - TTL: 1 hour
  - Value: JWT token, refresh token

# Persona configuration cache
persona:{persona_id}
  - TTL: 1 hour
  - Value: JSON with full persona config + KB assignments

# Knowledge base metadata
kb:{kb_id}:metadata
  - TTL: 30 minutes
  - Value: JSON with KB details

# User's accessible personas
user:{user_id}:personas
  - TTL: 15 minutes
  - Value: List of persona IDs

# Conversation history cache
conversation:{conversation_id}:history
  - TTL: 5 minutes
  - Value: Last N messages (JSON array)

# Query result cache
query:cache:{hash}
  - TTL: 24 hours (or based on freshness requirements)
  - Value: Cached response + metadata

# Processing job status
job:{job_id}
  - TTL: 1 hour
  - Value: Job status, progress, results

# Rate limiting
rate_limit:{org_id}:{window}
  - TTL: window duration
  - Value: Request count

# Temporary data (scraping results)
scrape:{job_id}:{url_hash}
  - TTL: 1 hour
  - Value: Raw scraped content

# Real-time typing indicators
typing:{conversation_id}:{user_id}
  - TTL: 5 seconds
  - Value: timestamp

# Online users
online:org:{org_id}
  - TTL: Set members expire via ZADD scores
  - Value: Sorted set of user IDs with last activity timestamp
```

### Redis Data Structures Usage

```redis
# Persona config cache (Hash)
HSET persona:uuid-123 
  name "Market Analysis AI"
  role "market_analyst"
  config '{"temperature": 0.7}'
  kbs '["kb1", "kb2"]'
EXPIRE persona:uuid-123 3600

# Conversation message cache (List)
LPUSH conversation:uuid-456:messages '{"role": "user", "content": "..."}'
LTRIM conversation:uuid-456:messages 0 9  # Keep last 10 messages
EXPIRE conversation:uuid-456:messages 300

# Rate limiting (String with INCR)
INCR rate_limit:org:uuid-789:minute:202607291030
EXPIRE rate_limit:org:uuid-789:minute:202607291030 60

# Online users (Sorted Set)
ZADD online:org:uuid-789 1722250200 user-uuid-1
ZADD online:org:uuid-789 1722250205 user-uuid-2
ZREMRANGEBYSCORE online:org:uuid-789 0 (NOW - 300)  # Remove inactive > 5min

# Pub/Sub for real-time updates
PUBLISH persona:uuid-123:updates '{"event": "kb_added", "kb_id": "new-kb"}'
PUBLISH conversation:uuid-456:events '{"type": "new_message", "message_id": "..."}'
```

---

## Database Functions & Triggers

### 1. Update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for: users, knowledge_bases, personas, conversations, etc.
```

### 2. Audit log trigger

```sql
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        current_setting('app.current_user_id', true)::UUID,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to auditable tables
CREATE TRIGGER audit_personas
    AFTER INSERT OR UPDATE OR DELETE ON personas
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();
```

### 3. Quota enforcement

```sql
CREATE OR REPLACE FUNCTION check_persona_quota()
RETURNS TRIGGER AS $$
DECLARE
    org_max INTEGER;
    org_current INTEGER;
BEGIN
    SELECT max_personas, current_personas 
    INTO org_max, org_current
    FROM organizations 
    WHERE id = NEW.organization_id;
    
    IF org_current >= org_max THEN
        RAISE EXCEPTION 'Persona quota exceeded for organization';
    END IF;
    
    UPDATE organizations 
    SET current_personas = current_personas + 1 
    WHERE id = NEW.organization_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_persona_quota
    BEFORE INSERT ON personas
    FOR EACH ROW EXECUTE FUNCTION check_persona_quota();
```

### 4. Conversation statistics update

```sql
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        message_count = message_count + 1,
        last_message_at = NEW.created_at,
        total_tokens = total_tokens + COALESCE(NEW.tokens_input, 0) + COALESCE(NEW.tokens_output, 0),
        total_cost = total_cost + COALESCE(NEW.cost, 0)
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conv_stats_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
```

---

## Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's data
CREATE POLICY org_isolation_conversations ON conversations
    FOR ALL
    USING (
        organization_id = current_setting('app.current_org_id', true)::UUID
    );

CREATE POLICY org_isolation_personas ON personas
    FOR ALL
    USING (
        organization_id = current_setting('app.current_org_id', true)::UUID
    );

-- Policy: Users can only see conversations they participate in
CREATE POLICY user_own_conversations ON conversations
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)::UUID
        OR
        EXISTS (
            SELECT 1 FROM org_members
            WHERE organization_id = conversations.organization_id
            AND user_id = current_setting('app.current_user_id', true)::UUID
            AND role IN ('owner', 'admin')
        )
    );

-- Policy: Persona access based on permissions
CREATE POLICY persona_access ON personas
    FOR SELECT
    USING (
        created_by = current_setting('app.current_user_id', true)::UUID
        OR
        visibility = 'organization'
        OR
        EXISTS (
            SELECT 1 FROM persona_permissions
            WHERE persona_id = personas.id
            AND user_id = current_setting('app.current_user_id', true)::UUID
            AND can_view_config = TRUE
        )
    );
```

---

## Indexes Summary

### Critical Performance Indexes

```sql
-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_tier);

-- Users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Org Members
CREATE INDEX idx_org_members_org ON org_members(organization_id, status);
CREATE INDEX idx_org_members_user ON org_members(user_id, status);

-- Knowledge Bases
CREATE INDEX idx_kb_org ON knowledge_bases(organization_id, status);
CREATE INDEX idx_kb_sync ON knowledge_bases(next_sync_at) WHERE sync_enabled = TRUE;

-- Personas
CREATE INDEX idx_personas_org ON personas(organization_id, status);
CREATE INDEX idx_personas_visibility ON personas(visibility, status);

-- Persona Knowledge Bases
CREATE INDEX idx_persona_kb_persona ON persona_knowledge_bases(persona_id, is_active);
CREATE INDEX idx_persona_kb_priority ON persona_knowledge_bases(persona_id, priority DESC);

-- Conversations
CREATE INDEX idx_conversations_user_persona ON conversations(user_id, persona_id, status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Message Sources
CREATE INDEX idx_message_sources_message ON message_sources(message_id);

-- Analytics
CREATE INDEX idx_analytics_events_org ON analytics_events(organization_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, event_name, created_at DESC);
```

---

## Database Maintenance

### Vacuum & Analyze Schedule

```sql
-- Regular maintenance (run via cron)
VACUUM ANALYZE organizations;
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
VACUUM ANALYZE knowledge_embeddings;

-- Full vacuum (monthly, during low-traffic)
VACUUM FULL messages;
```

### Partitioning Strategy (for scale)

```sql
-- Partition audit_log by month
CREATE TABLE audit_log (
    id UUID DEFAULT gen_random_uuid(),
    -- ... columns ...
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Auto-create partitions via cron
CREATE EXTENSION IF NOT EXISTS pg_partman;
SELECT partman.create_parent('public.audit_log', 'created_at', 'native', 'monthly');
```

---

## Backup & Recovery Strategy

### 1. PostgreSQL Backups

```bash
# Daily automated backups
pg_dump -Fc -d market_analysis > backup_$(date +%Y%m%d).dump

# Point-in-time recovery (PITR) with WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### 2. Vector DB Backups

```bash
# Weaviate backup
weaviate-backup create --include-collections KnowledgeChunk

# pgvector (included in PostgreSQL backup)
```

### 3. Redis Persistence

```conf
# redis.conf
save 900 1      # Save after 900 sec if at least 1 key changed
save 300 10     # Save after 300 sec if at least 10 keys changed
save 60 10000   # Save after 60 sec if at least 10000 keys changed

appendonly yes  # AOF for durability
```

---

## Migration Strategy

### Initial Schema Setup

```sql
-- migrations/001_initial_schema.sql
-- Execute all CREATE TABLE statements in order

-- migrations/002_indexes.sql
-- Create all indexes

-- migrations/003_triggers_functions.sql
-- Create functions and triggers

-- migrations/004_rls_policies.sql
-- Enable RLS and create policies

-- migrations/005_seed_data.sql
-- Insert default data (roles, permissions templates, etc.)
```

### Schema Versioning

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track each migration
INSERT INTO schema_migrations (version, name) 
VALUES (1, 'initial_schema');
```

---

## Performance Considerations

### Connection Pooling

```javascript
// Example using node-postgres
const pool = new Pool({
  host: 'localhost',
  database: 'market_analysis',
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization Tips

1. **Use EXPLAIN ANALYZE** for slow queries
2. **Materialize frequently-accessed views**
3. **Use partial indexes** for filtered queries
4. **Batch inserts** for analytics events
5. **Use JSONB indexes** for metadata queries

```sql
-- Example: Partial index for active personas
CREATE INDEX idx_personas_active 
    ON personas(organization_id, created_at DESC) 
    WHERE status = 'active' AND deleted_at IS NULL;

-- Example: JSONB index for metadata queries
CREATE INDEX idx_personas_metadata_features 
    ON personas USING gin((metadata -> 'features'));
```

---

## Estimated Database Sizes

### For 1000 Organizations (avg 50 users each)

| Entity | Count | Avg Size | Total Size |
|--------|-------|----------|------------|
| Organizations | 1,000 | 2 KB | 2 MB |
| Users | 50,000 | 1 KB | 50 MB |
| Knowledge Bases | 5,000 | 5 KB | 25 MB |
| KB Files | 50,000 | 2 KB | 100 MB |
| Personas | 15,000 | 3 KB | 45 MB |
| Conversations | 500,000 | 1 KB | 500 MB |
| Messages | 10,000,000 | 2 KB | 20 GB |
| Message Sources | 30,000,000 | 0.5 KB | 15 GB |
| Embeddings | 5,000,000 | 6 KB | 30 GB |
| Audit Log | 100,000,000 | 1 KB | 100 GB |
| **TOTAL** | | | **~166 GB** |

### Vector Database Size

```
Embeddings: 5M chunks × (1536 dim × 4 bytes + metadata) ≈ 35 GB
Index overhead (HNSW): ~20% ≈ 7 GB
Total: ~42 GB
```

### Redis Memory

```
Sessions: 50K × 5 KB = 250 MB
Caches: ~1 GB (varies by traffic)
Total: ~1.5 GB
```

---

## Database Access Patterns

### Read-Heavy Operations (95% of traffic)
- Conversation history retrieval
- Vector similarity search
- Persona configuration loading
- Message display

### Write-Heavy Operations (5% of traffic)
- Message creation
- Analytics events
- Audit logging
- Feedback submission

### Optimization Strategy
- Read replicas for queries
- Write to primary only
- Cache heavily-accessed configs
- Batch analytics writes

---

## Security Best Practices

1. **Encryption at Rest**: Enable PostgreSQL encryption
2. **Encryption in Transit**: Force SSL connections
3. **Credential Management**: Use AWS Secrets Manager or HashiCorp Vault
4. **API Keys**: Store in encrypted JSONB fields
5. **PII Handling**: Mark sensitive fields, comply with GDPR
6. **Access Control**: RLS + application-level permissions
7. **Audit Everything**: Comprehensive audit logs
8. **Regular Backups**: Automated with off-site storage
9. **SQL Injection Prevention**: Use parameterized queries
10. **Rate Limiting**: Redis-based rate limits per org

---

## Conclusion

This database design provides:
- ✅ **Scalability**: Partitioning, read replicas, caching
- ✅ **Performance**: Optimized indexes, vector search
- ✅ **Security**: RLS, encryption, audit trails
- ✅ **Flexibility**: JSONB for evolving schemas
- ✅ **Multi-tenancy**: Organization-level isolation
- ✅ **Analytics**: Comprehensive event tracking
- ✅ **Reliability**: Backup strategy, constraints

The schema supports the full AI persona lifecycle from creation to conversation, with robust knowledge management and sharing capabilities.
