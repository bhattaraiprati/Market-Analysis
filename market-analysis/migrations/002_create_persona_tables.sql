-- Persona System Migration

CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_focus_role VARCHAR(50) NOT NULL CHECK (primary_focus_role IN ('sales', 'marketing', 'customer_support', 'product', 'engineering', 'finance', 'operations', 'hr', 'general')),
    web_search_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    external_data_sources_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    model_name VARCHAR(100) NOT NULL DEFAULT 'claude-3-5-sonnet-20240620',
    model_parameters JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
    public_link_token VARCHAR(255) UNIQUE,
    organization_link_token VARCHAR(255) UNIQUE,
    public_link_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    organization_link_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    total_conversations INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,
    avg_rating DECIMAL(3,2),
    last_used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS persona_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 2),
    max_chunks INTEGER NOT NULL DEFAULT 10,
    min_similarity DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT unique_persona_kb UNIQUE(persona_id, knowledge_base_id)
);

CREATE TABLE IF NOT EXISTS persona_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL CHECK (access_level IN ('viewer', 'user', 'contributor', 'co-owner')),
    can_chat BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_config BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_config BOOLEAN NOT NULL DEFAULT FALSE,
    can_add_knowledge BOOLEAN NOT NULL DEFAULT FALSE,
    can_share BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_or_role_check CHECK ((user_id IS NOT NULL AND role IS NULL) OR (user_id IS NULL AND role IS NOT NULL))
);

CREATE INDEX idx_personas_org ON personas(organization_id, status);
CREATE INDEX idx_personas_created_by ON personas(created_by);
CREATE INDEX idx_personas_visibility ON personas(visibility, status);
CREATE INDEX idx_personas_public_link ON personas(public_link_token) WHERE public_link_enabled = TRUE;
CREATE INDEX idx_personas_org_link ON personas(organization_link_token) WHERE organization_link_enabled = TRUE;
CREATE INDEX idx_persona_kb_persona ON persona_knowledge_bases(persona_id, is_active);
CREATE INDEX idx_persona_kb_kb ON persona_knowledge_bases(knowledge_base_id, is_active);
CREATE INDEX idx_persona_perms_persona ON persona_permissions(persona_id);
CREATE INDEX idx_persona_perms_user ON persona_permissions(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_persona_permissions_updated_at BEFORE UPDATE ON persona_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
