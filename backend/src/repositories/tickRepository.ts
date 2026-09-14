import { query } from '../db/postgres';
import { Tick, MarketSnapshot } from '../domain/types';

export class TickRepository {
  async insertTick(tick: Tick): Promise<void> {
    const sql = `
      INSERT INTO market_ticks (timestamp, symbol, ltp, volume, bid, ask, high, low, open, close)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await query(sql, [
      tick.timestamp,
      tick.symbol,
      tick.ltp,
      tick.volume || 0,
      tick.bid || tick.ltp * 0.999,
      tick.ask || tick.ltp * 1.001,
      tick.high || tick.ltp,
      tick.low || tick.ltp,
      tick.open || tick.ltp,
      tick.close || tick.ltp,
    ]);
  }

  async getLatestTick(symbol: string): Promise<Tick | null> {
    const sql = `
      SELECT m.timestamp, m.symbol, m.ltp::float, m.volume::bigint,
             COALESCE(s.avg_volume_20d, m.volume)::bigint as "avgVolume20d",
             m.bid::float, m.ask::float, m.high::float, m.low::float, m.open::float, m.close::float
      FROM market_ticks m
      LEFT JOIN symbol_stats s ON s.symbol = m.symbol
      WHERE m.symbol = $1
      ORDER BY m.timestamp DESC
      LIMIT 1
    `;
    const rows = await query<Tick>(sql, [symbol]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getTickAtOrBefore(symbol: string, timestamp: Date): Promise<Tick | null> {
    const sql = `
      SELECT m.timestamp, m.symbol, m.ltp::float, m.volume::bigint,
             COALESCE(s.avg_volume_20d, m.volume)::bigint as "avgVolume20d",
             m.bid::float, m.ask::float, m.high::float, m.low::float, m.open::float, m.close::float
      FROM market_ticks m
      LEFT JOIN symbol_stats s ON s.symbol = m.symbol
      WHERE m.symbol = $1 AND m.timestamp <= $2
      ORDER BY m.timestamp DESC
      LIMIT 1
    `;
    const rows = await query<Tick>(sql, [symbol, timestamp]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getRecentPrices(symbol: string, limit: number = 20): Promise<number[]> {
    const sql = `
      SELECT ltp::float as ltp
      FROM market_ticks
      WHERE symbol = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const rows = await query<{ ltp: number }>(sql, [symbol, limit]);
    if (rows.length === 0) return [];
    return rows.map((r) => r.ltp).reverse();
  }

  async getSnapshot(symbols: string[]): Promise<MarketSnapshot[]> {
    if (symbols.length === 0) return [];
    
    // Hypertable aggregate query with real 20-day historical average volume from symbol_stats
    const sql = `
      SELECT DISTINCT ON (m.symbol)
        m.symbol,
        m.ltp::float as ltp,
        (m.ltp - m.close)::float as change,
        CASE WHEN m.close > 0 THEN ((m.ltp - m.close) / m.close * 100)::float ELSE 0 END as "changePercent",
        m.volume::bigint as volume,
        COALESCE(s.avg_volume_20d, m.volume)::bigint as "avgVolume20d",
        m.high::float as high,
        m.low::float as low,
        m.open::float as open,
        m.close::float as close,
        m.bid::float as bid,
        m.ask::float as ask,
        (m.high - m.low)::float as atr20,
        m.timestamp as "lastUpdated"
      FROM market_ticks m
      LEFT JOIN symbol_stats s ON s.symbol = m.symbol
      WHERE m.symbol = ANY($1)
      ORDER BY m.symbol, m.timestamp DESC
    `;
    const rows = await query<any>(sql, [symbols]);
    return rows.map((r) => ({
      ...r,
      atr20: r.atr20 || r.ltp * 0.015,
      dataFreshness: (Date.now() - new Date(r.lastUpdated).getTime()) < 10000 ? 'live' : 'delayed',
    }));
  }
}

export const tickRepository = new TickRepository();
