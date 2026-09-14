import { config } from '../config';
import { marketSimulator } from '../marketdata/simulator';
import { yfCandleClient } from '../marketdata/yfCandleClient';
import { yahooClient } from '../marketdata/yahooClient';
import { watchlistService } from './watchlistService';
import { tickRepository } from '../repositories/tickRepository';
import { signalEngine } from '../signal/engine';
import { redisPub } from '../db/redis';
import { wsManager } from '../websocket';
import { query } from '../db/postgres';

export class MarketDataService {
  private timer: NodeJS.Timeout | null = null;
  private realSyncTimer: NodeJS.Timeout | null = null;
  private statsSyncTimer: NodeJS.Timeout | null = null;
  private trackedSymbols: Set<string> = new Set(config.market.symbols);

  async refreshTrackedSymbols() {
    try {
      const symbolsFromDb = await watchlistService.getAllTrackedSymbols();
      symbolsFromDb.forEach((s) => this.trackedSymbols.add(s));
      config.market.symbols.forEach((s) => this.trackedSymbols.add(s));
    } catch (e) {
      // Keep existing symbols
    }
  }

  async syncRealQuotes() {
    await this.refreshTrackedSymbols();
    const symbols = Array.from(this.trackedSymbols);

    for (const symbol of symbols) {
      try {
        const liveCandle = await yfCandleClient.fetchLatest(symbol);
        if (liveCandle) {
          // 1. Recalibrate local simulator baseline if enabled
          marketSimulator.updateRealQuote(liveCandle);

          // 2. Persist real market candle tick to TimescaleDB / PostgreSQL
          await tickRepository.insertTick(liveCandle);

          // 3. Publish real tick payload to Redis Pub/Sub & WebSocket
          const tickPayload = {
            type: 'tick',
            symbol: liveCandle.symbol,
            ltp: liveCandle.ltp,
            volume: liveCandle.volume,
            bid: liveCandle.bid,
            ask: liveCandle.ask,
            high: liveCandle.high,
            low: liveCandle.low,
            open: liveCandle.open,
            close: liveCandle.close,
            change: liveCandle.change,
            changePercent: liveCandle.changePercent,
            timestamp: liveCandle.timestamp.toISOString(),
            isRealCandle: true,
          };

          try {
            await redisPub.publish(`market:ticks:${symbol}`, JSON.stringify(tickPayload));
          } catch (e) {}

          wsManager.broadcastToSymbol(symbol, tickPayload);

          // 4. Process real tick through Signal Engine (Dead Cat Bounce, Breakout, Reversal)
          const signals = await signalEngine.processTick(liveCandle);
          for (const signal of signals) {
            const signalPayload = {
              type: 'signal',
              symbol: signal.symbol,
              signalType: signal.signalType,
              severity: signal.severity,
              description: signal.description,
              metadata: signal.metadata,
              timestamp: signal.triggeredAt.toISOString(),
            };

            try {
              await redisPub.publish(`market:signals:${symbol}`, JSON.stringify(signalPayload));
            } catch (e) {}

            wsManager.broadcastToSymbol(symbol, signalPayload);
          }
        }
      } catch (err) {
        // Continue to next symbol
      }
    }
  }

  async syncSymbolStats() {
    await this.refreshTrackedSymbols();
    const symbols = Array.from(this.trackedSymbols);
    for (const symbol of symbols) {
      try {
        const avgVol = await yahooClient.fetch20DayAvgVolume(symbol);
        if (avgVol && avgVol > 0) {
          const sql = `
            INSERT INTO symbol_stats (symbol, avg_volume_20d, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (symbol) DO UPDATE SET avg_volume_20d = EXCLUDED.avg_volume_20d, updated_at = NOW()
          `;
          await query(sql, [symbol, avgVol]);
        }
      } catch (err) {
        // Continue to next symbol
      }
    }
  }

  startTickStream() {
    if (this.realSyncTimer) return;
    console.log('[MarketDataService] Starting Real-Feed Market Data Streamer (Yahoo 1m Candles)...');

    // 1. Immediate real market candle sync & true 20-day volume history sync
    this.syncRealQuotes().catch(console.error);
    this.syncSymbolStats().catch(console.error);

    // 2. Continuous real market polling cycle (every 15s for high-resolution candle updates)
    this.realSyncTimer = setInterval(() => {
      this.syncRealQuotes().catch(console.error);
    }, 15000);

    // 3. Daily 20-day average volume refresh cycle (every 24 hours)
    this.statsSyncTimer = setInterval(() => {
      this.syncSymbolStats().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // 3. Optional offline/after-hours Brownian motion micro-tick simulator (only if explicitly enabled)
    if (process.env.ENABLE_SYNTHETIC_SIMULATOR === 'true') {
      console.log('[MarketDataService] Offline synthetic simulator enabled as secondary fallback');
      this.timer = setInterval(async () => {
        const symbols = Array.from(this.trackedSymbols);
        for (const symbol of symbols) {
          try {
            const tick = marketSimulator.generateTick(symbol);
            await tickRepository.insertTick(tick);
            const baseClose = tick.close ?? tick.ltp;
            const change = Number((tick.ltp - baseClose).toFixed(2));
            const changePercent = baseClose > 0 ? Number(((change / baseClose) * 100).toFixed(2)) : 0;
            const tickPayload = {
              type: 'tick',
              symbol: tick.symbol,
              ltp: tick.ltp,
              volume: tick.volume,
              bid: tick.bid,
              ask: tick.ask,
              high: tick.high,
              low: tick.low,
              open: tick.open,
              close: tick.close,
              change,
              changePercent,
              timestamp: tick.timestamp.toISOString(),
            };
            try {
              await redisPub.publish(`market:ticks:${symbol}`, JSON.stringify(tickPayload));
            } catch (e) {}
            wsManager.broadcastToSymbol(symbol, tickPayload);
          } catch (err) {}
        }
      }, config.market.tickIntervalMs || 2500);
    }
  }

  stopTickStream() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.realSyncTimer) {
      clearInterval(this.realSyncTimer);
      this.realSyncTimer = null;
    }
  }
}

export const marketDataService = new MarketDataService();
