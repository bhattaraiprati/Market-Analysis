import { create } from 'zustand';
import { Persona, CreatePersonaDto, UpdatePersonaDto } from '@/types/api';
import { personaApi } from '../api/persona';

interface PersonaState {
  // State
  personas: Persona[];
  currentPersona: Persona | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPersonas: () => Promise<void>;
  fetchPersonaById: (id: string) => Promise<Persona>;
  createPersona: (data: CreatePersonaDto) => Promise<Persona>;
  updatePersona: (id: string, data: UpdatePersonaDto) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  sharePersona: (id: string, data: { user_ids: string[]; permission_type: 'VIEW' | 'EDIT' }) => Promise<void>;
  generatePublicLink: (id: string) => Promise<{ public_link_url: string }>;
  generateOrgLink: (id: string) => Promise<{ organization_link_url: string }>;
  disablePublicLink: (id: string) => Promise<void>;
  disableOrgLink: (id: string) => Promise<void>;
  assignKnowledgeBase: (personaId: string, kbId: string) => Promise<void>;
  removeKnowledgeBase: (personaId: string, kbId: string) => Promise<void>;
  setCurrentPersona: (persona: Persona | null) => void;
  clearError: () => void;
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  // Initial state
  personas: [],
  currentPersona: null,
  isLoading: false,
  error: null,

  // Fetch all personas
  fetchPersonas: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await personaApi.getAll();
      set({ personas: response.data || [], isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch personas';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch persona by ID
  fetchPersonaById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await personaApi.getById(id);
      const persona = response.data!;
      set({ currentPersona: persona, isLoading: false });
      return persona;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch persona';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Create new persona
  createPersona: async (data: CreatePersonaDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await personaApi.create(data);
      const newPersona = response.data!;
      set((state) => ({
        personas: [...state.personas, newPersona],
        isLoading: false,
      }));
      return newPersona;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create persona';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Update persona
  updatePersona: async (id: string, data: Partial<CreatePersonaDto>) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.update(id, data);
      set((state) => ({
        personas: state.personas.map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
        currentPersona:
          state.currentPersona?.id === id
            ? { ...state.currentPersona, ...data }
            : state.currentPersona,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update persona';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete persona
  deletePersona: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.delete(id);
      set((state) => ({
        personas: state.personas.filter((p) => p.id !== id),
        currentPersona: state.currentPersona?.id === id ? null : state.currentPersona,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete persona';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Share persona
  sharePersona: async (id: string, data: { user_ids: string[]; permission_type: 'VIEW' | 'EDIT' }) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.share(id, data);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to share persona';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Generate public link
  generatePublicLink: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await personaApi.generatePublicLink(id);
      set({ isLoading: false });
      return { public_link_url: response.data!.public_link_url };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate public link';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Generate organization link
  generateOrgLink: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await personaApi.generateOrgLink(id);
      set({ isLoading: false });
      return { organization_link_url: response.data!.organization_link_url };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate organization link';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Disable public link
  disablePublicLink: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.disablePublicLink(id);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to disable public link';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Disable organization link
  disableOrgLink: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.disableOrgLink(id);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to disable organization link';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Assign knowledge base
  assignKnowledgeBase: async (personaId: string, kbId: string) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.assignKnowledgeBase(personaId, kbId);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Remove knowledge base
  removeKnowledgeBase: async (personaId: string, kbId: string) => {
    set({ isLoading: true, error: null });
    try {
      await personaApi.removeKnowledgeBase(personaId, kbId);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove knowledge base';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Set current persona
  setCurrentPersona: (persona: Persona | null) => {
    set({ currentPersona: persona });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
