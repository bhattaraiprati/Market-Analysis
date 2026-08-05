import { axiosInstance, apiClient } from './client';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UserProfile,
  CreateOrganizationDto,
  ApiResponse,
  Organization,
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
    const response = await axiosInstance.get<UserProfile>('/auth/profile');
    return response.data;
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
    const response = await axiosInstance.post<{
      message: string;
      organization: Organization;
    }>('/auth/organization', data);
    return response.data;
  },

  // Check if user has token
  hasToken: () => {
    return apiClient.hasToken();
  },
};
