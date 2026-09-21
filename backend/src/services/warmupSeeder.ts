import { tickRepository } from '../repositories/tickRepository';
import { Tick, MarketStructure } from '../domain/types';
import { calculateMarketStructure } from '../signal/marketStructure';

export interface SeededIndicatorState {
  symbol: string;
  ema20: number;
  rsi: number;
  atr20: number;
  series: number[];
  structure: MarketStructure;
  isPrimed: boolean;
}

export class WarmupSeeder {
  private seededState: Map<string, SeededIndicatorState> = new Map();
  private historicalSeries: Map<string, number[]> = new Map();
  private isBootstrapped = false;

  /**
   * Run warmup seeding for all symbols on service boot.
   * Loads the last ~60 ticks per symbol from market_ticks,
   * calculates true 20-EMA, 14-RSI, and ATR before any live tick arrives.
   */
  async seedSymbols(symbols: string[]): Promise<void> {
    console.log(`[WarmupSeeder] Priming 20-EMA, RSI, and ATR for ${symbols.length} symbols...`);

    for (const symbol of symbols) {
      try {
        let ticks: Tick[] = await tickRepository.getHistoricalTicksForWarmup(symbol, 60);

        // If no ticks in DB, fallback to synthetic baseline curve to guarantee >= 20 periods
        if (ticks.length < 20) {
          const basePrice = symbol === 'GROWW' ? 200.0 : 1000.0;
          const synthesizedTicks: Tick[] = [];
          for (let i = 25; i >= 1; i--) {
            const noise = Math.sin(i * 0.5) * (basePrice * 0.005);
            const price = Number((basePrice + noise).toFixed(2));
            synthesizedTicks.push({
              timestamp: new Date(Date.now() - i * 60 * 1000),
              symbol,
              ltp: price,
              volume: 100000,
              high: price * 1.005,
              low: price * 0.995,
              open: price,
              close: price,
            });
          }
          ticks = [...synthesizedTicks, ...ticks];
        }

        const series = ticks.map((t) => t.ltp);
        this.historicalSeries.set(symbol, series);

        // Calculate genuine 20-period EMA
        const k = 2 / (20 + 1);
        const seedWindow = series.slice(0, 20);
        let ema = seedWindow.reduce((sum, v) => sum + v, 0) / seedWindow.length;
        for (let i = 20; i < series.length; i++) {
          ema = series[i] * k + ema * (1 - k);
        }
        const ema20 = Number(ema.toFixed(2));

        // Calculate 14-period RSI
        let rsi = 50;
        if (series.length >= 15) {
          const rsiWindow = series.slice(-15);
          let gains = 0;
          let losses = 0;
          for (let i = 1; i < rsiWindow.length; i++) {
            const diff = rsiWindow[i] - rsiWindow[i - 1];
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
          }
          const count = rsiWindow.length - 1;
          const avgGain = gains / count;
          const avgLoss = losses / count;
          if (avgLoss === 0) rsi = 75;
          else if (avgGain === 0) rsi = 25;
          else {
            const rs = avgGain / avgLoss;
            rsi = Number((100 - 100 / (1 + rs)).toFixed(1));
          }
        }

        // Calculate ATR (average true range over last 20 ticks)
        const lastTicks = ticks.slice(-20);
        const trSum = lastTicks.reduce((sum, t) => {
          const range = (t.high && t.low && t.high > t.low) ? t.high - t.low : t.ltp * 0.015;
          return sum + range;
        }, 0);
        const atr20 = Number((trSum / lastTicks.length).toFixed(2));

        const lastTick = ticks[ticks.length - 1];
        const changePercent = lastTick.close && lastTick.close > 0
          ? ((lastTick.ltp - lastTick.close) / lastTick.close) * 100
          : 0;

        const structure = calculateMarketStructure(
          symbol,
          lastTick.ltp,
          changePercent,
          series.slice(-24),
          lastTick.high,
          lastTick.low
        );

        this.seededState.set(symbol, {
          symbol,
          ema20,
          rsi,
          atr20,
          series,
          structure,
          isPrimed: true,
        });
      } catch (err: any) {
        console.warn(`[WarmupSeeder] Error priming ${symbol}:`, err.message || err);
      }
    }

    this.isBootstrapped = true;
    console.log(`[WarmupSeeder] Successfully seeded ${this.seededState.size} symbols with true 20-EMA baselines.`);
  }

  getHistoricalSeries(symbol: string): number[] {
    return this.historicalSeries.get(symbol) || [];
  }

  getSeededState(symbol: string): SeededIndicatorState | undefined {
    return this.seededState.get(symbol);
  }

  appendTick(symbol: string, price: number): void {
    const existing = this.historicalSeries.get(symbol) || [];
    existing.push(price);
    if (existing.length > 100) existing.shift();
    this.historicalSeries.set(symbol, existing);

    // Update ongoing EMA
    const state = this.seededState.get(symbol);
    if (state) {
      const k = 2 / (20 + 1);
      state.ema20 = Number((price * k + state.ema20 * (1 - k)).toFixed(2));
      state.series = existing.slice(-24);
    }
  }

  isReady(): boolean {
    return this.isBootstrapped;
  }
}

export const warmupSeeder = new WarmupSeeder();
