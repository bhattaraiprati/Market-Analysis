import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, RegisterDto, LoginDto, CreateOrganizationDto } from '@/types/api';
import { authApi } from '../api/auth';

interface AuthState {
  // State
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (data: RegisterDto) => Promise<void>;
  login: (data: LoginDto) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  createOrganization: (data: CreateOrganizationDto) => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Register
      register: async (data: RegisterDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          // After registration, user needs to login
          set({
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message ||
            (Array.isArray(error.response?.data?.message)
              ? error.response?.data?.message[0]
              : 'Registration failed');
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Login
      login: async (data: LoginDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load full profile including organization
          await get().loadProfile();
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || 'Invalid email or password';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      // Logout
      logout: () => {
        authApi.logout();
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Load user profile
      loadProfile: async () => {
        set({ isLoading: true });
        try {
          const profile = await authApi.getProfile();
          set({
            user: profile.user,
            organization: profile.organization,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            organization: null,
          });
          throw error;
        }
      },

      // Create organization
      createOrganization: async (data: CreateOrganizationDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.createOrganization(data);
          set({
            organization: response.organization,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || 'Failed to create organization';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Check authentication status
      checkAuth: async () => {
        if (!authApi.hasToken()) {
          set({
            isAuthenticated: false,
            user: null,
            organization: null,
          });
          return false;
        }

        try {
          await get().loadProfile();
          return true;
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            organization: null,
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
