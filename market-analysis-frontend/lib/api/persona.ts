import { axiosInstance } from './client';
import {
  Persona,
  CreatePersonaDto,
  UpdatePersonaDto,
  ApiResponse,
  RecommendedPrompt,
} from '@/types/api';

export const personaApi = {
  // Create new persona
  create: async (data: CreatePersonaDto) => {
    const response = await axiosInstance.post<ApiResponse<Persona>>('/personas', data);
    return response.data;
  },

  // Get all personas
  getAll: async () => {
    const response = await axiosInstance.get<ApiResponse<Persona[]>>('/personas');
    return response.data;
  },

  // Get persona by ID
  getById: async (id: string) => {
    const response = await axiosInstance.get<ApiResponse<Persona>>(`/personas/${id}`);
    return response.data;
  },

  // Get personalized starter prompts for a persona
  getRecommendedPrompts: async (id: string) => {
    const response = await axiosInstance.get<ApiResponse<RecommendedPrompt[]>>(
      `/personas/${id}/recommended-prompts`
    );
    return response.data;
  },

  // Update persona
  update: async (id: string, data: UpdatePersonaDto) => {
    const response = await axiosInstance.patch<ApiResponse<Persona>>(
      `/personas/${id}`,
      data
    );
    return response.data;
  },

  // Delete persona
  delete: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/personas/${id}`);
    return response.data;
  },

  // Share persona with users
  share: async (id: string, data: { user_ids: string[]; permission_type: 'VIEW' | 'EDIT' }) => {
    const response = await axiosInstance.post<ApiResponse<any>>(
      `/personas/${id}/share`,
      data
    );
    return response.data;
  },

  // Generate public link
  generatePublicLink: async (id: string) => {
    const response = await axiosInstance.post<ApiResponse<{
      public_link_token: string;
      public_link_enabled: boolean;
      public_link_url: string;
    }>>(`/personas/${id}/generate-link/public`);
    return response.data;
  },

  // Generate organization link
  generateOrgLink: async (id: string) => {
    const response = await axiosInstance.post<ApiResponse<{
      organization_link_token: string;
      organization_link_enabled: boolean;
      organization_link_url: string;
    }>>(`/personas/${id}/generate-link/organization`);
    return response.data;
  },

  // Disable public link
  disablePublicLink: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/personas/${id}/link/public`
    );
    return response.data;
  },

  // Disable organization link
  disableOrgLink: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/personas/${id}/link/organization`
    );
    return response.data;
  },

  // Get persona by public link
  getByPublicLink: async (token: string) => {
    const response = await axiosInstance.get<ApiResponse<Persona>>(
      `/personas/public/${token}`
    );
    return response.data;
  },

  // Get persona by organization link
  getByOrgLink: async (token: string) => {
    const response = await axiosInstance.get<ApiResponse<Persona>>(
      `/personas/org/${token}`
    );
    return response.data;
  },

  // Assign knowledge base to persona
  assignKnowledgeBase: async (personaId: string, knowledgeBaseId: string) => {
    const response = await axiosInstance.post<ApiResponse<any>>(
      `/personas/${personaId}/knowledge-bases`,
      { knowledge_base_id: knowledgeBaseId }
    );
    return response.data;
  },

  // Remove knowledge base from persona
  removeKnowledgeBase: async (personaId: string, kbId: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/personas/${personaId}/knowledge-bases/${kbId}`
    );
    return response.data;
  },
};
