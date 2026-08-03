-- Knowledge Base System Migration
-- Run this in your Neon PostgreSQL database

-- ============================================================================
-- 1. CREATE KNOWLEDGE_BASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',

    -- Configuration
    type VARCHAR(50) NOT NULL DEFAULT 'file_upload'
        CHECK (type IN ('file_upload', 'database', 'api', 'hybrid')),
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'processing', 'error', 'archived')),
    visibility VARCHAR(50) NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'team', 'organization')),

    source_config JSONB DEFAULT '{}',

    -- Indexing status
    indexing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_documents INTEGER NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    indexed_at TIMESTAMPTZ,

    -- Statistics
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. CREATE KB_FILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS kb_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,

    -- File info
    original_filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),

    -- Storage
    storage_path VARCHAR(1000) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'cloudinary',
    storage_url VARCHAR(1000),

    -- Processing
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    processed_at TIMESTAMPTZ,

    -- Extraction results
    extracted_text TEXT,
    extracted_metadata JSONB DEFAULT '{}',

    -- Chunking
    chunk_count INTEGER NOT NULL DEFAULT 0,
    chunk_strategy VARCHAR(50) NOT NULL DEFAULT 'sliding_window'
        CHECK (chunk_strategy IN ('sliding_window', 'sentence', 'paragraph', 'semantic')),
    chunk_size INTEGER NOT NULL DEFAULT 512,
    chunk_overlap INTEGER NOT NULL DEFAULT 50,

    -- Indexing
    indexed BOOLEAN NOT NULL DEFAULT FALSE,
    indexed_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Knowledge bases indexes
CREATE INDEX IF NOT EXISTS idx_kb_org
    ON knowledge_bases(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_kb_created_by
    ON knowledge_bases(created_by);

CREATE INDEX IF NOT EXISTS idx_kb_type
    ON knowledge_bases(type, status);

CREATE INDEX IF NOT EXISTS idx_kb_deleted
    ON knowledge_bases(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kb_visibility
    ON knowledge_bases(visibility, status);

-- Full-text search on knowledge bases
CREATE INDEX IF NOT EXISTS idx_kb_search
    ON knowledge_bases
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- KB files indexes
CREATE INDEX IF NOT EXISTS idx_kb_files_kb
    ON kb_files(knowledge_base_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_kb_files_status
    ON kb_files(processing_status)
    WHERE processing_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_kb_files_deleted
    ON kb_files(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kb_files_indexed
    ON kb_files(indexed, indexed_at)
    WHERE indexed = TRUE;

-- ============================================================================
-- 4. CREATE TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_knowledge_bases_updated_at ON knowledge_bases;
CREATE TRIGGER update_knowledge_bases_updated_at
    BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_files_updated_at ON kb_files;
CREATE TRIGGER update_kb_files_updated_at
    BEFORE UPDATE ON kb_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get knowledge base statistics
CREATE OR REPLACE FUNCTION get_kb_statistics(kb_id UUID)
RETURNS TABLE(
    total_files BIGINT,
    total_size_bytes BIGINT,
    completed_files BIGINT,
    processing_files BIGINT,
    failed_files BIGINT,
    total_chunks BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_files,
        SUM(file_size_bytes)::BIGINT as total_size_bytes,
        COUNT(*) FILTER (WHERE processing_status = 'completed')::BIGINT as completed_files,
        COUNT(*) FILTER (WHERE processing_status = 'processing')::BIGINT as processing_files,
        COUNT(*) FILTER (WHERE processing_status = 'failed')::BIGINT as failed_files,
        SUM(chunk_count)::BIGINT as total_chunks
    FROM kb_files
    WHERE knowledge_base_id = kb_id
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update knowledge base statistics after file processing
CREATE OR REPLACE FUNCTION update_kb_stats_after_file()
RETURNS TRIGGER AS $$
DECLARE
    kb_record RECORD;
BEGIN
    -- Only update if file status changed to 'completed'
    IF NEW.processing_status = 'completed' AND
       (OLD.processing_status IS NULL OR OLD.processing_status != 'completed') THEN

        -- Update knowledge base statistics
        UPDATE knowledge_bases
        SET
            total_chunks = total_chunks + NEW.chunk_count,
            indexed_at = NOW()
        WHERE id = NEW.knowledge_base_id;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for auto-updating KB stats
DROP TRIGGER IF EXISTS update_kb_stats_trigger ON kb_files;
CREATE TRIGGER update_kb_stats_trigger
    AFTER INSERT OR UPDATE ON kb_files
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_stats_after_file();

-- ============================================================================
-- 6. GRANT PERMISSIONS (if using specific database users)
-- ============================================================================

-- Grant necessary permissions to your application user
-- Replace 'your_app_user' with your actual database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_bases TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON kb_files TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('knowledge_bases', 'kb_files');

-- Verify indexes were created
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('knowledge_bases', 'kb_files');

-- Verify triggers were created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('knowledge_bases', 'kb_files');

-- ============================================================================
-- 8. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Uncomment to insert sample data for testing
/*
-- Insert a test knowledge base
INSERT INTO knowledge_bases (
    organization_id,
    created_by,
    name,
    description,
    category,
    tags,
    type,
    status,
    visibility
) VALUES (
    'your-org-id-here'::UUID,
    'your-user-id-here'::UUID,
    'Test Knowledge Base',
    'This is a test knowledge base for development',
    'testing',
    ARRAY['test', 'development'],
    'file_upload',
    'active',
    'private'
);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Check if migration was successful
DO $$
BEGIN
    RAISE NOTICE 'Knowledge Base tables created successfully!';
    RAISE NOTICE 'Run verification queries to confirm everything is set up correctly.';
END $$;
