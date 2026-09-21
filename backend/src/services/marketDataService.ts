import { config } from '../config';
import { marketSimulator } from '../marketdata/simulator';
import { yfCandleClient } from '../marketdata/yfCandleClient';
import { yahooClient } from '../marketdata/yahooClient';
import { watchlistService } from './watchlistService';
import { tickRepository } from '../repositories/tickRepository';
import { signalEngine } from '../signal/engine';
import { alertEngine } from '../signal/alertEngine';
import { calendarService } from './calendarService';
import { warmupSeeder } from './warmupSeeder';
import { reconciliationJob } from './reconciliationJob';
import { redisPub, redisHotState } from '../db/redis';
import { wsManager } from '../websocket';
import { query } from '../db/postgres';
import { Tick } from '../domain/types';

export class MarketDataService {
  private loopTimer: NodeJS.Timeout | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;
  private trackedSymbols: Set<string> = new Set(config.market.symbols);
  private cycleCount = 0;

  // Exponential backoff state with jitter
  private consecutiveErrors = 0;
  private baseDelayMs = 15000; // 15s when open
  private offHoursDelayMs = 60 * 60 * 1000; // 60m when closed

  async refreshTrackedSymbols() {
    try {
      const symbolsFromDb = await watchlistService.getAllTrackedSymbols();
      symbolsFromDb.forEach((s) => this.trackedSymbols.add(s));
      config.market.symbols.forEach((s) => this.trackedSymbols.add(s));
    } catch (e) {
      // Keep existing symbols
    }
  }

  /**
   * Process a tick through the Unified Evaluation Loop:
   * 1. Indicator state update (WarmupSeeder)
   * 2. Signal Engine (7 detectors + Gap detector, shadow vs live)
   * 3. Alert Rules Engine (price thresholds + composite conditions)
   * 4. Persistence (TimescaleDB hypertable + Redis hot state)
   * 5. Fanout (Redis pub/sub + WebSocket broadcast + Web Push on alert)
   */
  async processUnifiedTick(tick: Tick, isRealCandle = true): Promise<void> {
    const symbol = tick.symbol;

    // 1. Indicator state update
    warmupSeeder.appendTick(symbol, tick.ltp);

    const baseClose = tick.close ?? tick.ltp;
    const change = Number((tick.ltp - baseClose).toFixed(2));
    const changePercent = baseClose > 0 ? Number(((change / baseClose) * 100).toFixed(2)) : 0;

    const tickPayload = {
      type: 'tick',
      symbol,
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
      timestamp: tick.timestamp instanceof Date ? tick.timestamp.toISOString() : new Date().toISOString(),
      isRealCandle,
    };

    // 2. Persist to TimescaleDB hypertable
    try {
      await tickRepository.insertTick(tick);
    } catch (e) { }

    // 3. Hot state write: Redis last_tick:<SYMBOL>
    try {
      await redisHotState.setLastTick(symbol, tickPayload);
    } catch (e) { }

    // 4. Record to WebSocket manager (snapshot cache & ring buffer)
    wsManager.recordTick(symbol, tickPayload);

    // 5. Fanout via Redis Pub/Sub & live WebSocket
    try {
      await redisPub.publish(`market:ticks:${symbol}`, JSON.stringify(tickPayload));
    } catch (e) { }

    wsManager.broadcastToSymbol(symbol, tickPayload);

    // 6. Signal Engine evaluation
    try {
      const signals = await signalEngine.processTick(tick);
      for (const signal of signals) {
        const signalPayload = {
          type: 'signal',
          symbol: signal.symbol,
          signalType: signal.signalType,
          severity: signal.severity,
          description: signal.description,
          metadata: signal.metadata,
          mode: signal.mode || 'live',
          timestamp: signal.triggeredAt.toISOString(),
        };

        // Only broadcast live signals to clients (shadow signals remain persisted for backtest scoring)
        if (signal.mode !== 'shadow') {
          try {
            await redisPub.publish(`market:signals:${symbol}`, JSON.stringify(signalPayload));
          } catch (e) { }

          wsManager.broadcastToSymbol(symbol, signalPayload);
        }
      }
    } catch (err: any) {
      console.warn(`[MarketDataService] Signal engine error for ${symbol}:`, err.message || err);
    }

    // 7. Alert Rules Engine evaluation (price + composite market condition)
    try {
      await alertEngine.evaluateTick(tick);
    } catch (err: any) {
      console.warn(`[MarketDataService] Alert engine error for ${symbol}:`, err.message || err);
    }
  }

