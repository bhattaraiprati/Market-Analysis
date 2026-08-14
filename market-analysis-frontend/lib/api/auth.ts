import { axiosInstance, apiClient } from './client';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UserProfile,
  User,
  CreateOrganizationDto,
  ApiResponse,
  Organization,
  OrganizationDetailsResponse,
  CreateOrganizationResponse,
} from '@/types/api';

export const authApi = {
  // Register new user
  register: async (data: RegisterDto) => {
    const response = await axiosInstance.post<{
      message: string;
      user: UserProfile['user'];
    }>('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (data: LoginDto) => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
    const { token, user } = response.data;

    // Save token to localStorage and cookie
    apiClient.saveToken(token);

    return { token, user };
  },

  // Logout user
  logout: () => {
    apiClient.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  // Get user profile with organization
  getProfile: async () => {
    type ProfileUser = User & { organization?: Organization | null };
    type ProfilePayload = UserProfile | ProfileUser;

    const response = await axiosInstance.get<
      ProfilePayload | ApiResponse<ProfilePayload>
    >('/auth/profile');

    const responseBody = response.data;
    const profile: ProfilePayload = 'success' in responseBody
      ? responseBody.data!
      : responseBody;

    // Support both API shapes:
    // { user, organization } and { id, name, email, organization }.
    if ('user' in profile) {
      return profile as UserProfile;
    }

    return {
      user: profile,
      organization: profile.organization ?? null,
    } satisfies UserProfile;
  },

  // Verify token
  verifyToken: async () => {
    const response = await axiosInstance.get<{
      message: string;
      user: { id: string; email: string };
    }>('/auth/me');
    return response.data;
  },

  // Create organization
  createOrganization: async (data: CreateOrganizationDto) => {
    const response = await axiosInstance.post<CreateOrganizationResponse>(
      '/auth/organization',
      data
    );
    return response.data;
  },

  // Get the organization details supplied during registration
  getOrganization: async () => {
    const response = await axiosInstance.get<OrganizationDetailsResponse>(
      '/auth/organization'
    );
    const responseBody = response.data;

    if (!responseBody.success || !responseBody.data) {
      throw new Error(responseBody.message || 'Failed to fetch organization details');
    }

    return responseBody.data;
  },

  // Check if user has token
  hasToken: () => {
    return apiClient.hasToken();
  },
};
