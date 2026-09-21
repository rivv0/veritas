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

  /**
   * Warm-Up Seeder: fetches the last ~60 persisted ticks for a symbol
   * to prime EMA, RSI, and ATR indicators prior to receiving live ticks.
   */
  async getHistoricalTicksForWarmup(symbol: string, limit: number = 60): Promise<Tick[]> {
    const sql = `
      SELECT m.tick_id as "tickId", m.timestamp, m.symbol, m.ltp::float, m.volume::bigint,
             COALESCE(s.avg_volume_20d, m.volume)::bigint as "avgVolume20d",
             m.bid::float, m.ask::float, m.high::float, m.low::float, m.open::float, m.close::float
      FROM market_ticks m
      LEFT JOIN symbol_stats s ON s.symbol = m.symbol
      WHERE m.symbol = $1
      ORDER BY m.timestamp DESC
      LIMIT $2
    `;
    const rows = await query<Tick>(sql, [symbol, limit]);
    return rows.reverse(); // Chronological order
  }

  /**
   * Catch-up query: returns all ticks since last seen monotonic tick ID for specified symbols.
   */
  async getCatchupTicks(symbols: string[], sinceTickId: number): Promise<Tick[]> {
    if (symbols.length === 0) return [];
    const sql = `
      SELECT m.tick_id as "tickId", m.timestamp, m.symbol, m.ltp::float, m.volume::bigint,
             COALESCE(s.avg_volume_20d, m.volume)::bigint as "avgVolume20d",
             m.bid::float, m.ask::float, m.high::float, m.low::float, m.open::float, m.close::float
      FROM market_ticks m
      LEFT JOIN symbol_stats s ON s.symbol = m.symbol
      WHERE m.symbol = ANY($1) AND m.tick_id > $2
      ORDER BY m.tick_id ASC
      LIMIT 1000
    `;
    return query<Tick>(sql, [symbols, sinceTickId]);
  }

  /**
   * Chart OHLCV candles query using TimescaleDB time_bucket
   */
  async getChartCandles(symbol: string, timeframe: '1m' | '5m' | '15m' | '1D'): Promise<import('../domain/types').ChartCandle[]> {
    const bucketInterval = 
      timeframe === '1m' ? '1 minute' :
      timeframe === '5m' ? '5 minutes' :
      timeframe === '15m' ? '15 minutes' : '1 day';

    const lookback = 
      timeframe === '1m' ? '6 hours' :
      timeframe === '5m' ? '2 days' :
      timeframe === '15m' ? '7 days' : '90 days';

    const sql = `
      SELECT 
        time_bucket('${bucketInterval}', timestamp) AS time,
        first(open, timestamp)::float AS open,
        max(high)::float AS high,
        min(low)::float AS low,
        last(close, timestamp)::float AS close,
        sum(volume)::bigint AS volume
      FROM market_ticks
      WHERE symbol = $1 AND timestamp >= NOW() - INTERVAL '${lookback}'
      GROUP BY time
      ORDER BY time ASC
    `;
    const rows = await query<any>(sql, [symbol]);
    return rows.map((r) => ({
      time: new Date(r.time).toISOString(),
      open: Number(r.open) || Number(r.close) || 100,
      high: Number(r.high) || Number(r.close) || 100,
      low: Number(r.low) || Number(r.close) || 100,
      close: Number(r.close) || 100,
      volume: Number(r.volume) || 0,
    }));
  }

  /**
   * Trajectory sparklines (30d, 90d, 1y) normalized to percent returns
   */
  async getTrajectoryData(symbol: string): Promise<import('../domain/types').TrajectoryData> {
    const sql = `
      SELECT 
        time_bucket('1 day', timestamp) AS day,
        last(close, timestamp)::float AS close
      FROM market_ticks
      WHERE symbol = $1 AND timestamp >= NOW() - INTERVAL '365 days'
      GROUP BY day
      ORDER BY day ASC
    `;
    const rows = await query<{ day: Date; close: number }>(sql, [symbol]);
    const prices = rows.map((r) => r.close).filter((c) => typeof c === 'number' && c > 0);

    const calcReturn = (slice: number[]) => {
      if (slice.length < 2) return 0;
      const first = slice[0];
      const last = slice[slice.length - 1];
      return Number((((last - first) / first) * 100).toFixed(2));
    };

    const s30 = prices.slice(-30);
    const s90 = prices.slice(-90);
    const s1y = prices;

    return {
      p30d: calcReturn(s30),
      p90d: calcReturn(s90),
      p1y: calcReturn(s1y),
      spark30d: s30.length > 0 ? s30 : [100, 100],
      spark90d: s90.length > 0 ? s90 : [100, 100],
      spark1y: s1y.length > 0 ? s1y : [100, 100],
    };
  }
}

export const tickRepository = new TickRepository();

