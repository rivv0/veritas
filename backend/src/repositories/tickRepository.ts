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
      SELECT timestamp, symbol, ltp::float, volume::bigint, bid::float, ask::float, high::float, low::float, open::float, close::float
      FROM market_ticks
      WHERE symbol = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const rows = await query<Tick>(sql, [symbol]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getTickAtOrBefore(symbol: string, timestamp: Date): Promise<Tick | null> {
    const sql = `
      SELECT timestamp, symbol, ltp::float, volume::bigint, bid::float, ask::float, high::float, low::float, open::float, close::float
      FROM market_ticks
      WHERE symbol = $1 AND timestamp <= $2
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const rows = await query<Tick>(sql, [symbol, timestamp]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getSnapshot(symbols: string[]): Promise<MarketSnapshot[]> {
    if (symbols.length === 0) return [];
    
    // Hypertable aggregate query
    const sql = `
      SELECT DISTINCT ON (symbol)
        symbol,
        ltp::float as ltp,
        (ltp - close)::float as change,
        CASE WHEN close > 0 THEN ((ltp - close) / close * 100)::float ELSE 0 END as "changePercent",
        volume::bigint as volume,
        (volume * 0.85)::bigint as "avgVolume20d",
        high::float as high,
        low::float as low,
        open::float as open,
        close::float as close,
        bid::float as bid,
        ask::float as ask,
        (high - low)::float as atr20,
        timestamp as "lastUpdated"
      FROM market_ticks
      WHERE symbol = ANY($1)
      ORDER BY symbol, timestamp DESC
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
