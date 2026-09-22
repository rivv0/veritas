import { create } from 'zustand';
import { UserPublicProfile } from '@/lib/types';
import { api } from '@/lib/api';

interface AuthState {
  user: UserPublicProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  setAuth: (user: UserPublicProfile, accessToken: string) => void;
  clearAuth: () => void;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  initAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

function parseJwtExp(token: string): number | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch (e) {
    return null;
  }
}

function scheduleRefresh(token: string, onRefresh: () => Promise<void>) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  const expMs = parseJwtExp(token);
  if (!expMs) return;

  // Refresh 60 seconds before expiration
  const delayMs = Math.max(5000, expMs - Date.now() - 60000);

  refreshTimeout = setTimeout(async () => {
    try {
      await onRefresh();
    } catch (e) {
      console.warn('[Auth] Silent token refresh attempt failed:', e);
    }
  }, delayMs);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isInitialized: false,
  authModalOpen: false,
  authModalMode: 'login',

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isLoading: false, isInitialized: true });
    scheduleRefresh(accessToken, async () => {
      try {
        const res = await api.refreshToken();
        get().setAuth(res.user, res.accessToken);
      } catch (err) {
        get().clearAuth();
      }
    });
  },

  clearAuth: () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
    set({ user: null, accessToken: null, isLoading: false, isInitialized: true });
  },

  openAuthModal: (mode = 'login') => {
    set({ authModalOpen: true, authModalMode: mode });
  },

  closeAuthModal: () => {
    set({ authModalOpen: false });
  },

  initAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.refreshToken();
      get().setAuth(res.user, res.accessToken);
    } catch (e) {
      // Guest or no valid refresh cookie
      get().clearAuth();
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('[Auth] Logout network error:', e);
    } finally {
      get().clearAuth();
    }
  },
}));
