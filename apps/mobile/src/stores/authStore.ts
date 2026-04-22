import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@vibe-router/shared-types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const response = await authApi.me();
        if (response.data.success && response.data.data) {
          set({ user: response.data.data, accessToken: token, isAuthenticated: true });
        } else {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { data } = response.data;
    if (!data) throw new Error('Login failed');
    await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
    set({ user: data.user, accessToken: data.tokens.accessToken, isAuthenticated: true });
  },

  register: async (email: string, name: string, password: string) => {
    const response = await authApi.register({ email, name, password });
    const { data } = response.data;
    if (!data) throw new Error('Registration failed');
    await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
    set({ user: data.user, accessToken: data.tokens.accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with local cleanup even if server logout fails
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },
}));
