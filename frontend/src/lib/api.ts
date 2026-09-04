const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchWatchlists() {
  const res = await fetch(`${API_BASE}/api/v1/watchlists`, {
    headers: { 'x-user-id': 'demo-user' },
  });
  return res.json();
}

export async function createWatchlist(name: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function renameWatchlist(watchlistId: string, name: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteWatchlist(watchlistId: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': 'demo-user' },
  });
  return res.json();
}

export async function reorderWatchlistSymbols(watchlistId: string, symbols: string[]) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
    body: JSON.stringify({ symbols }),
  });
  return res.json();
}

export async function addSymbol(watchlistId: string, symbol: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
    body: JSON.stringify({ symbol }),
  });
  return res.json();
}

export async function removeSymbol(watchlistId: string, symbol: string) {
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/symbols/${symbol}`, {
    method: 'DELETE',
    headers: { 'x-user-id': 'demo-user' },
  });
  return res.json();
}

export async function fetchDigest(watchlistId: string, lookbackMinutes?: number) {
  const query = lookbackMinutes ? `?lookback=${lookbackMinutes}` : '';
  const res = await fetch(`${API_BASE}/api/v1/watchlists/${watchlistId}/digest${query}`, {
    headers: {
      'x-user-id': 'demo-user',
      'x-device-fp': 'web-default',
    },
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

