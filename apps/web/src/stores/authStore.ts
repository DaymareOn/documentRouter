import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@vibe-router/shared-types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      login: async (email, password, totpCode) => {
        const { data } = await api.post('/auth/login', { email, password, totpCode });
        set({ user: data.data.user, tokens: data.data.tokens, isAuthenticated: true });
      },
      register: async (email, name, password) => {
        const { data } = await api.post('/auth/register', { email, name, password });
        set({ user: data.data.user, tokens: data.data.tokens, isAuthenticated: true });
      },
      logout: async () => {
        try {
          await api.post('/auth/logout', { refreshToken: get().tokens?.refreshToken });
        } finally {
          set({ user: null, tokens: null, isAuthenticated: false });
        }
      },
      refreshTokens: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return;
        const { data } = await api.post('/auth/refresh', { refreshToken: tokens.refreshToken });
        set({ tokens: data.data });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
