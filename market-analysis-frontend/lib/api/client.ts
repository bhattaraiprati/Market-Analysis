import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor - Add token to requests
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();

          // Only redirect if not already on auth pages
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (!['/login', '/register'].includes(currentPath)) {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Check both localStorage and cookies
      const localToken = localStorage.getItem('access_token');
      if (localToken) return localToken;

      // Fallback to cookie
      const cookies = document.cookie.split('; ');
      const tokenCookie = cookies.find(row => row.startsWith('access_token='));
      return tokenCookie ? tokenCookie.split('=')[1] : null;
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      // Store in localStorage
      localStorage.setItem('access_token', token);

      // Also store in cookie for middleware access
      // Set cookie with 5 hours expiry (matching token expiry)
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + (5 * 60 * 60 * 1000)); // 5 hours
      document.cookie = `access_token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      // Remove from localStorage
      localStorage.removeItem('access_token');

      // Remove cookie
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public saveToken(token: string): void {
    this.setToken(token);
  }

  public removeToken(): void {
    this.clearToken();
  }

  public hasToken(): boolean {
    return !!this.getToken();
  }
}

export const apiClient = new ApiClient();
export const axiosInstance = apiClient.getClient();
