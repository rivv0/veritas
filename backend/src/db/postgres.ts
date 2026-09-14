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
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'RELIANCE', ltp: 1257.50, volume: 8777736, high: 1267.40, low: 1253.00, open: 1274.00, close: 1274.00, bid: 1256.85, ask: 1258.15 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TCS', ltp: 2200.80, volume: 2634124, high: 2232.60, low: 2185.50, open: 2204.10, close: 2204.10, bid: 2198.50, ask: 2202.50 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'INFY', ltp: 1037.70, volume: 6168088, high: 1047.30, low: 1029.70, open: 1036.50, close: 1036.50, bid: 1036.80, ask: 1038.50 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'HDFCBANK', ltp: 708.25, volume: 31411934, high: 709.00, low: 681.90, open: 693.80, close: 693.80, bid: 707.90, ask: 708.50 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'ICICIBANK', ltp: 1379.30, volume: 7064417, high: 1389.00, low: 1367.60, open: 1384.50, close: 1384.50, bid: 1378.80, ask: 1379.80 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'SBIN', ltp: 995.70, volume: 7771109, high: 1001.90, low: 993.00, open: 1009.70, close: 1009.70, bid: 995.20, ask: 996.20 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'BHARTIARTL', ltp: 1831.10, volume: 4181325, high: 1852.00, low: 1830.50, open: 1839.00, close: 1839.00, bid: 1830.20, ask: 1832.00 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'ITC', ltp: 259.85, volume: 11116049, high: 261.65, low: 257.70, open: 259.30, close: 259.30, bid: 259.60, ask: 260.10 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TATAMOTORS', ltp: 740.00, volume: 8400000, high: 752.00, low: 736.00, open: 748.50, close: 748.50, bid: 739.50, ask: 740.50 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'LT', ltp: 3930.70, volume: 1195489, high: 3948.00, low: 3880.70, open: 3955.00, close: 3955.00, bid: 3928.00, ask: 3932.00 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'BAJFINANCE', ltp: 1034.50, volume: 5411299, high: 1035.00, low: 1015.10, open: 1043.50, close: 1043.50, bid: 1033.80, ask: 1035.20 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'MARUTI', ltp: 12400.00, volume: 620000, high: 12520.00, low: 12340.00, open: 12450.00, close: 12450.00, bid: 12390.00, ask: 12410.00 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'SUNPHARMA', ltp: 1750.00, volume: 2900000, high: 1762.00, low: 1730.00, open: 1735.00, close: 1735.00, bid: 1749.00, ask: 1751.00 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'TITAN', ltp: 3600.00, volume: 1400000, high: 3655.00, low: 3585.00, open: 3640.00, close: 3640.00, bid: 3598.00, ask: 3602.00 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'AXISBANK', ltp: 1246.00, volume: 4562285, high: 1252.80, low: 1229.80, open: 1246.00, close: 1246.00, bid: 1245.20, ask: 1246.80 },
    { timestamp: new Date(Date.now() - 45 * 60 * 1000), symbol: 'WIT', ltp: 480.20, volume: 1500000, high: 488.00, low: 478.00, open: 485.00, close: 485.00, bid: 480.00, ask: 481.00 },
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

export async function initPostgresSchema() {
  if (!config.postgres.connectionString && (!config.postgres.host || config.postgres.host === 'localhost')) {
    return;
  }
  try {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
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
            added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(watchlist_id, symbol)
        );
        CREATE TABLE IF NOT EXISTS market_ticks (
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
        CREATE INDEX IF NOT EXISTS idx_ticks_symbol_time ON market_ticks (symbol, timestamp DESC);
        CREATE TABLE IF NOT EXISTS signals (
            id VARCHAR(64) PRIMARY KEY,
            symbol VARCHAR(32) NOT NULL,
            signal_type VARCHAR(64) NOT NULL,
            severity INT NOT NULL,
            description TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_signals_symbol_time ON signals (symbol, triggered_at DESC);
        CREATE TABLE IF NOT EXISTS user_sessions (
            user_id VARCHAR(64) NOT NULL,
            device_fp VARCHAR(64) NOT NULL,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_watchlist_id VARCHAR(64),
            PRIMARY KEY (user_id, device_fp)
        );

        -- Seed Default User
        INSERT INTO users (id, email, name) VALUES 
        ('demo-user', 'trader@groww.in', 'Pro Trader')
        ON CONFLICT (id) DO NOTHING;

        -- Seed Default Watchlists
        INSERT INTO watchlists (id, user_id, name, is_default, sort_order) VALUES
        ('wl-core', 'demo-user', 'Nifty 50 Core', TRUE, 1),
        ('wl-tech', 'demo-user', 'IT & Banking Giants', FALSE, 2),
        ('wl-growth', 'demo-user', 'High Growth & Tech', FALSE, 3)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

        -- Seed Nifty 50 Core Items
        INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order) VALUES
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
        ('wi-25', 'wl-tech', 'WIT', 10),
        -- High Growth & Tech Items
        ('wi-26', 'wl-growth', 'ZOMATO', 1),
        ('wi-27', 'wl-growth', 'PAYTM', 2),
        ('wi-28', 'wl-growth', 'JIOFIN', 3),
        ('wi-29', 'wl-growth', 'TATAMOTORS', 4),
        ('wi-30', 'wl-growth', 'NVDA', 5),
        ('wi-31', 'wl-growth', 'AAPL', 6),
        ('wi-32', 'wl-growth', 'TSLA', 7),
        ('wi-33', 'wl-growth', 'MSFT', 8)
        ON CONFLICT (watchlist_id, symbol) DO NOTHING;

        -- Seed Real Market Ticks (So database is never empty or dummy)
        INSERT INTO market_ticks (timestamp, symbol, ltp, volume, bid, ask, high, low, open, close) VALUES
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

