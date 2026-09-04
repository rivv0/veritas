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

// In-Memory Storage Arrays
const memoryStore = {
  users: [
    { id: 'demo-user', email: 'trader@groww.in', name: 'Pro Trader', created_at: new Date() }
  ],
  watchlists: [
    { id: 'wl-core', user_id: 'demo-user', name: 'Nifty 50 Core', sort_order: 1, is_default: true, created_at: new Date(), updated_at: new Date() },
    { id: 'wl-tech', user_id: 'demo-user', name: 'IT & Banking Giants', sort_order: 2, is_default: false, created_at: new Date(), updated_at: new Date() },
    { id: 'wl-growth', user_id: 'demo-user', name: 'High Growth & Tech', sort_order: 3, is_default: false, created_at: new Date(), updated_at: new Date() },
  ],
  watchlist_items: [
    // Nifty 50 Core (15 stocks)
    { id: 'wi-1', watchlist_id: 'wl-core', symbol: 'RELIANCE', sort_order: 1, added_at: new Date() },
    { id: 'wi-2', watchlist_id: 'wl-core', symbol: 'TCS', sort_order: 2, added_at: new Date() },
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
    // IT & Banking Giants (10 stocks)
    { id: 'wi-16', watchlist_id: 'wl-tech', symbol: 'TCS', sort_order: 1, added_at: new Date() },
    { id: 'wi-17', watchlist_id: 'wl-tech', symbol: 'INFY', sort_order: 2, added_at: new Date() },
    { id: 'wi-18', watchlist_id: 'wl-tech', symbol: 'WIPRO', sort_order: 3, added_at: new Date() },
    { id: 'wi-19', watchlist_id: 'wl-tech', symbol: 'HCLTECH', sort_order: 4, added_at: new Date() },
    { id: 'wi-20', watchlist_id: 'wl-tech', symbol: 'HDFCBANK', sort_order: 5, added_at: new Date() },
    { id: 'wi-21', watchlist_id: 'wl-tech', symbol: 'ICICIBANK', sort_order: 6, added_at: new Date() },
    { id: 'wi-22', watchlist_id: 'wl-tech', symbol: 'SBIN', sort_order: 7, added_at: new Date() },
    { id: 'wi-23', watchlist_id: 'wl-tech', symbol: 'KOTAKBANK', sort_order: 8, added_at: new Date() },
    { id: 'wi-24', watchlist_id: 'wl-tech', symbol: 'AXISBANK', sort_order: 9, added_at: new Date() },
    { id: 'wi-25', watchlist_id: 'wl-tech', symbol: 'WIT', sort_order: 10, added_at: new Date() },
    // High Growth & Tech (8 stocks)
    { id: 'wi-26', watchlist_id: 'wl-growth', symbol: 'ZOMATO', sort_order: 1, added_at: new Date() },
    { id: 'wi-27', watchlist_id: 'wl-growth', symbol: 'PAYTM', sort_order: 2, added_at: new Date() },
    { id: 'wi-28', watchlist_id: 'wl-growth', symbol: 'JIOFIN', sort_order: 3, added_at: new Date() },
    { id: 'wi-29', watchlist_id: 'wl-growth', symbol: 'TATAMOTORS', sort_order: 4, added_at: new Date() },
    { id: 'wi-30', watchlist_id: 'wl-growth', symbol: 'NVDA', sort_order: 5, added_at: new Date() },
    { id: 'wi-31', watchlist_id: 'wl-growth', symbol: 'AAPL', sort_order: 6, added_at: new Date() },
    { id: 'wi-32', watchlist_id: 'wl-growth', symbol: 'TSLA', sort_order: 7, added_at: new Date() },
    { id: 'wi-33', watchlist_id: 'wl-growth', symbol: 'MSFT', sort_order: 8, added_at: new Date() },
  ],
  market_ticks: [
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'RELIANCE', ltp: 2850.50, volume: 1500000, high: 2870, low: 2840, open: 2845, close: 2840, bid: 2850, ask: 2851 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TCS', ltp: 4120.00, volume: 800000, high: 4150, low: 4100, open: 4105, close: 4100, bid: 4119, ask: 4121 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'INFY', ltp: 1820.75, volume: 1200000, high: 1840, low: 1810, open: 1815, close: 1810, bid: 1820, ask: 1821 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'HDFCBANK', ltp: 1650.30, volume: 2000000, high: 1665, low: 1640, open: 1642, close: 1642, bid: 1650, ask: 1651 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'ICICIBANK', ltp: 1210.00, volume: 1800000, high: 1225, low: 1200, open: 1202, close: 1202, bid: 1209, ask: 1211 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'WIT', ltp: 480.20, volume: 500000, high: 485, low: 478, open: 479, close: 479, bid: 480, ask: 481 },
  ] as any[],
  signals: [] as any[],
  user_sessions: [
    { user_id: 'demo-user', device_fp: 'web-default', last_seen_at: new Date(Date.now() - 45 * 60 * 1000), last_watchlist_id: 'wl-core' }
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
    memoryStore.market_ticks.push({ timestamp: new Date(timestamp), symbol, ltp, volume, bid, ask, high, low, open, close });
    if (memoryStore.market_ticks.length > 5000) memoryStore.market_ticks.shift();
    return [] as any;
  }

  // 6. Get Latest Tick / At or Before
  if (cleanSql.includes('FROM market_ticks')) {
    if (cleanSql.includes('WHERE symbol = ANY($1)')) {
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
            avgVolume20d: Math.round((latest.volume || 1000000) * 0.85),
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
    const [id, symbol, signal_type, severity, description, metadata, triggered_at] = params;
    memoryStore.signals.push({
      id, symbol, signal_type, severity, description, metadata, triggered_at: new Date(triggered_at)
    });
    return [] as any;
  }

  if (cleanSql.includes('FROM signals')) {
    const [symbols, since] = params;
    const sinceTs = new Date(since).getTime();
    const filtered = memoryStore.signals.filter(s => symbols.includes(s.symbol) && s.triggered_at.getTime() >= sinceTs);
    return filtered.map(s => ({
      id: s.id,
      symbol: s.symbol,
      signalType: s.signal_type,
      severity: s.severity,
      description: s.description,
      metadata: typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata,
      triggeredAt: s.triggered_at,
    })) as any;
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

  return [] as any;
}
