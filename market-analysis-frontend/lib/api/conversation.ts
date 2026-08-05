import { axiosInstance } from './client';
import {
  Conversation,
  ConversationWithMessages,
  Message,
  ApiResponse,
} from '@/types/api';

export const conversationApi = {
  // Create new conversation
  create: async (data: { persona_id: string; title?: string }) => {
    const response = await axiosInstance.post<ApiResponse<Conversation>>(
      '/conversations',
      data
    );
    return response.data;
  },

  // Get all conversations
  getAll: async (personaId?: string) => {
    const params = personaId ? { persona_id: personaId } : {};
    const response = await axiosInstance.get<ApiResponse<Conversation[]>>(
      '/conversations',
      { params }
    );
    return response.data;
  },

  // Get conversation with messages
  getById: async (id: string) => {
    const response = await axiosInstance.get<ApiResponse<ConversationWithMessages>>(
      `/conversations/${id}`
    );
    return response.data;
  },

  // Send message
  sendMessage: async (conversationId: string, content: string) => {
    const response = await axiosInstance.post<ApiResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  },

  // Rate message
  rateMessage: async (
    conversationId: string,
    messageId: string,
    data: { rating: 1 | 2 | 3 | 4 | 5; feedback?: string }
  ) => {
    const response = await axiosInstance.post<ApiResponse<void>>(
      `/conversations/${conversationId}/messages/${messageId}/rate`,
      data
    );
    return response.data;
  },

  // Archive conversation
  archive: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/conversations/${id}/archive`
    );
    return response.data;
  },

  // Delete conversation
  delete: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/conversations/${id}`
    );
    return response.data;
  },
};
