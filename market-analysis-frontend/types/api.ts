// User & Auth Types
export interface User {
  id: string;
  name: string;
  email: string;
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
  access_token: string;
  user: User;
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
  organization: Organization | null;
}

// Knowledge Base Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
  file_count?: number;
  total_chunks?: number;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

export interface KBFile {
  id: string;
  file_name: string;
  file_type: 'PDF' | 'DOCX' | 'TXT';
  file_size: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  chunk_count?: number;
  uploaded_at: string;
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
  avatar_url?: string;
  system_prompt?: string;
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
  avatar_url?: string;
  system_prompt?: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  persona_id: string;
  persona_name?: string;
  user_id: string;
  organization_id: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED';
  last_message_at?: string;
  message_count?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
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
    avatar_url?: string;
  };
  messages: Message[];
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
