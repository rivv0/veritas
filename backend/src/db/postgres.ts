import { Pool } from 'pg';
import { config } from '../config';

const poolConfig: any = config.postgres.connectionString
  ? {
      connectionString: config.postgres.connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 3000,
    }
  : {
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 1500,
    };

export const pgPool = new Pool(poolConfig);

let useInMemory = false;

pgPool.on('error', () => {
  if (!useInMemory) {
    console.log('PostgreSQL unavailable. Seamlessly switching to In-Memory Database Mode...');
    useInMemory = true;
  }
});

let nextTickId = 1000;

// In-Memory Storage Arrays
const memoryStore = {
  users: [
    {
      id: 'demo-user',
      email: 'trader@groww.in',
      name: 'Pro Trader',
      password_hash: null as string | null,
      token_version: 0,
      role: 'trader',
      avatar_url: null as string | null,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ],
  user_refresh_tokens: [] as {
    id: string;
    family_id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    revoked_at: Date | null;
    replaced_by: string | null;
    created_at: Date;
  }[],
  password_reset_tokens: [] as {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
  }[],
  alerts: [] as any[],
  push_subscriptions: [] as any[],
  watchlists: [
    { id: 'wl-core', user_id: 'demo-user', name: 'Nifty 50 Core', sort_order: 1, is_default: true, created_at: new Date(), updated_at: new Date() },
    { id: 'wl-tech', user_id: 'demo-user', name: 'IT & Banking Giants', sort_order: 2, is_default: false, created_at: new Date(), updated_at: new Date() },
    { id: 'wl-growth', user_id: 'demo-user', name: 'India High Growth & Fintech', sort_order: 3, is_default: false, created_at: new Date(), updated_at: new Date() },
    { id: 'wl-us', user_id: 'demo-user', name: 'US Tech Titans', sort_order: 4, is_default: false, created_at: new Date(), updated_at: new Date() },
  ],
  watchlist_items: [
    // Nifty 50 Core (16 stocks with Honorary GROWW)
    { id: 'wi-0', watchlist_id: 'wl-core', symbol: 'GROWW', sort_order: 0, thesis: 'Long-term fintech & broker compounding leader', thesis_price: 195.84, added_at: new Date() },
    { id: 'wi-1', watchlist_id: 'wl-core', symbol: 'RELIANCE', sort_order: 1, thesis: 'Retail & telecom conglomerate breakout', thesis_price: 1250.00, added_at: new Date() },
    { id: 'wi-2', watchlist_id: 'wl-core', symbol: 'TCS', sort_order: 2, thesis: 'IT recovery turnaround; margin expansion', thesis_price: 2180.00, added_at: new Date() },
    { id: 'wi-3', watchlist_id: 'wl-core', symbol: 'INFY', sort_order: 3, added_at: new Date() },
    { id: 'wi-4', watchlist_id: 'wl-core', symbol: 'HDFCBANK', sort_order: 4, added_at: new Date() },
    { id: 'wi-5', watchlist_id: 'wl-core', symbol: 'ICICIBANK', sort_order: 5, added_at: new Date() },
    { id: 'wi-6', watchlist_id: 'wl-core', symbol: 'SBIN', sort_order: 6, added_at: new Date() },
    { id: 'wi-7', watchlist_id: 'wl-core', symbol: 'BHARTIARTL', sort_order: 7, added_at: new Date() },
    { id: 'wi-8', watchlist_id: 'wl-core', symbol: 'ITC', sort_order: 8, added_at: new Date() },
    { id: 'wi-9', watchlist_id: 'wl-core', symbol: 'TATAMOTORS', sort_order: 9, added_at: new Date() },
    { id: 'wi-10', watchlist_id: 'wl-core', symbol: 'LT', sort_order: 10, added_at: new Date() },
    { id: 'wi-11', watchlist_id: 'wl-core', symbol: 'BAJFINANCE', sort_order: 11, added_at: new Date() },
    { id: 'wi-12', watchlist_id: 'wl-core', symbol: 'MARUTI', sort_order: 12, added_at: new Date() },
    { id: 'wi-13', watchlist_id: 'wl-core', symbol: 'SUNPHARMA', sort_order: 13, added_at: new Date() },
    { id: 'wi-14', watchlist_id: 'wl-core', symbol: 'TITAN', sort_order: 14, added_at: new Date() },
    { id: 'wi-15', watchlist_id: 'wl-core', symbol: 'AXISBANK', sort_order: 15, added_at: new Date() },
    // IT & Banking Giants (10 Indian stocks)
    { id: 'wi-16', watchlist_id: 'wl-tech', symbol: 'TCS', sort_order: 1, added_at: new Date() },
    { id: 'wi-17', watchlist_id: 'wl-tech', symbol: 'INFY', sort_order: 2, added_at: new Date() },
    { id: 'wi-18', watchlist_id: 'wl-tech', symbol: 'WIPRO', sort_order: 3, added_at: new Date() },
    { id: 'wi-19', watchlist_id: 'wl-tech', symbol: 'HCLTECH', sort_order: 4, added_at: new Date() },
    { id: 'wi-20', watchlist_id: 'wl-tech', symbol: 'HDFCBANK', sort_order: 5, added_at: new Date() },
    { id: 'wi-21', watchlist_id: 'wl-tech', symbol: 'ICICIBANK', sort_order: 6, added_at: new Date() },
    { id: 'wi-22', watchlist_id: 'wl-tech', symbol: 'SBIN', sort_order: 7, added_at: new Date() },
    { id: 'wi-23', watchlist_id: 'wl-tech', symbol: 'KOTAKBANK', sort_order: 8, added_at: new Date() },
    { id: 'wi-24', watchlist_id: 'wl-tech', symbol: 'AXISBANK', sort_order: 9, added_at: new Date() },
    { id: 'wi-25', watchlist_id: 'wl-tech', symbol: 'TECHM', sort_order: 10, added_at: new Date() },
    // India High Growth & Fintech (9 Indian stocks with Honorary GROWW)
    { id: 'wi-growth-0', watchlist_id: 'wl-growth', symbol: 'GROWW', sort_order: 0, added_at: new Date() },
    { id: 'wi-26', watchlist_id: 'wl-growth', symbol: 'ZOMATO', sort_order: 1, added_at: new Date() },
    { id: 'wi-27', watchlist_id: 'wl-growth', symbol: 'PAYTM', sort_order: 2, added_at: new Date() },
    { id: 'wi-28', watchlist_id: 'wl-growth', symbol: 'JIOFIN', sort_order: 3, added_at: new Date() },
    { id: 'wi-29', watchlist_id: 'wl-growth', symbol: 'TATAMOTORS', sort_order: 4, added_at: new Date() },
    { id: 'wi-30', watchlist_id: 'wl-growth', symbol: 'HAL', sort_order: 5, added_at: new Date() },
    { id: 'wi-31', watchlist_id: 'wl-growth', symbol: 'BEL', sort_order: 6, added_at: new Date() },
    { id: 'wi-32', watchlist_id: 'wl-growth', symbol: 'TRENT', sort_order: 7, added_at: new Date() },
    { id: 'wi-33', watchlist_id: 'wl-growth', symbol: 'VBL', sort_order: 8, added_at: new Date() },
    // US Tech Titans (7 US Equities)
    { id: 'wi-us-1', watchlist_id: 'wl-us', symbol: 'NVDA', sort_order: 1, thesis: 'AI hyperscale computing infrastructure moat', thesis_price: 110.00, added_at: new Date() },
    { id: 'wi-us-2', watchlist_id: 'wl-us', symbol: 'AAPL', sort_order: 2, added_at: new Date() },
    { id: 'wi-us-3', watchlist_id: 'wl-us', symbol: 'MSFT', sort_order: 3, added_at: new Date() },
    { id: 'wi-us-4', watchlist_id: 'wl-us', symbol: 'GOOGL', sort_order: 4, added_at: new Date() },
    { id: 'wi-us-5', watchlist_id: 'wl-us', symbol: 'AMZN', sort_order: 5, added_at: new Date() },
    { id: 'wi-us-6', watchlist_id: 'wl-us', symbol: 'TSLA', sort_order: 6, added_at: new Date() },
    { id: 'wi-us-7', watchlist_id: 'wl-us', symbol: 'META', sort_order: 7, added_at: new Date() },
  ],
  market_ticks: [
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'GROWW', ltp: 200.00, volume: 31136422, high: 200.91, low: 192.60, open: 195.84, close: 195.84, bid: 199.80, ask: 200.20 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'RELIANCE', ltp: 1257.50, volume: 8777736, high: 1267.40, low: 1253.00, open: 1274.00, close: 1274.00, bid: 1256.85, ask: 1258.15 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TCS', ltp: 2200.80, volume: 2634124, high: 2232.60, low: 2185.50, open: 2204.10, close: 2204.10, bid: 2198.50, ask: 2202.50 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'INFY', ltp: 1037.70, volume: 6168088, high: 1047.30, low: 1029.70, open: 1036.50, close: 1036.50, bid: 1036.80, ask: 1038.50 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'HDFCBANK', ltp: 708.25, volume: 31411934, high: 709.00, low: 681.90, open: 693.80, close: 693.80, bid: 707.90, ask: 708.50 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'ICICIBANK', ltp: 1379.30, volume: 7064417, high: 1389.00, low: 1367.60, open: 1384.50, close: 1384.50, bid: 1378.80, ask: 1379.80 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'SBIN', ltp: 995.70, volume: 7771109, high: 1001.90, low: 993.00, open: 1009.70, close: 1009.70, bid: 995.20, ask: 996.20 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'BHARTIARTL', ltp: 1831.10, volume: 4181325, high: 1852.00, low: 1830.50, open: 1839.00, close: 1839.00, bid: 1830.20, ask: 1832.00 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'ITC', ltp: 259.85, volume: 11116049, high: 261.65, low: 257.70, open: 259.30, close: 259.30, bid: 259.60, ask: 260.10 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TATAMOTORS', ltp: 740.00, volume: 8400000, high: 752.00, low: 736.00, open: 748.50, close: 748.50, bid: 739.50, ask: 740.50 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'LT', ltp: 3930.70, volume: 1195489, high: 3948.00, low: 3880.70, open: 3955.00, close: 3955.00, bid: 3928.00, ask: 3932.00 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'BAJFINANCE', ltp: 1034.50, volume: 5411299, high: 1035.00, low: 1015.10, open: 1043.50, close: 1043.50, bid: 1033.80, ask: 1035.20 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'MARUTI', ltp: 12400.00, volume: 620000, high: 12520.00, low: 12340.00, open: 12450.00, close: 12450.00, bid: 12390.00, ask: 12410.00 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'SUNPHARMA', ltp: 1750.00, volume: 2900000, high: 1762.00, low: 1730.00, open: 1735.00, close: 1735.00, bid: 1749.00, ask: 1751.00 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TITAN', ltp: 3600.00, volume: 1400000, high: 3655.00, low: 3585.00, open: 3640.00, close: 3640.00, bid: 3598.00, ask: 3602.00 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'AXISBANK', ltp: 1246.00, volume: 4562285, high: 1252.80, low: 1229.80, open: 1246.00, close: 1246.00, bid: 1245.20, ask: 1246.80 },
    { tick_id: nextTickId++, timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'WIT', ltp: 480.20, volume: 1500000, high: 488.00, low: 478.00, open: 485.00, close: 485.00, bid: 480.00, ask: 481.00 },
  ] as any[],
  signals: [] as any[],
  user_sessions: [
    { user_id: 'demo-user', device_fp: 'web-default', last_seen_at: new Date(Date.now() - 45 * 60 * 1000), last_watchlist_id: 'wl-core' }
  ] as any[],
  symbol_stats: [
    { symbol: 'GROWW', avg_volume_20d: 31136422, updated_at: new Date() },
    { symbol: 'RELIANCE', avg_volume_20d: 8777736, updated_at: new Date() },
    { symbol: 'TCS', avg_volume_20d: 2634124, updated_at: new Date() },
    { symbol: 'INFY', avg_volume_20d: 6168088, updated_at: new Date() },
    { symbol: 'HDFCBANK', avg_volume_20d: 31411934, updated_at: new Date() },
    { symbol: 'ICICIBANK', avg_volume_20d: 7064417, updated_at: new Date() },
    { symbol: 'SBIN', avg_volume_20d: 7771109, updated_at: new Date() },
    { symbol: 'BHARTIARTL', avg_volume_20d: 4181325, updated_at: new Date() },
    { symbol: 'ITC', avg_volume_20d: 11116049, updated_at: new Date() },
    { symbol: 'TATAMOTORS', avg_volume_20d: 8400000, updated_at: new Date() },
    { symbol: 'LT', avg_volume_20d: 1195489, updated_at: new Date() },
    { symbol: 'BAJFINANCE', avg_volume_20d: 5411299, updated_at: new Date() },
    { symbol: 'MARUTI', avg_volume_20d: 620000, updated_at: new Date() },
    { symbol: 'SUNPHARMA', avg_volume_20d: 2900000, updated_at: new Date() },
    { symbol: 'TITAN', avg_volume_20d: 1400000, updated_at: new Date() },
    { symbol: 'AXISBANK', avg_volume_20d: 4562285, updated_at: new Date() },
    { symbol: 'WIPRO', avg_volume_20d: 8484897, updated_at: new Date() },
    { symbol: 'HCLTECH', avg_volume_20d: 2272845, updated_at: new Date() },
    { symbol: 'TECHM', avg_volume_20d: 2007328, updated_at: new Date() },
    { symbol: 'ZOMATO', avg_volume_20d: 21500000, updated_at: new Date() },
    { symbol: 'PAYTM', avg_volume_20d: 9269434, updated_at: new Date() },
    { symbol: 'JIOFIN', avg_volume_20d: 22102551, updated_at: new Date() },
    { symbol: 'WIT', avg_volume_20d: 1500000, updated_at: new Date() },
    { symbol: 'NVDA', avg_volume_20d: 89060140, updated_at: new Date() },
    { symbol: 'AAPL', avg_volume_20d: 50716865, updated_at: new Date() },
    { symbol: 'TSLA', avg_volume_20d: 30153019, updated_at: new Date() },
    { symbol: 'MSFT', avg_volume_20d: 14518435, updated_at: new Date() },
  ] as any[],
};

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (!useInMemory) {
    try {
      const res = await pgPool.query(text, params);
      return res.rows;
    } catch (err: any) {
      if (!useInMemory) {
        console.log('PostgreSQL connection failed. Falling back to In-Memory Database engine...');
        useInMemory = true;
      }
    }
  }

  // In-Memory Query Router
  const cleanSql = text.replace(/\s+/g, ' ').trim();

  // 1. Watchlists Query
  if (cleanSql.includes('FROM watchlists')) {
    if (cleanSql.includes('WHERE w.id = $1')) {
      const id = params[0];
      const wl = memoryStore.watchlists.find(w => w.id === id);
      if (!wl) return [];
      const symbols = memoryStore.watchlist_items
        .filter(wi => wi.watchlist_id === id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(wi => wi.symbol);
      return [{
        id: wl.id,
        userId: wl.user_id,
        name: wl.name,
        sortOrder: wl.sort_order,
        isDefault: wl.is_default,
        createdAt: wl.created_at,
        updatedAt: wl.updated_at,
        symbols,
      }] as any;
    }

    const userId = params[0];
    const userWatchlists = memoryStore.watchlists.filter(w => w.user_id === userId);
    return userWatchlists.map(wl => {
      const symbols = memoryStore.watchlist_items
        .filter(wi => wi.watchlist_id === wl.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(wi => wi.symbol);
      return {
        id: wl.id,
        userId: wl.user_id,
        name: wl.name,
        sortOrder: wl.sort_order,
        isDefault: wl.is_default,
        createdAt: wl.created_at,
        updatedAt: wl.updated_at,
        symbols,
      };
    }) as any;
  }

  // 1b. Distinct Symbols
  if (cleanSql.includes('DISTINCT symbol FROM watchlist_items')) {
    const set = new Set(memoryStore.watchlist_items.map(wi => wi.symbol));
    return Array.from(set).map(symbol => ({ symbol })) as any;
  }

  // 2. Create Watchlist
  if (cleanSql.includes('INSERT INTO watchlists')) {
    const [id, userId, name] = params;
    const newWl = { id, user_id: userId, name, sort_order: memoryStore.watchlists.length + 1, is_default: false, created_at: new Date(), updated_at: new Date() };
    memoryStore.watchlists.push(newWl);
    return [{
      id: newWl.id,
      userId: newWl.user_id,
      name: newWl.name,
      sortOrder: newWl.sort_order,
      isDefault: newWl.is_default,
      createdAt: newWl.created_at,
      updatedAt: newWl.updated_at,
    }] as any;
  }

  // 2b. Update Watchlist Name
  if (cleanSql.includes('UPDATE watchlists SET name')) {
    const [id, name] = params;
    const wl = memoryStore.watchlists.find(w => w.id === id);
    if (wl) {
      wl.name = name;
      wl.updated_at = new Date();
    }
    return [] as any;
  }

  // 2c. Delete Watchlist
  if (cleanSql.includes('DELETE FROM watchlists WHERE id = $1')) {
    const id = params[0];
    memoryStore.watchlists = memoryStore.watchlists.filter(w => w.id !== id);
    memoryStore.watchlist_items = memoryStore.watchlist_items.filter(wi => wi.watchlist_id !== id);
    return [] as any;
  }

  // 3. Add Symbol to Watchlist
  if (cleanSql.includes('INSERT INTO watchlist_items')) {
    const [id, watchlistId, symbol, sortOrder] = params;
    const exists = memoryStore.watchlist_items.some(wi => wi.watchlist_id === watchlistId && wi.symbol === symbol);
    if (!exists) {
      memoryStore.watchlist_items.push({
        id,
        watchlist_id: watchlistId,
        symbol,
        sort_order: typeof sortOrder === 'number' ? sortOrder : memoryStore.watchlist_items.length + 1,
        added_at: new Date(),
      });
    }
    return [] as any;
  }

  // 3b. Update Thesis on Watchlist Item
  if (cleanSql.includes('UPDATE watchlist_items SET thesis')) {
    const [thesis, thesisPrice, watchlistId, symbol] = params;
    const item = memoryStore.watchlist_items.find(wi => wi.watchlist_id === watchlistId && wi.symbol === symbol);
    if (item) {
      item.thesis = thesis;
      item.thesis_price = thesisPrice !== null ? Number(thesisPrice) : undefined;
    }
    return [] as any;
  }

  // 3c. Get Theses for Watchlist
  if (cleanSql.includes('FROM watchlist_items') && cleanSql.includes('thesis_price as "thesisPrice"')) {
    const [watchlistId] = params;
    const items = memoryStore.watchlist_items.filter(
      wi => wi.watchlist_id === watchlistId && (wi.thesis || wi.thesis_price)
    );
    return items.map(wi => ({
      symbol: wi.symbol,
      thesis: wi.thesis,
      thesisPrice: wi.thesis_price,
    })) as any;
  }

  // 4. Remove Symbol or Clear Watchlist Items
  if (cleanSql.includes('DELETE FROM watchlist_items')) {
    if (params.length === 2) {
      const [watchlistId, symbol] = params;
      memoryStore.watchlist_items = memoryStore.watchlist_items.filter(wi => !(wi.watchlist_id === watchlistId && wi.symbol === symbol));
    } else if (params.length === 1) {
      const [watchlistId] = params;
      memoryStore.watchlist_items = memoryStore.watchlist_items.filter(wi => wi.watchlist_id !== watchlistId);
    }
    return [] as any;
  }

  // 5. Insert Market Tick
  if (cleanSql.includes('INSERT INTO market_ticks')) {
    const [timestamp, symbol, ltp, volume, bid, ask, high, low, open, close] = params;
    memoryStore.market_ticks.push({
      tick_id: nextTickId++,
      timestamp: new Date(timestamp),
      symbol,
      ltp,
      volume,
      bid,
      ask,
      high,
      low,
      open,
      close
    });
    if (memoryStore.market_ticks.length > 5000) memoryStore.market_ticks.shift();
    return [] as any;
  }

  // 6. Get Market Ticks / Warmup / Catchup / Chart
  if (cleanSql.includes('FROM market_ticks')) {
    // 6a. Catch-up query: m.symbol = ANY($1) AND m.tick_id > $2
    if (cleanSql.includes('AND m.tick_id > $2') || cleanSql.includes('tick_id > $2')) {
      const [symbols, sinceTickId] = params;
      const targetSymbols: string[] = Array.isArray(symbols) ? symbols : [symbols];
      const filtered = memoryStore.market_ticks
        .filter(t => targetSymbols.includes(t.symbol) && (t.tick_id || 0) > Number(sinceTickId))
        .sort((a, b) => (a.tick_id || 0) - (b.tick_id || 0));
      return filtered.map(t => ({
        tickId: t.tick_id,
        timestamp: t.timestamp,
        symbol: t.symbol,
        ltp: t.ltp,
        volume: t.volume,
        bid: t.bid,
        ask: t.ask,
        high: t.high,
        low: t.low,
        open: t.open,
        close: t.close,
        avgVolume20d: Number(memoryStore.symbol_stats.find(s => s.symbol === t.symbol)?.avg_volume_20d || t.volume || 1000000)
      })) as any;
    }

    // 6b. Warmup query: WHERE m.symbol = $1 ORDER BY m.timestamp DESC LIMIT $2
    if (cleanSql.includes('LIMIT $2') && cleanSql.includes('WHERE m.symbol = $1')) {
      const [symbol, limit] = params;
      const ticks = memoryStore.market_ticks
        .filter(t => t.symbol === symbol)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, Number(limit));
      return ticks.map(t => ({
        tickId: t.tick_id,
        timestamp: t.timestamp,
        symbol: t.symbol,
        ltp: t.ltp,
        volume: t.volume,
        bid: t.bid,
        ask: t.ask,
        high: t.high,
        low: t.low,
        open: t.open,
        close: t.close,
        avgVolume20d: Number(memoryStore.symbol_stats.find(s => s.symbol === t.symbol)?.avg_volume_20d || t.volume || 1000000)
      })) as any;
    }

    // 6c. Chart & Trajectory time_bucket query
    if (cleanSql.includes('time_bucket') || cleanSql.includes('INTERVAL')) {
      const [symbol] = params;
      const ticks = memoryStore.market_ticks
        .filter(t => t.symbol === symbol)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (ticks.length === 0) return [] as any;
      return ticks.map(t => ({
        time: t.timestamp,
        day: t.timestamp,
        open: t.open || t.ltp,
        high: t.high || t.ltp,
        low: t.low || t.ltp,
        close: t.close || t.ltp,
        volume: t.volume || 10000
      })) as any;
    }

    // 6d. Snapshot query
    if (cleanSql.includes('WHERE m.symbol = ANY($1)')) {
      const symbols: string[] = params[0] || [];
      const result: any[] = [];
      symbols.forEach(sym => {
        const ticks = memoryStore.market_ticks.filter(t => t.symbol === sym).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (ticks.length > 0) {
          const latest = ticks[0];
          const change = latest.ltp - (latest.close || latest.ltp);
          const changePercent = latest.close ? (change / latest.close) * 100 : 0;
          result.push({
            symbol: latest.symbol,
            ltp: latest.ltp,
            change,
            changePercent,
            volume: latest.volume || 0,
            avgVolume20d: Number(memoryStore.symbol_stats.find((s) => s.symbol === latest.symbol)?.avg_volume_20d || latest.volume || 1000000),
            high: latest.high,
            low: latest.low,
            open: latest.open,
            close: latest.close,
            bid: latest.bid,
            ask: latest.ask,
            atr20: (latest.high - latest.low) || latest.ltp * 0.015,
            lastUpdated: latest.timestamp,
          });
        }
      });
      return result as any;
    }

    if (cleanSql.includes('timestamp <= $2')) {
      const [symbol, ts] = params;
      const targetTs = new Date(ts).getTime();
      const ticks = memoryStore.market_ticks
        .filter(t => t.symbol === symbol && t.timestamp.getTime() <= targetTs)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return (ticks.length > 0 ? [ticks[0]] : []) as any;
    }

    const symbol = params[0];
    const ticks = memoryStore.market_ticks
      .filter(t => t.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return (ticks.length > 0 ? [ticks[0]] : []) as any;
  }

  // 7. Signals Table Insert / Query
  if (cleanSql.includes('INSERT INTO signals')) {
    const [id, symbol, signal_type, severity, description, metadata, triggered_at, mode] = params;
    memoryStore.signals.push({
      id,
      symbol,
      signal_type,
      severity,
      description,
      metadata,
      triggered_at: new Date(triggered_at),
      mode: mode || 'live'
    });
    return [] as any;
  }

  if (cleanSql.includes('FROM signals')) {
    const [symbols, since] = params;
    const sinceTs = new Date(since).getTime();
    const filtered = memoryStore.signals.filter(
      s => symbols.includes(s.symbol) && s.triggered_at.getTime() >= sinceTs
    );
    return filtered.map(s => ({
      id: s.id,
      symbol: s.symbol,
      signalType: s.signal_type,
      severity: s.severity,
      description: s.description,
      metadata: typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata,
      mode: s.mode || 'live',
      triggeredAt: s.triggered_at,
    })) as any;
  }

  // 7b. Alerts Table CRUD
  if (cleanSql.includes('INSERT INTO alerts')) {
    const [id, userId, symbol, condition, threshold, marketFilter] = params;
    const alert = {
      id,
      user_id: userId,
      symbol,
      condition,
      threshold: Number(threshold),
      market_filter: marketFilter,
      is_active: true,
      created_at: new Date(),
      triggered_at: null
    };
    memoryStore.alerts.push(alert);
    return [{
      id: alert.id,
      userId: alert.user_id,
      symbol: alert.symbol,
      condition: alert.condition,
      threshold: alert.threshold,
      marketFilter: alert.market_filter,
      triggeredAt: alert.triggered_at,
      isActive: alert.is_active,
      createdAt: alert.created_at
    }] as any;
  }

  if (cleanSql.includes('FROM alerts')) {
    if (cleanSql.includes('WHERE is_active = TRUE')) {
      return memoryStore.alerts.filter(a => a.is_active).map(a => ({
        id: a.id,
        userId: a.user_id,
        symbol: a.symbol,
        condition: a.condition,
        threshold: a.threshold,
        marketFilter: a.market_filter,
        triggeredAt: a.triggered_at,
        isActive: a.is_active,
        createdAt: a.created_at
      })) as any;
    }
    const [userId] = params;
    return memoryStore.alerts.filter(a => a.user_id === userId).map(a => ({
      id: a.id,
      userId: a.user_id,
      symbol: a.symbol,
      condition: a.condition,
      threshold: a.threshold,
      marketFilter: a.market_filter,
      triggeredAt: a.triggered_at,
      isActive: a.is_active,
      createdAt: a.created_at
    })) as any;
  }

  if (cleanSql.includes('UPDATE alerts')) {
    if (cleanSql.includes('SET triggered_at = NOW()')) {
      const [alertId] = params;
      const alert = memoryStore.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.triggered_at = new Date();
        alert.is_active = false;
      }
      return [] as any;
    }
    if (cleanSql.includes('SET is_active = NOT is_active')) {
      const [alertId, userId] = params;
      const alert = memoryStore.alerts.find(a => a.id === alertId && a.user_id === userId);
      if (alert) {
        alert.is_active = !alert.is_active;
        return [{ isActive: alert.is_active }] as any;
      }
      return [] as any;
    }
  }

  if (cleanSql.includes('DELETE FROM alerts')) {
    const [alertId, userId] = params;
    memoryStore.alerts = memoryStore.alerts.filter(a => !(a.id === alertId && a.user_id === userId));
    return [] as any;
  }

  // 7c. Push Subscriptions Table
  if (cleanSql.includes('INSERT INTO push_subscriptions')) {
    const [id, userId, deviceFp, endpoint, keys] = params;
    const existing = memoryStore.push_subscriptions.find(p => p.user_id === userId && p.device_fp === deviceFp);
    if (existing) {
      existing.endpoint = endpoint;
      existing.keys = keys;
      existing.created_at = new Date();
    } else {
      memoryStore.push_subscriptions.push({ id, user_id: userId, device_fp: deviceFp, endpoint, keys, created_at: new Date() });
    }
    return [] as any;
  }

  if (cleanSql.includes('FROM push_subscriptions')) {
    if (cleanSql.includes('WHERE user_id = $1')) {
      const [userId] = params;
      return memoryStore.push_subscriptions.filter(p => p.user_id === userId).map(p => ({
        id: p.id,
        userId: p.user_id,
        deviceFp: p.device_fp,
        endpoint: p.endpoint,
        keys: p.keys,
        createdAt: p.created_at
      })) as any;
    }
    return memoryStore.push_subscriptions.map(p => ({
      id: p.id,
      userId: p.user_id,
      deviceFp: p.device_fp,
      endpoint: p.endpoint,
      keys: p.keys,
      createdAt: p.created_at
    })) as any;
  }

  if (cleanSql.includes('DELETE FROM push_subscriptions')) {
    const [endpoint] = params;
    memoryStore.push_subscriptions = memoryStore.push_subscriptions.filter(p => p.endpoint !== endpoint);
    return [] as any;
  }

  // 8. User Sessions
  if (cleanSql.includes('FROM user_sessions')) {
    const [userId, deviceFp] = params;
    const session = memoryStore.user_sessions.find(s => s.user_id === userId && s.device_fp === deviceFp);
    return session ? [{
      userId: session.user_id,
      deviceFp: session.device_fp,
      lastSeenAt: session.last_seen_at,
      lastWatchlistId: session.last_watchlist_id,
    }] as any : [];
  }

  if (cleanSql.includes('INSERT INTO user_sessions')) {
    const [userId, deviceFp, watchlistId] = params;
    let session = memoryStore.user_sessions.find(s => s.user_id === userId && s.device_fp === deviceFp);
    if (session) {
      session.last_seen_at = new Date();
      if (watchlistId) session.last_watchlist_id = watchlistId;
    } else {
      session = { user_id: userId, device_fp: deviceFp, last_seen_at: new Date(), last_watchlist_id: watchlistId };
      memoryStore.user_sessions.push(session);
    }
    return [{
      userId: session.user_id,
      deviceFp: session.device_fp,
      lastSeenAt: session.last_seen_at,
      lastWatchlistId: session.last_watchlist_id,
    }] as any;
  }

  // 9. Symbol Stats Table
  if (cleanSql.includes('symbol_stats')) {
    if (cleanSql.includes('INSERT INTO symbol_stats')) {
      const [symbol, avg_volume_20d] = params;
      const existing = memoryStore.symbol_stats.find((s) => s.symbol === symbol);
      if (existing) {
        existing.avg_volume_20d = Number(avg_volume_20d);
        existing.updated_at = new Date();
      } else {
        memoryStore.symbol_stats.push({ symbol, avg_volume_20d: Number(avg_volume_20d), updated_at: new Date() });
      }
      return [] as any;
    }
    if (cleanSql.includes('SELECT')) {
      return memoryStore.symbol_stats as any;
    }
  }

  // 10. Users Table & Authentication
  if (cleanSql.includes('FROM users')) {
    if (cleanSql.includes('WHERE email = $1')) {
      const [email] = params;
      const user = memoryStore.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
      if (!user) return [];
      return [{
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.password_hash,
        tokenVersion: user.token_version,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }] as any;
    }
    if (cleanSql.includes('WHERE id = $1')) {
      const [id] = params;
      const user = memoryStore.users.find(u => u.id === id);
      if (!user) return [];
      return [{
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.password_hash,
        tokenVersion: user.token_version,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }] as any;
    }
  }

  if (cleanSql.includes('INSERT INTO users')) {
    const [id, email, name, passwordHash, tokenVersion, role, avatarUrl] = params;
    const existing = memoryStore.users.find(u => u.id === id || u.email.toLowerCase() === (email || '').toLowerCase());
    if (existing) {
      if (cleanSql.includes('ON CONFLICT (id) DO NOTHING')) {
        return [] as any;
      }
      throw new Error('User with this email already exists');
    }
    const newUser = {
      id,
      email,
      name,
      password_hash: passwordHash || null,
      token_version: tokenVersion !== undefined ? Number(tokenVersion) : 0,
      role: role || 'trader',
      avatar_url: avatarUrl || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    memoryStore.users.push(newUser);
    return [{
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      passwordHash: newUser.password_hash,
      tokenVersion: newUser.token_version,
      role: newUser.role,
      avatarUrl: newUser.avatar_url,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    }] as any;
  }

  if (cleanSql.includes('UPDATE users') && cleanSql.includes('token_version = token_version + 1')) {
    if (cleanSql.includes('password_hash = $1')) {
      const [passwordHash, userId] = params;
      const user = memoryStore.users.find(u => u.id === userId);
      if (user) {
        user.password_hash = passwordHash;
        user.token_version = (user.token_version || 0) + 1;
        user.updated_at = new Date();
      }
    } else {
      const [userId] = params;
      const user = memoryStore.users.find(u => u.id === userId);
      if (user) {
        user.token_version = (user.token_version || 0) + 1;
        user.updated_at = new Date();
      }
    }
    return [] as any;
  }

  // 11. User Refresh Tokens (with Family ID & Atomic Rotation)
  if (cleanSql.includes('INSERT INTO user_refresh_tokens')) {
    const [id, familyId, userId, tokenHash, expiresAt] = params;
    memoryStore.user_refresh_tokens.push({
      id,
      family_id: familyId,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt),
      revoked_at: null,
      replaced_by: null,
      created_at: new Date(),
    });
    return [] as any;
  }

  // Atomic claim: UPDATE user_refresh_tokens SET revoked_at = NOW(), replaced_by = $2 WHERE token_hash = $1 AND revoked_at IS NULL RETURNING *
  if (cleanSql.includes('UPDATE user_refresh_tokens') && cleanSql.includes('revoked_at IS NULL')) {
    const [tokenHash, replacedBy] = params;
    const token = memoryStore.user_refresh_tokens.find(t => t.token_hash === tokenHash && t.revoked_at === null);
    if (token) {
      token.revoked_at = new Date();
      token.replaced_by = replacedBy;
      return [{
        id: token.id,
        familyId: token.family_id,
        userId: token.user_id,
        tokenHash: token.token_hash,
        expiresAt: token.expires_at,
        revokedAt: token.revoked_at,
        replacedBy: token.replaced_by,
        createdAt: token.created_at,
      }] as any;
    }
    return [] as any; // 0 rows updated -> reuse or not found
  }

  if (cleanSql.includes('FROM user_refresh_tokens')) {
    if (cleanSql.includes('WHERE token_hash = $1')) {
      const [tokenHash] = params;
      const token = memoryStore.user_refresh_tokens.find(t => t.token_hash === tokenHash);
      if (!token) return [];
      return [{
        id: token.id,
        familyId: token.family_id,
        userId: token.user_id,
        tokenHash: token.token_hash,
        expiresAt: token.expires_at,
        revokedAt: token.revoked_at,
        replacedBy: token.replaced_by,
        createdAt: token.created_at,
      }] as any;
    }
  }

  if (cleanSql.includes('UPDATE user_refresh_tokens') && cleanSql.includes('WHERE family_id = $1')) {
    const [familyId] = params;
    memoryStore.user_refresh_tokens.forEach(t => {
      if (t.family_id === familyId && !t.revoked_at) {
        t.revoked_at = new Date();
      }
    });
    return [] as any;
  }

  // 12. Re-keying Watchlists & Alerts for Guest Migration
  if (cleanSql.includes('UPDATE watchlists') && cleanSql.includes('SET user_id = $1 WHERE user_id = $2')) {
    const [newUserId, guestDeviceId] = params;
    memoryStore.watchlists.forEach(w => {
      if (w.user_id === guestDeviceId) {
        w.user_id = newUserId;
        w.updated_at = new Date();
      }
    });
    return [] as any;
  }

  if (cleanSql.includes('UPDATE alerts') && cleanSql.includes('SET user_id = $1 WHERE user_id = $2')) {
    const [newUserId, guestDeviceId] = params;
    memoryStore.alerts.forEach(a => {
      if (a.user_id === guestDeviceId) {
        a.user_id = newUserId;
      }
    });
    return [] as any;
  }

  if (cleanSql.includes('DELETE FROM user_sessions WHERE user_id = $1')) {
    const [userId] = params;
    memoryStore.user_sessions = memoryStore.user_sessions.filter(s => s.user_id !== userId);
    return [] as any;
  }

  // 13. Password Reset Tokens
  if (cleanSql.includes('INSERT INTO password_reset_tokens')) {
    const [id, userId, tokenHash, expiresAt] = params;
    memoryStore.password_reset_tokens.push({
      id,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt),
      used_at: null,
      created_at: new Date(),
    });
    return [] as any;
  }

  if (cleanSql.includes('FROM password_reset_tokens')) {
    if (cleanSql.includes('WHERE token_hash = $1')) {
      const [tokenHash] = params;
      const now = Date.now();
      const token = memoryStore.password_reset_tokens.find(
        t => t.token_hash === tokenHash && t.used_at === null && t.expires_at.getTime() > now
      );
      if (!token) return [];
      return [{
        id: token.id,
        userId: token.user_id,
        tokenHash: token.token_hash,
        expiresAt: token.expires_at,
        usedAt: token.used_at,
        createdAt: token.created_at,
      }] as any;
    }
  }

  if (cleanSql.includes('UPDATE password_reset_tokens') && cleanSql.includes('SET used_at = NOW()')) {
    if (cleanSql.includes('user_id = $1')) {
      const [userId] = params;
      for (const token of memoryStore.password_reset_tokens) {
        if (token.user_id === userId && !token.used_at) {
          token.used_at = new Date();
        }
      }
      return [] as any;
    }
    const [id] = params;
    const token = memoryStore.password_reset_tokens.find(t => t.id === id);
    if (token) {
      token.used_at = new Date();
    }
    return [] as any;
  }

  return [] as any;
}

