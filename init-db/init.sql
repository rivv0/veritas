-- Enable TimescaleDB extension safely if available
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB extension not available, continuing with standard PostgreSQL table';
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
    id VARCHAR(64) PRIMARY KEY,
    watchlist_id VARCHAR(64) NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    sort_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(watchlist_id, symbol)
);

-- Market ticks (Hypertable if TimescaleDB present, standard indexed table otherwise)
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

-- Convert to hypertable if TimescaleDB is available
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_hypertable') THEN
    PERFORM create_hypertable('market_ticks', 'timestamp', if_not_exists => TRUE);
  END IF;
END $$;

-- Create index on ticks for ultra-fast snapshot queries
CREATE INDEX IF NOT EXISTS idx_ticks_symbol_time ON market_ticks (symbol, timestamp DESC);

-- Signals log table
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

-- User activity/session state for "Since You Left" digest tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id VARCHAR(64) NOT NULL,
    device_fp VARCHAR(64) NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_watchlist_id VARCHAR(64),
    PRIMARY KEY (user_id, device_fp)
);

-- Initial Mock Seed Data
INSERT INTO users (id, email, name) VALUES 
('demo-user', 'trader@groww.in', 'Pro Trader')
ON CONFLICT (id) DO NOTHING;

-- Comprehensive Default Watchlists
INSERT INTO watchlists (id, user_id, name, is_default, sort_order) VALUES
('wl-core', 'demo-user', 'Nifty 50 Core', TRUE, 1),
('wl-tech', 'demo-user', 'IT & Banking Giants', FALSE, 2),
('wl-growth', 'demo-user', 'High Growth & Tech', FALSE, 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Clear previous items for seeded watchlists to avoid duplicate keys on re-run
DELETE FROM watchlist_items WHERE watchlist_id IN ('wl-core', 'wl-tech', 'wl-growth');

-- Nifty 50 Core Items (15 Top Indian Stocks)
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
('wi-15', 'wl-core', 'AXISBANK', 15);

-- IT & Banking Giants Items (10 Stocks)
INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order) VALUES
('wi-16', 'wl-tech', 'TCS', 1),
('wi-17', 'wl-tech', 'INFY', 2),
('wi-18', 'wl-tech', 'WIPRO', 3),
('wi-19', 'wl-tech', 'HCLTECH', 4),
('wi-20', 'wl-tech', 'HDFCBANK', 5),
('wi-21', 'wl-tech', 'ICICIBANK', 6),
('wi-22', 'wl-tech', 'SBIN', 7),
('wi-23', 'wl-tech', 'KOTAKBANK', 8),
('wi-24', 'wl-tech', 'AXISBANK', 9),
('wi-25', 'wl-tech', 'WIT', 10);

-- High Growth & Tech Items (8 Stocks)
INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order) VALUES
('wi-26', 'wl-growth', 'ZOMATO', 1),
('wi-27', 'wl-growth', 'PAYTM', 2),
('wi-28', 'wl-growth', 'JIOFIN', 3),
('wi-29', 'wl-growth', 'TATAMOTORS', 4),
('wi-30', 'wl-growth', 'NVDA', 5),
('wi-31', 'wl-growth', 'AAPL', 6),
('wi-32', 'wl-growth', 'TSLA', 7),
('wi-33', 'wl-growth', 'MSFT', 8);

-- Initial Sessions Seed for "Since You Left" digest calculation
INSERT INTO user_sessions (user_id, device_fp, last_seen_at, last_watchlist_id) VALUES
('demo-user', 'web-default', NOW() - INTERVAL '35 minutes', 'wl-core')
ON CONFLICT (user_id, device_fp) DO UPDATE SET last_seen_at = NOW() - INTERVAL '35 minutes';
