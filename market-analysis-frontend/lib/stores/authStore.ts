import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Organization,
  RegisterDto,
  LoginDto,
  CreateOrganizationDto,
} from '@/types/api';
import { authApi } from '../api/auth';

type ApiRequestError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const message = (error as ApiRequestError).response?.data?.message;

  if (Array.isArray(message)) return message[0] || fallback;
  if (message) return message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

let organizationRequestSequence = 0;

interface AuthState {
  // State
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isOrganizationLoading: boolean;
  organizationError: string | null;

  // Actions
  register: (data: RegisterDto) => Promise<void>;
  login: (data: LoginDto) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  loadOrganization: () => Promise<void>;
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
      isOrganizationLoading: false,
      organizationError: null,

      // Register
      register: async (data: RegisterDto) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register(data);
          // After registration, user needs to login
          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = getApiErrorMessage(error, 'Registration failed');
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
          const loginOrganization = response.user.organization ?? null;
          const hasOrganization = loginOrganization != null || response.user.organizationId != null;

          set({
            user: response.user,
            organization: loginOrganization ?? (hasOrganization ? {
              id: response.user.organizationId!,
              name: response.user.organizationName || '',
              industry: '',
              owner_id: response.user.id,
            } as Organization : null),
            isAuthenticated: true,
            error: null,
          });

          // Load full profile including organization details
          try {
            await get().loadProfile();
          } catch (profileError) {
            // If profile load fails, we still have basic user info from login
            console.error('Failed to load full profile:', profileError);
          }

          set({ isLoading: false });
        } catch (error) {
          const errorMessage = getApiErrorMessage(error, 'Invalid email or password');
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
        organizationRequestSequence += 1;
        authApi.logout();
        localStorage.removeItem('access_token');
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          error: null,
          isOrganizationLoading: false,
          organizationError: null,
        });
      },

      // Load user profile
      loadProfile: async () => {
        set({ isLoading: true });
        try {
          const profile = await authApi.getProfile();

          // Handle organization data from either profile.organization or user object
          let organization = profile.organization ?? profile.user.organization ?? null;

          if (!organization && profile.user.organizationId) {
            organization = {
              id: profile.user.organizationId,
              name: profile.user.organizationName || '',
              industry: '',
              owner_id: profile.user.id,
            } as Organization;
          }

          // The profile summary currently resolves organizations for owners.
          // Use the member-aware endpoint as a fallback for active members.
          if (!organization) {
            try {
              organization = await authApi.getOrganization();
            } catch {
              // A user without an organization is handled by AuthProvider.
            }
          }

          set({
            user: profile.user,
            organization: organization,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            organization: null,
          });
          throw error;
        }
      },

      // Load the complete public organization profile without blocking auth UI
      loadOrganization: async () => {
        const requestUserId = get().user?.id;
        if (
          get().isOrganizationLoading ||
          !get().isAuthenticated ||
          !requestUserId ||
          !get().organization
        ) {
          return;
        }

        const requestId = ++organizationRequestSequence;
        set({ isOrganizationLoading: true });
        try {
          const organization = await authApi.getOrganization();
          const currentState = get();

          if (
            requestId !== organizationRequestSequence ||
            !currentState.isAuthenticated ||
            currentState.user?.id !== requestUserId
          ) {
            return;
          }

          set({
            organization: {
              ...organization,
              ...(currentState.organization?.memberRole
                ? { memberRole: currentState.organization.memberRole }
                : {}),
            },
            isOrganizationLoading: false,
            organizationError: null,
          });
        } catch (error) {
          const currentState = get();

          if (
            requestId !== organizationRequestSequence ||
            !currentState.isAuthenticated ||
            currentState.user?.id !== requestUserId
          ) {
            return;
          }

          set({
            isOrganizationLoading: false,
            organizationError: getApiErrorMessage(
              error,
              'Failed to fetch organization details'
            ),
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
            // Keep every onboarding field available immediately, even when the
            // create endpoint responds with only the organization's core fields.
            organization: {
              ...data,
              ...response.organization,
              memberRole: 'OWNER',
            },
            isLoading: false,
            error: null,
            organizationError: null,
          });
        } catch (error) {
          const errorMessage = getApiErrorMessage(error, 'Failed to create organization');
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
          organizationRequestSequence += 1;
          set({
            isAuthenticated: false,
            user: null,
            organization: null,
            isOrganizationLoading: false,
            organizationError: null,
          });
          return false;
        }

        try {
          await get().loadProfile();
          return true;
        } catch {
          organizationRequestSequence += 1;
          set({
            isAuthenticated: false,
            user: null,
            organization: null,
            isOrganizationLoading: false,
            organizationError: null,
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