export async function initPostgresSchema() {
  if (!config.postgres.connectionString && (!config.postgres.host || config.postgres.host === 'localhost')) {
    console.log('[Postgres] No remote DATABASE_URL configured. Operating in In-Memory mode.');
    return;
  }
  const maskedTarget = config.postgres.connectionString
    ? config.postgres.connectionString.replace(/:[^:@]+@/, ':***@')
    : `${config.postgres.host}:${config.postgres.port}`;

  console.log(`[Postgres] Connecting to ${maskedTarget}...`);
  try {
    const client = await pgPool.connect();
    try {
      console.log('[Postgres] Connection established. Initializing tables...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255),
            token_version INT NOT NULL DEFAULT 0,
            role VARCHAR(32) NOT NULL DEFAULT 'trader',
            avatar_url VARCHAR(512),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'trader';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

        CREATE TABLE IF NOT EXISTS user_refresh_tokens (
            id VARCHAR(64) PRIMARY KEY,
            family_id VARCHAR(64) NOT NULL,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            replaced_by VARCHAR(64),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_family ON user_refresh_tokens(family_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_user ON user_refresh_tokens(user_id);

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
        CREATE TABLE IF NOT EXISTS watchlists (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            sort_order INT DEFAULT 0,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS watchlist_items (
            id VARCHAR(64) PRIMARY KEY,
            watchlist_id VARCHAR(64) NOT NULL,
            symbol VARCHAR(32) NOT NULL,
            sort_order INT DEFAULT 0,
            thesis TEXT,
            thesis_price NUMERIC(12, 4),
            added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(watchlist_id, symbol)
        );
        ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS thesis TEXT;
        ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS thesis_price NUMERIC(12, 4);

        CREATE TABLE IF NOT EXISTS market_ticks (
            tick_id BIGSERIAL,
            timestamp TIMESTAMPTZ NOT NULL,
            symbol VARCHAR(32) NOT NULL,
            ltp NUMERIC(12, 4) NOT NULL,
            volume BIGINT DEFAULT 0,
            bid NUMERIC(12, 4),
            ask NUMERIC(12, 4),
            high NUMERIC(12, 4),
            low NUMERIC(12, 4),
            open NUMERIC(12, 4),
            close NUMERIC(12, 4)
        );
        ALTER TABLE market_ticks ADD COLUMN IF NOT EXISTS tick_id BIGSERIAL;
        CREATE INDEX IF NOT EXISTS idx_ticks_symbol_time ON market_ticks (symbol, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_ticks_symbol_tickid ON market_ticks (symbol, tick_id DESC);

        CREATE TABLE IF NOT EXISTS signals (
            id VARCHAR(64) PRIMARY KEY,
            symbol VARCHAR(32) NOT NULL,
            signal_type VARCHAR(64) NOT NULL,
            severity INT NOT NULL,
            description TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            mode VARCHAR(16) DEFAULT 'live',
            triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE signals ADD COLUMN IF NOT EXISTS mode VARCHAR(16) DEFAULT 'live';
        CREATE INDEX IF NOT EXISTS idx_signals_symbol_time ON signals (symbol, triggered_at DESC);
        CREATE INDEX IF NOT EXISTS idx_signals_mode ON signals (mode);

        CREATE TABLE IF NOT EXISTS alerts (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            symbol VARCHAR(32) NOT NULL,
            condition VARCHAR(32) NOT NULL,
            threshold NUMERIC(12, 4) NOT NULL,
            market_filter JSONB,
            triggered_at TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_user_symbol ON alerts (user_id, symbol, is_active);

        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            device_fp VARCHAR(64) NOT NULL,
            endpoint TEXT NOT NULL,
            keys JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, device_fp)
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
            user_id VARCHAR(64) NOT NULL,
            device_fp VARCHAR(64) NOT NULL,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_watchlist_id VARCHAR(64),
            PRIMARY KEY (user_id, device_fp)
        );
        CREATE TABLE IF NOT EXISTS symbol_stats (
            symbol VARCHAR(32) PRIMARY KEY,
            avg_volume_20d BIGINT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- Seed Default User
        INSERT INTO users (id, email, name) VALUES 
        ('demo-user', 'trader@groww.in', 'Pro Trader')
        ON CONFLICT (id) DO NOTHING;

        -- Seed Default Watchlists
        INSERT INTO watchlists (id, user_id, name, is_default, sort_order) VALUES
        ('wl-core', 'demo-user', 'Nifty 50 Core', TRUE, 1),
        ('wl-tech', 'demo-user', 'IT & Banking Giants', FALSE, 2),
        ('wl-growth', 'demo-user', 'India High Growth & Fintech', FALSE, 3),
        ('wl-us', 'demo-user', 'US Tech Titans', FALSE, 4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

        -- Seed Nifty 50 Core Items (With Honorary GROWW)
        INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order) VALUES
        ('wi-0', 'wl-core', 'GROWW', 0),
        ('wi-1', 'wl-core', 'RELIANCE', 1),
        ('wi-2', 'wl-core', 'TCS', 2),
        ('wi-3', 'wl-core', 'INFY', 3),
        ('wi-4', 'wl-core', 'HDFCBANK', 4),
        ('wi-5', 'wl-core', 'ICICIBANK', 5),
        ('wi-6', 'wl-core', 'SBIN', 6),
        ('wi-7', 'wl-core', 'BHARTIARTL', 7),
        ('wi-8', 'wl-core', 'ITC', 8),
        ('wi-9', 'wl-core', 'TATAMOTORS', 9),
        ('wi-10', 'wl-core', 'LT', 10),
        ('wi-11', 'wl-core', 'BAJFINANCE', 11),
        ('wi-12', 'wl-core', 'MARUTI', 12),
        ('wi-13', 'wl-core', 'SUNPHARMA', 13),
        ('wi-14', 'wl-core', 'TITAN', 14),
        ('wi-15', 'wl-core', 'AXISBANK', 15),
        -- IT & Banking Giants Items
        ('wi-16', 'wl-tech', 'TCS', 1),
        ('wi-17', 'wl-tech', 'INFY', 2),
        ('wi-18', 'wl-tech', 'WIPRO', 3),
        ('wi-19', 'wl-tech', 'HCLTECH', 4),
        ('wi-20', 'wl-tech', 'HDFCBANK', 5),
        ('wi-21', 'wl-tech', 'ICICIBANK', 6),
        ('wi-22', 'wl-tech', 'SBIN', 7),
        ('wi-23', 'wl-tech', 'KOTAKBANK', 8),
        ('wi-24', 'wl-tech', 'AXISBANK', 9),
        ('wi-25', 'wl-tech', 'TECHM', 10),
        -- India High Growth & Fintech Items (With Honorary GROWW)
        ('wi-growth-0', 'wl-growth', 'GROWW', 0),
        ('wi-26', 'wl-growth', 'ZOMATO', 1),
        ('wi-27', 'wl-growth', 'PAYTM', 2),
        ('wi-28', 'wl-growth', 'JIOFIN', 3),
        ('wi-29', 'wl-growth', 'TATAMOTORS', 4),
        ('wi-30', 'wl-growth', 'HAL', 5),
        ('wi-31', 'wl-growth', 'BEL', 6),
        ('wi-32', 'wl-growth', 'TRENT', 7),
        ('wi-33', 'wl-growth', 'VBL', 8),
        -- US Tech Titans Items
        ('wi-us-1', 'wl-us', 'NVDA', 1),
        ('wi-us-2', 'wl-us', 'AAPL', 2),
        ('wi-us-3', 'wl-us', 'MSFT', 3),
        ('wi-us-4', 'wl-us', 'GOOGL', 4),
        ('wi-us-5', 'wl-us', 'AMZN', 5),
        ('wi-us-6', 'wl-us', 'TSLA', 6),
        ('wi-us-7', 'wl-us', 'META', 7)
        ON CONFLICT (watchlist_id, symbol) DO NOTHING;

        -- Seed Real Market Ticks (So database is never empty or dummy)
        INSERT INTO market_ticks (timestamp, symbol, ltp, volume, bid, ask, high, low, open, close) VALUES
        (NOW(), 'GROWW', 200.00, 31136422, 199.80, 200.20, 200.91, 192.60, 195.84, 195.84),
        (NOW(), 'RELIANCE', 1257.50, 8777736, 1256.85, 1258.15, 1267.40, 1253.00, 1274.00, 1274.00),
        (NOW(), 'TCS', 2200.80, 2634124, 2198.50, 2202.50, 2232.60, 2185.50, 2204.10, 2204.10),
        (NOW(), 'INFY', 1037.70, 6168088, 1036.80, 1038.50, 1047.30, 1029.70, 1036.50, 1036.50),
        (NOW(), 'HDFCBANK', 708.25, 31411934, 707.90, 708.50, 709.00, 681.90, 693.80, 693.80),
        (NOW(), 'ICICIBANK', 1379.30, 7064417, 1378.80, 1379.80, 1389.00, 1367.60, 1384.50, 1384.50),
        (NOW(), 'SBIN', 995.70, 7771109, 995.20, 996.20, 1001.90, 993.00, 1009.70, 1009.70),
        (NOW(), 'BHARTIARTL', 1831.10, 4181325, 1830.20, 1832.00, 1852.00, 1830.50, 1839.00, 1839.00),
        (NOW(), 'ITC', 259.85, 11116049, 259.60, 260.10, 261.65, 257.70, 259.30, 259.30),
        (NOW(), 'TATAMOTORS', 740.00, 8400000, 739.50, 740.50, 752.00, 736.00, 748.50, 748.50),
        (NOW(), 'LT', 3930.70, 1195489, 3928.00, 3932.00, 3948.00, 3880.70, 3955.00, 3955.00),
        (NOW(), 'BAJFINANCE', 1034.50, 5411299, 1033.80, 1035.20, 1035.00, 1015.10, 1043.50, 1043.50),
        (NOW(), 'MARUTI', 12400.00, 620000, 12390.00, 12410.00, 12520.00, 12340.00, 12450.00, 12450.00),
        (NOW(), 'SUNPHARMA', 1750.00, 2900000, 1749.00, 1751.00, 1762.00, 1730.00, 1735.00, 1735.00),
        (NOW(), 'TITAN', 3600.00, 1400000, 3598.00, 3602.00, 3655.00, 3585.00, 3640.00, 3640.00),
        (NOW(), 'AXISBANK', 1246.00, 4562285, 1245.20, 1246.80, 1252.80, 1229.80, 1246.00, 1246.00);

        -- Seed Default Session
        INSERT INTO user_sessions (user_id, device_fp, last_seen_at, last_watchlist_id) VALUES
        ('demo-user', 'web-default', NOW() - INTERVAL '35 minutes', 'wl-core')
        ON CONFLICT (user_id, device_fp) DO UPDATE SET last_seen_at = NOW() - INTERVAL '35 minutes';

        -- Seed Real 20-Day Average Daily Volumes
        INSERT INTO symbol_stats (symbol, avg_volume_20d, updated_at) VALUES
        ('GROWW', 31136422, NOW()),
        ('RELIANCE', 8777736, NOW()),
        ('TCS', 2634124, NOW()),
        ('INFY', 6168088, NOW()),
        ('HDFCBANK', 31411934, NOW()),
        ('ICICIBANK', 7064417, NOW()),
        ('SBIN', 7771109, NOW()),
        ('BHARTIARTL', 4181325, NOW()),
        ('ITC', 11116049, NOW()),
        ('TATAMOTORS', 8400000, NOW()),
        ('LT', 1195489, NOW()),
        ('BAJFINANCE', 5411299, NOW()),
        ('MARUTI', 620000, NOW()),
        ('SUNPHARMA', 2900000, NOW()),
        ('TITAN', 1400000, NOW()),
        ('AXISBANK', 4562285, NOW()),
        ('WIPRO', 8484897, NOW()),
        ('HCLTECH', 2272845, NOW()),
        ('TECHM', 2007328, NOW()),
        ('ZOMATO', 21500000, NOW()),
        ('PAYTM', 9269434, NOW()),
        ('JIOFIN', 22102551, NOW()),
        ('WIT', 1500000, NOW()),
        ('NVDA', 89060140, NOW()),
        ('AAPL', 50716865, NOW()),
        ('TSLA', 30153019, NOW()),
        ('MSFT', 14518435, NOW())
        ON CONFLICT (symbol) DO UPDATE SET avg_volume_20d = EXCLUDED.avg_volume_20d, updated_at = NOW();
      `);
      console.log('[PostgreSQL] Connected successfully to remote database & schema initialized!');
      useInMemory = false;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.log(`[PostgreSQL] Connection failed (${err.message}). Active In-Memory engine engaged.`);
    useInMemory = true;
  }
}

