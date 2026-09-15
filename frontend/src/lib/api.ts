const getApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('veritas-backend.onrender.com')) return envUrl;
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://veritas-backend-6epf.onrender.com';
  }
  return envUrl || 'http://localhost:4000';
};

const API_BASE = getApiBase();

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'demo-user';
  let id = localStorage.getItem('veritas_device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36);
    localStorage.setItem('veritas_device_id', id);
  }
  return id;
}

function getAuthHeaders(): Record<string, string> {
  const deviceId = getDeviceId();
  return {
    'x-user-id': deviceId,
    'x-device-fp': deviceId,
  };
}

export async function fetchWatchlists() {
  const res = await fetch(`${API_BASE}/api/v1/watchlists`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function createWatchlist(name: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function renameWatchlist(watchlistId: string, name: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteWatchlist(watchlistId: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function reorderWatchlistSymbols(watchlistId: string, symbols: string[]) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ symbols }),
  });
  return res.json();
}

export async function addSymbol(watchlistId: string, symbol: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ symbol }),
  });
  return res.json();
}

export async function removeSymbol(watchlistId: string, symbol: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/symbols/${symbol}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function fetchDigest(watchlistId: string, lookbackMinutes?: number) {
  const query = lookbackMinutes ? `?lookbackMinutes=${lookbackMinutes}&lookback=${lookbackMinutes}` : '';
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/digest${query}`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function fetchSnapshot(symbols: string[]) {
  if (symbols.length === 0) return { success: true, data: [] };
  const res = await fetch(`${API_BASE}/api/v1/market/snapshot?symbols=${symbols.join(',')}`);
  return res.json();
}

export async function searchSymbols(q: string) {
  const res = await fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(q)}`);
  return res.json();
}

export async function fetchNews(symbols: string[]) {
  if (!symbols || symbols.length === 0) return { success: true, data: [] };
  const res = await fetch(`${API_BASE}/api/v1/news?symbols=${encodeURIComponent(symbols.join(','))}`);
  return res.json();
}

