import type {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  User,
} from '@vibe-router/shared-types';
import { apiClient } from './client';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<{ tokens: AuthTokens; user: User }>>('/api/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<{ tokens: AuthTokens; user: User }>>('/api/auth/register', data),

  logout: () => apiClient.post<ApiResponse>('/api/auth/logout'),

  me: () => apiClient.get<ApiResponse<User>>('/api/auth/me'),
};
