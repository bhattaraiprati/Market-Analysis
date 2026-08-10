import { create } from 'zustand';
import axios from 'axios';
import {
  Conversation,
  ConversationWithMessages,
} from '@/types/api';
import { conversationApi } from '../api/conversation';

function getConversationError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

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
  startConversation: (personaId: string, content: string) => Promise<Conversation>;
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
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to fetch conversations');
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
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to fetch conversation');
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Create a room from the first message; selecting a persona alone does not
  // create any database record.
  startConversation: async (personaId: string, content: string) => {
    set({ isSending: true, error: null });
    try {
      const response = await conversationApi.start({
        persona_id: personaId,
        content,
      });
      const newConversation = response.data!.conversation;
      set((state) => ({
        conversations: [newConversation, ...state.conversations],
      }));

      await get().fetchConversationById(newConversation.id);
      set({ isSending: false });
      return newConversation;
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to create conversation');
      set({ error: errorMessage, isSending: false });
      throw error;
    }
  },

  // Send message
  sendMessage: async (conversationId: string, content: string) => {
    set({ isSending: true, error: null });
    try {
      await conversationApi.sendMessage(conversationId, content);
      // Refresh immediately to show the saved user message and processing
      // assistant placeholder. The chat page continues polling while needed.
      await get().fetchConversationById(conversationId);
      set({ isSending: false });
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to send message');
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
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to rate message');
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
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to archive conversation');
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
    } catch (error: unknown) {
      const errorMessage = getConversationError(error, 'Failed to delete conversation');
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
