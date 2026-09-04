import { config } from '../config';
import { marketSimulator } from '../marketdata/simulator';
import { yahooClient } from '../marketdata/yahooClient';
import { watchlistService } from './watchlistService';
import { tickRepository } from '../repositories/tickRepository';
import { signalEngine } from '../signal/engine';
import { redisPub } from '../db/redis';
import { wsManager } from '../websocket';

export class MarketDataService {
  private timer: NodeJS.Timeout | null = null;
  private realSyncTimer: NodeJS.Timeout | null = null;
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
    console.log(`[MarketDataService] Polling Yahoo Finance (every 30s) for ${this.trackedSymbols.size} symbols...`);

    for (const symbol of Array.from(this.trackedSymbols)) {
      try {
        const liveQuote = await yahooClient.fetchQuote(symbol);
        if (liveQuote) {
          // 1. Recalibrate simulator baseline to real market quote
          marketSimulator.updateRealQuote(liveQuote);

          // 2. Persist real market tick to TimescaleDB / PostgreSQL
          await tickRepository.insertTick(liveQuote);

          // 3. Publish real tick to Redis Pub/Sub
          const tickPayload = JSON.stringify({
            type: 'tick',
            symbol: liveQuote.symbol,
            ltp: liveQuote.ltp,
            volume: liveQuote.volume,
            bid: liveQuote.bid,
            ask: liveQuote.ask,
            high: liveQuote.high,
            low: liveQuote.low,
            open: liveQuote.open,
            close: liveQuote.close,
            timestamp: liveQuote.timestamp.toISOString(),
          });

          try {
            await redisPub.publish(`market:ticks:${symbol}`, tickPayload);
          } catch (e) {}

          // 4. Process real tick through Signal Engine
          const signals = await signalEngine.processTick(liveQuote);
          for (const signal of signals) {
            try {
              const signalPayload = JSON.stringify({
                type: 'signal',
                symbol: signal.symbol,
                signalType: signal.signalType,
                severity: signal.severity,
                description: signal.description,
                metadata: signal.metadata,
                timestamp: signal.triggeredAt.toISOString(),
              });
              await redisPub.publish(`market:signals:${symbol}`, signalPayload);
            } catch (e) {}
          }
        }
      } catch (err) {
        // Continue to next symbol
      }
    }
  }

  startTickStream() {
    if (this.timer) return;
    console.log('Starting Real-Time Market Data Streamer & Signal Engine...');

    // 1. Initial real market quote sync
    this.syncRealQuotes().catch(console.error);

    // 2. Poll Yahoo Finance every 30 seconds for real stocks
    this.realSyncTimer = setInterval(() => {
      this.syncRealQuotes().catch(console.error);
    }, 30000);

    // 3. Simulator for demo purposes: generates realistic intraday movements every 1.5s
    this.timer = setInterval(async () => {
      const symbols = Array.from(this.trackedSymbols);

      for (const symbol of symbols) {
        try {
          // Generate realistic micro-tick around real market price
          const tick = marketSimulator.generateTick(symbol);
          
          // Store tick in TimescaleDB / PostgreSQL
          await tickRepository.insertTick(tick);

          // Publish to Redis Pub/Sub for real-time WebSocket delivery
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
            timestamp: tick.timestamp.toISOString(),
          };

          try {
            await redisPub.publish(`market:ticks:${symbol}`, JSON.stringify(tickPayload));
          } catch (e) {}

          // Fallback direct broadcast in case Redis pub/sub isn't used
          wsManager.broadcastToSymbol(symbol, tickPayload);

          // Process tick through Signal Engine (ATR move, Volume Anomaly, Sector Divergence)
          const signals = await signalEngine.processTick(tick);

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
            } catch (e) {
              // Fallback direct broadcast if redis is offline
              wsManager.broadcastToSymbol(symbol, signalPayload);
            }
          }

        } catch (err) {
          console.error(`Error in market data stream for ${symbol}:`, err);
        }
      }
    }, config.market.tickIntervalMs || 1500);
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
