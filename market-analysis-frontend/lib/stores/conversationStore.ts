import { create } from 'zustand';
import {
  Conversation,
  ConversationWithMessages,
  Message,
} from '@/types/api';
import { conversationApi } from '../api/conversation';

interface ConversationState {
  // State
  conversations: Conversation[];
  currentConversation: ConversationWithMessages | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  fetchConversations: (personaId?: string) => Promise<void>;
  fetchConversationById: (id: string) => Promise<void>;
  createConversation: (data: { persona_id: string; title?: string }) => Promise<Conversation>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  rateMessage: (
    conversationId: string,
    messageId: string,
    data: { rating: 1 | 2 | 3 | 4 | 5; feedback?: string }
  ) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setCurrentConversation: (conversation: ConversationWithMessages | null) => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isSending: false,
  error: null,

  // Fetch all conversations
  fetchConversations: async (personaId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await conversationApi.getAll(personaId);
      set({ conversations: response.data || [], isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch conversations';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch conversation by ID
  fetchConversationById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await conversationApi.getById(id);
      set({ currentConversation: response.data || null, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Create new conversation
  createConversation: async (data: { persona_id: string; title?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await conversationApi.create(data);
      const newConversation = response.data!;
      set((state) => ({
        conversations: [...state.conversations, newConversation],
        isLoading: false,
      }));
      return newConversation;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Send message
  sendMessage: async (conversationId: string, content: string) => {
    set({ isSending: true, error: null });
    try {
      await conversationApi.sendMessage(conversationId, content);

      // Optionally refresh conversation to get AI response
      // You might want to implement polling or WebSocket here
      setTimeout(async () => {
        await get().fetchConversationById(conversationId);
        set({ isSending: false });
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      set({ error: errorMessage, isSending: false });
      throw error;
    }
  },

  // Rate message
  rateMessage: async (
    conversationId: string,
    messageId: string,
    data: { rating: 1 | 2 | 3 | 4 | 5; feedback?: string }
  ) => {
    set({ isLoading: true, error: null });
    try {
      await conversationApi.rateMessage(conversationId, messageId, data);

      // Update the message in current conversation
      set((state) => {
        if (!state.currentConversation) return state;

        const updatedMessages = state.currentConversation.messages.map((msg) =>
          msg.id === messageId
            ? { ...msg, rating: data.rating, feedback: data.feedback }
            : msg
        );

        return {
          currentConversation: {
            ...state.currentConversation,
            messages: updatedMessages,
          },
          isLoading: false,
        };
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to rate message';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Archive conversation
  archiveConversation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await conversationApi.archive(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id ? null : state.currentConversation,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to archive conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete conversation
  deleteConversation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await conversationApi.delete(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id ? null : state.currentConversation,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Set current conversation
  setCurrentConversation: (conversation: ConversationWithMessages | null) => {
    set({ currentConversation: conversation });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
