import { useAuthStore } from '../store/useAuthStore';
import { AuthResponse, UserPublicProfile } from './types';

export const getApiBase = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('veritas-backend.onrender.com')) return envUrl;
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://veritas-backend-6epf.onrender.com';
  }
  return envUrl || 'http://localhost:4000';
};

export const API_BASE = getApiBase();

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'demo-user';
  let id = localStorage.getItem('veritas_device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36);
    localStorage.setItem('veritas_device_id', id);
  }
  return id;
}

export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('veritas_device_id');
  }
}

export function getAuthHeaders(): Record<string, string> {
  const deviceId = getDeviceId();
  const headers: Record<string, string> = {
    'x-user-id': deviceId,
    'x-device-fp': deviceId,
    'x-veritas-client': 'web',
  };

  // Attach in-memory access token if authenticated
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
}

// Single-flight refresh lock to avoid concurrent refresh token collisions
let refreshPromise: Promise<AuthResponse> | null = null;

async function executeSilentRefresh(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-veritas-client': 'web',
          },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Refresh failed');
        }
        const data: AuthResponse = await res.json();
        useAuthStore.getState().setAuth(data.user, data.accessToken);
        return data;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Universal API Fetch wrapper with:
 * - Credentials (cookies) included
 * - CSRF client header
 * - Bearer authorization
 * - Automatic 401 silent token refresh retry
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Handle 401 with silent refresh retry (once)
  if (response.status === 401 && !path.includes('/api/v1/auth/')) {
    try {
      const refreshed = await executeSilentRefresh();
      // Retry with new access token
      const retryHeaders = {
        ...headers,
        'Authorization': `Bearer ${refreshed.accessToken}`,
      };
      const retryResponse = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: retryHeaders,
      });
      return retryResponse.json();
    } catch (e) {
      useAuthStore.getState().clearAuth();
    }
  }

  return response.json();
}

// Watchlists API
export async function fetchWatchlists() {
  return apiFetch('/api/v1/watchlists');
}

export async function createWatchlist(name: string) {
  return apiFetch('/api/v1/watchlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function renameWatchlist(watchlistId: string, name: string) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteWatchlist(watchlistId: string) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}`, {
    method: 'DELETE',
  });
}

export async function reorderWatchlistSymbols(watchlistId: string, symbols: string[]) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
}

export async function addSymbol(watchlistId: string, symbol: string) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
}

export async function removeSymbol(watchlistId: string, symbol: string) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}/symbols/${symbol}`, {
    method: 'DELETE',
  });
}

export async function fetchDigest(watchlistId: string, lookbackMinutes?: number) {
  const query = lookbackMinutes ? `?lookbackMinutes=${lookbackMinutes}&lookback=${lookbackMinutes}` : '';
  return apiFetch(`/api/v1/watchlists/${watchlistId}/digest${query}`);
}

export async function fetchSnapshot(symbols: string[]) {
  if (symbols.length === 0) return { success: true, data: [] };
  return apiFetch(`/api/v1/market/snapshot?symbols=${encodeURIComponent(symbols.join(','))}`);
}

export async function searchSymbols(q: string) {
  return apiFetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
}

export async function fetchNews(symbols: string[]) {
  if (!symbols || symbols.length === 0) return { success: true, data: [] };
  return apiFetch(`/api/v1/news?symbols=${encodeURIComponent(symbols.join(','))}`);
}

// User Price & Market Alerts API
export async function fetchAlerts() {
  return apiFetch('/api/v1/alerts');
}

export async function createAlert(alertData: {
  symbol: string;
  condition: string;
  threshold: number;
  marketFilter?: {
    index: string;
    condition: string;
    value?: number;
  };
}) {
  return apiFetch('/api/v1/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
  });
}

export async function toggleAlert(alertId: string) {
  return apiFetch(`/api/v1/alerts/${alertId}/toggle`, {
    method: 'PATCH',
  });
}

export async function deleteAlert(alertId: string) {
  return apiFetch(`/api/v1/alerts/${alertId}`, {
    method: 'DELETE',
  });
}

// Web Push VAPID API
export async function fetchVapidKey() {
  return apiFetch('/api/v1/push/vapid-key');
}

export async function registerPushSubscription(subscription: any) {
  return apiFetch('/api/v1/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });
}

// Market Trajectory & Multi-Timeframe Chart Candles
export async function fetchChartCandles(symbol: string, timeframe: '1m' | '5m' | '15m' | '1D' = '5m') {
  return apiFetch(`/api/v1/market/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
}

export async function fetchTrajectory(symbol: string) {
  return apiFetch(`/api/v1/market/trajectory?symbol=${encodeURIComponent(symbol)}`);
}

export async function fetchCatchupTicks(symbols: string[], sinceTickId: number) {
  return apiFetch(
    `/api/v1/market/catchup?symbols=${encodeURIComponent(symbols.join(','))}&since_tick_id=${sinceTickId}`
  );
}

export async function updateWatchlistThesis(
  watchlistId: string,
  symbol: string,
  thesis: string,
  thesisPrice?: number
) {
  return apiFetch(`/api/v1/watchlists/${watchlistId}/symbols/${encodeURIComponent(symbol)}/thesis`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thesis, thesisPrice }),
  });
}

// Authentication API
export async function signup(dto: {
  email: string;
  password: string;
  name: string;
  guestDeviceId?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-veritas-client': 'web',
    },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to sign up');
  }
  return data;
}

export async function login(dto: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-veritas-client': 'web',
    },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid email or password');
  }
  return data;
}

export async function refreshToken(): Promise<AuthResponse> {
  return executeSilentRefresh();
}

export async function logout(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-veritas-client': 'web',
    },
  });
  return res.json();
}

export async function getMe(): Promise<{ user: UserPublicProfile }> {
  return apiFetch('/api/v1/auth/me');
}

export async function revokeAllSessions(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/v1/auth/revoke-all', {
    method: 'POST',
  });
}

export const api = {
  fetchWatchlists,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  reorderWatchlistSymbols,
  addSymbol,
  removeSymbol,
  fetchDigest,
  fetchSnapshot,
  searchSymbols,
  fetchNews,
  fetchAlerts,
  createAlert,
  toggleAlert,
  deleteAlert,
  fetchVapidKey,
  registerPushSubscription,
  fetchChartCandles,
  fetchTrajectory,
  fetchCatchupTicks,
  updateWatchlistThesis,
  signup,
  login,
  refreshToken,
  logout,
  getMe,
  revokeAllSessions,
};
