import { create } from 'zustand';
import { KnowledgeBase, CreateKnowledgeBaseDto, KBFile } from '@/types/api';
import { knowledgeBaseApi } from '../api/knowledgeBase';

interface KnowledgeBaseState {
  // State
  knowledgeBases: KnowledgeBase[];
  currentKB: (KnowledgeBase & { files?: KBFile[] }) | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;

  // Actions
  fetchKnowledgeBases: () => Promise<void>;
  fetchKBById: (id: string) => Promise<void>;
  createKB: (data: CreateKnowledgeBaseDto) => Promise<KnowledgeBase>;
  updateKB: (id: string, data: Partial<CreateKnowledgeBaseDto>) => Promise<void>;
  deleteKB: (id: string) => Promise<void>;
  uploadFile: (kbId: string, file: File) => Promise<void>;
  queryKB: (data: {
    query: string;
    knowledge_base_ids?: string[];
    top_k?: number;
    min_score?: number;
  }) => Promise<any>;
  getStatistics: (id: string) => Promise<any>;
  deleteFile: (kbId: string, fileId: string) => Promise<void>;
  setCurrentKB: (kb: KnowledgeBase | null) => void;
  clearError: () => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set, get) => ({
  // Initial state
  knowledgeBases: [],
  currentKB: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,

  // Fetch all knowledge bases
  fetchKnowledgeBases: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeBaseApi.getAll();
      set({ knowledgeBases: response.data || [], isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch knowledge bases';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch KB by ID
  fetchKBById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeBaseApi.getById(id);
      set({ currentKB: response.data || null, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Create new KB
  createKB: async (data: CreateKnowledgeBaseDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeBaseApi.create(data);
      const newKB = response.data!;
      set((state) => ({
        knowledgeBases: [...state.knowledgeBases, newKB],
        isLoading: false,
      }));
      return newKB;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Update KB
  updateKB: async (id: string, data: Partial<CreateKnowledgeBaseDto>) => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeBaseApi.update(id, data);
      set((state) => ({
        knowledgeBases: state.knowledgeBases.map((kb) =>
          kb.id === id ? { ...kb, ...data } : kb
        ),
        currentKB:
          state.currentKB?.id === id
            ? { ...state.currentKB, ...data }
            : state.currentKB,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete KB
  deleteKB: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeBaseApi.delete(id);
      set((state) => ({
        knowledgeBases: state.knowledgeBases.filter((kb) => kb.id !== id),
        currentKB: state.currentKB?.id === id ? null : state.currentKB,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Upload one file
  uploadFile: async (kbId: string, file: File) => {
    set({ isUploading: true, uploadProgress: 0, error: null });
    try {
      await knowledgeBaseApi.uploadFile(kbId, file, (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        set({ uploadProgress: progress });
      });

      // Refresh KB data after upload
      await get().fetchKBById(kbId);
      set({ isUploading: false, uploadProgress: 0 });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to upload file';
      set({ error: errorMessage, isUploading: false, uploadProgress: 0 });
      throw error;
    }
  },

  // Query KB
  queryKB: async (data: {
    query: string;
    knowledge_base_ids?: string[];
    top_k?: number;
    min_score?: number;
  }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeBaseApi.query(data);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to query knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Get statistics
  getStatistics: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await knowledgeBaseApi.getStatistics(id);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to get statistics';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete file
  deleteFile: async (kbId: string, fileId: string) => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeBaseApi.deleteFile(kbId, fileId);

      // Refresh KB data after deletion
      await get().fetchKBById(kbId);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete file';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Set current KB
  setCurrentKB: (kb: KnowledgeBase | null) => {
    set({ currentKB: kb });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
