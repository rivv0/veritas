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

// User Price & Market Alerts API
export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/api/v1/alerts`, {
    headers: getAuthHeaders(),
  });
  return res.json();
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
  const res = await fetch(`${API_BASE}/api/v1/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(alertData),
  });
  return res.json();
}

export async function toggleAlert(alertId: string) {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function deleteAlert(alertId: string) {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.json();
}

// Web Push VAPID API
export async function fetchVapidKey() {
  const res = await fetch(`${API_BASE}/api/v1/push/vapid-key`);
  return res.json();
}

export async function registerPushSubscription(subscription: any) {
  const res = await fetch(`${API_BASE}/api/v1/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ subscription }),
  });
  return res.json();
}

// Market Trajectory & Multi-Timeframe Chart Candles (TimescaleDB time_bucket)
export async function fetchChartCandles(symbol: string, timeframe: '1m' | '5m' | '15m' | '1D' = '5m') {
  const res = await fetch(`${API_BASE}/api/v1/market/chart?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
  return res.json();
}

export async function fetchTrajectory(symbol: string) {
  const res = await fetch(`${API_BASE}/api/v1/market/trajectory?symbol=${encodeURIComponent(symbol)}`);
  return res.json();
}

export async function fetchCatchupTicks(symbols: string[], sinceTickId: number) {
  const res = await fetch(
    `${API_BASE}/api/v1/market/catchup?symbols=${encodeURIComponent(symbols.join(','))}&since_tick_id=${sinceTickId}`
  );
  return res.json();
}

export async function updateWatchlistThesis(
  watchlistId: string,
  symbol: string,
  thesis: string,
  thesisPrice?: number
) {
  const res = await fetch(
    `${API_BASE}/api/v1/watchlists/${watchlistId}/symbols/${encodeURIComponent(symbol)}/thesis`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ thesis, thesisPrice }),
    }
  );
  return res.json();
}

