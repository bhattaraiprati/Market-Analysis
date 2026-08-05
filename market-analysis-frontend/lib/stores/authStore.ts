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

          // Check if user already has organization from login response
          const hasOrganization = response.user.organizationId != null;

          set({
            user: response.user,
            organization: hasOrganization ? {
              id: response.user.organizationId!,
              name: response.user.organizationName || '',
              industry: '',
              owner_id: response.user.id,
            } as Organization : null,
            isAuthenticated: true,
            error: null,
          });

          // Ensure token is saved before loading profile
          // Add a small delay to ensure localStorage write completes
          await new Promise(resolve => setTimeout(resolve, 100));

          // Load full profile including organization details
          try {
            await get().loadProfile();
          } catch (profileError) {
            // If profile load fails, we still have basic user info from login
            console.error('Failed to load full profile:', profileError);
          }

          set({ isLoading: false });
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

          // Handle organization data from either profile.organization or user object
          let organization = profile.organization || null;

          if (!organization && profile.user.organizationId) {
            organization = {
              id: profile.user.organizationId,
              name: profile.user.organizationName || '',
              industry: '',
              owner_id: profile.user.id,
            } as Organization;
          }

          set({
            user: profile.user,
            organization: organization,
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
