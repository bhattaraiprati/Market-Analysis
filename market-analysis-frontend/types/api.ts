// User & Auth Types
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  profilePicture?: string;
  organizationId?: string;
  organizationName?: string;
  organizationStatus?: string;
  organization?: Organization | null;
  isVerified?: boolean;
  status?: string;
  created_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  industry: string;
  description?: string;
  website?: string;
  product_or_service?: string;
  target_customers?: string;
  business_goals?: string;
  current_challenges?: string;
  known_competitors?: string[];
  company_size?: string;
  location?: string;
  owner_id: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: string;
  expiresAt: number;
  message: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateOrganizationDto {
  name: string;
  description?: string;
  industry: string;
  website?: string;
  product_or_service: string;
  target_customers: string;
  business_goals: string;
  current_challenges?: string;
  known_competitors?: string[];
  company_size?: string;
  location?: string;
}

export interface UserProfile {
  user: User;
  organization?: Organization | null;
}

// Knowledge Base Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
  type?: string;
  status?: string;
  indexing_status?: string;
  file_count?: number;
  total_documents?: number;
  total_chunks?: number;
  total_tokens?: number | string;
  indexed_at?: string | null;
  usage_count?: number;
  last_used_at?: string | null;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

export interface KBFile {
  id: string;
  knowledge_base_id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number | string;
  mime_type: string;
  storage_url?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string | null;
  processed_at?: string | null;
  chunk_count: number;
  chunk_strategy?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  indexed?: boolean;
  indexed_at?: string | null;
  uploaded_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateKnowledgeBaseDto {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
}

// Persona Types
export type PersonaRole =
  | 'COMPETITIVE_ANALYST'
  | 'MARKET_RESEARCHER'
  | 'CUSTOMER_SUCCESS_EXPERT'
  | 'BUSINESS_STRATEGIST'
  | 'GENERAL_ASSISTANT';

export interface Persona {
  id: string;
  name: string;
  description?: string;
  primary_focus_role: PersonaRole;
  web_search_enabled: boolean;
  external_data_sources_enabled: boolean;
  status: PersonaStatus;
  public_link_enabled?: boolean;
  public_link_token?: string | null;
  knowledge_bases?: Array<{
    id: string;
    name: string;
  }>;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CreatePersonaDto {
  name: string;
  description?: string;
  primary_focus_role: PersonaRole;
  knowledge_base_ids?: string[];
  web_search_enabled?: boolean;
  external_data_sources_enabled?: boolean;
}

export type PersonaStatus = 'active' | 'draft' | 'archived';

export interface UpdatePersonaDto extends Partial<CreatePersonaDto> {
  status?: PersonaStatus;
}

// Conversation Types
export interface Conversation {
  id: string;
  persona_id: string;
  persona_name?: string;
  user_id: string;
  organization_id: string;
  title: string;
  status: 'active' | 'archived';
  last_message_at?: string;
  total_messages: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rating?: number;
  feedback?: string;
  sources_used?: Array<{
    type: 'KNOWLEDGE_BASE' | 'WEB_SEARCH' | 'EXTERNAL_API';
    reference: string;
    relevance_score?: number;
  }>;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  persona: {
    id: string;
    name: string;
  };
  messages: Message[];
}

export interface StartConversationResult {
  conversation: Conversation;
  message: Message;
}

// Research Types
export type ResearchType = 'COMPETITOR' | 'MARKET' | 'CUSTOMER' | 'COMPREHENSIVE';
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface ResearchJob {
  id: string;
  research_type: ResearchType;
  status: JobStatus;
  created_at: string;
  completed_at?: string;
  organization_id: string;
  output_results?: any;
}

export interface StartResearchDto {
  researchType: ResearchType;
  parameters?: {
    focusAreas?: string[];
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  count?: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