  /**
   * Calendar-aware sync cycle:
   * Polls 15s during open market hours; hourly off-hours.
   * Exponential backoff with ±20% jitter on rate-limits.
   */
  async syncQuotesCycle(): Promise<void> {
    this.cycleCount++;
    await this.refreshTrackedSymbols();
    const symbols = Array.from(this.trackedSymbols);

    const isAnyOpen = calendarService.isAnyMarketOpen(symbols);

    // Broadcast market state notice
    const sampleSymbol = symbols[0] || 'GROWW';
    const sessionInfo = calendarService.getMarketSession(sampleSymbol);
    wsManager.broadcastSystemEvent({
      type: 'market_state',
      sessionState: sessionInfo.sessionState,
      isOpen: isAnyOpen,
      nextOpen: sessionInfo.nextOpen.toISOString(),
      minutesToOpen: sessionInfo.minutesToOpen,
    });

    let successCount = 0;
    let nullCount = 0;

    for (const symbol of symbols) {
      const isSymbolMarketOpen = calendarService.isMarketOpen(symbol);

      // In off-hours, we still do hourly checks, but skip intense 15s polling if closed
      if (!isSymbolMarketOpen && this.cycleCount % 240 !== 1) {
        // Only poll closed market symbols once every ~60m (every 240 cycles of 15s)
        continue;
      }

      try {
        const liveCandle = await yfCandleClient.fetchLatest(symbol);
        if (!liveCandle) {
          nullCount++;
          continue;
        }

        successCount++;
        marketSimulator.updateRealQuote(liveCandle);
        await this.processUnifiedTick(liveCandle, true);
      } catch (err: any) {
        nullCount++;
      }
    }

    // If rate-limited or high failure rate, backoff with jitter
    if (yahooClient.isRateLimited() || (nullCount > 0 && successCount === 0)) {
      this.consecutiveErrors++;
    } else {
      this.consecutiveErrors = 0;
    }

    console.log(
      `[MarketData] cycle #${this.cycleCount} | open=${isAnyOpen} | symbols=${symbols.length} ` +
      `success=${successCount} null=${nullCount} rateLimited=${yahooClient.isRateLimited()}`
    );
  }

  /**
   * Calculate next poll delay based on market status and backoff with ±20% jitter
   */
  private getNextDelayMs(): number {
    const symbols = Array.from(this.trackedSymbols);
    const isOpen = calendarService.isAnyMarketOpen(symbols);

    let base = isOpen ? this.baseDelayMs : this.offHoursDelayMs;

    if (this.consecutiveErrors > 0) {
      // Exponential backoff up to 60s
      base = Math.min(60000, this.baseDelayMs * Math.pow(1.8, Math.min(this.consecutiveErrors, 4)));
    }

    // Apply ±20% jitter against thundering herds
    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(base * jitterFactor);
  }

  private scheduleNextCycle() {
    const delay = this.getNextDelayMs();
    this.loopTimer = setTimeout(async () => {
      try {
        await this.syncQuotesCycle();
      } catch (err) {
        console.error('[MarketDataService] Cycle error:', err);
      } finally {
        this.scheduleNextCycle();
      }
    }, delay);
  }

  async startTickStream() {
    if (this.loopTimer) return;
    console.log('[MarketDataService] Booting VERITAS Market Streamer...');

    await this.refreshTrackedSymbols();
    const symbols = Array.from(this.trackedSymbols);

    // 1. Warm-Up Seeder: Prime 20-EMA, RSI, and ATR from the last 60 ticks before accepting live data
    try {
      await warmupSeeder.seedSymbols(symbols);
    } catch (err) {
      console.warn('[MarketDataService] Warmup seeder warning:', err);
    }

    // 2. Pre-load active user alert rules into AlertEngine
    try {
      await alertEngine.refreshActiveAlerts();
    } catch (err) { }

    // 3. Kick off immediate first quote cycle
    await this.syncQuotesCycle().catch(console.error);

    // 4. Schedule calendar-aware dynamic cycle with jittered backoff
    this.scheduleNextCycle();

    // 5. Hourly Reconciliation Job
    this.reconciliationTimer = setInterval(() => {
      reconciliationJob.reconcileSymbols(Array.from(this.trackedSymbols)).catch(console.error);
    }, 60 * 60 * 1000);
  }

  stopTickStream() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }
  }
}

export const marketDataService = new MarketDataService();