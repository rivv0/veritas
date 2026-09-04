import { Tick, Signal } from '../domain/types';
import { calculateVolatilitySignal } from './volatility';
import { calculatePriceBreakout } from './breakout';
import { calculateOptionsFlow } from './optionsFlow';
import { calculateMomentumReversal } from './momentumReversal';
import { calculateDeadCatBounce } from './deadCatBounce';
import { query } from '../db/postgres';

export class SignalEngine {
  private lastTicks: Map<string, Tick> = new Map();
  private base20dVolumes: Map<string, number> = new Map();

  // Cooldown tracker to eliminate any signal spamming
  private globalLastSignalTime = 0;
  private globalCooldownMs = 40 * 1000; // at most 1 signal for the ENTIRE system every 40s
  private lastSignalBySymbol: Map<string, number> = new Map(); // at most 1 signal per symbol every 3 minutes
  private symbolCooldownMs = 3 * 60 * 1000;

  async processTick(tick: Tick): Promise<Signal[]> {
    const rawSignals: Signal[] = [];
    const prevTick = this.lastTicks.get(tick.symbol) || null;

    // Guard: ignore artificial calibration price jumps (>8% single tick)
    if (prevTick && Math.abs((tick.ltp - prevTick.ltp) / prevTick.ltp) > 0.08) {
      this.lastTicks.set(tick.symbol, tick);
      return [];
    }
    const breakoutSignal = calculatePriceBreakout(tick, prevTick);
    if (breakoutSignal) {
      rawSignals.push(breakoutSignal);
    }

    // 2. Institutional Options Flow & Smart Money Buildup
    if (!this.base20dVolumes.has(tick.symbol)) {
      this.base20dVolumes.set(tick.symbol, tick.volume || 1000000);
    }
    const avgVolume20d = this.base20dVolumes.get(tick.symbol) || 1000000;
    const optionsFlowSignal = calculateOptionsFlow(tick, prevTick, avgVolume20d);
    if (optionsFlowSignal) {
      rawSignals.push(optionsFlowSignal);
    }

    // 3. Momentum Mean-Reversion & Support Bounce
    const reversalSignal = calculateMomentumReversal(tick, prevTick);
    if (reversalSignal) {
      rawSignals.push(reversalSignal);
    }

    // 4. Volatility Spike (Extreme ATR multiple outlier moves)
    const estimatedAtr = (tick.high && tick.low && tick.high > tick.low)
      ? tick.high - tick.low
      : tick.ltp * 0.016;
    const volSignal = calculateVolatilitySignal(tick, prevTick, estimatedAtr);
    if (volSignal) {
      rawSignals.push(volSignal);
    }

    // 5. Dead Cat Bounce (Fake rally warning in severe downtrend)
    const dcbSignal = calculateDeadCatBounce(tick, prevTick);
    if (dcbSignal) {
      rawSignals.push(dcbSignal);
    }

    // Update last tick cache
    this.lastTicks.set(tick.symbol, tick);

    if (rawSignals.length === 0) {
      return [];
    }

    // Filter by strict global cooldown and symbol cooldown
    const now = Date.now();
    if (now - this.globalLastSignalTime < this.globalCooldownMs) {
      // System emitted a signal recently, hold fire to prevent spam
      return [];
    }

    const approvedSignals: Signal[] = [];

    for (const signal of rawSignals) {
      const lastSymbolTime = this.lastSignalBySymbol.get(signal.symbol) || 0;
      if (now - lastSymbolTime < this.symbolCooldownMs) {
        continue; // Symbol has a recent active signal
      }

      // Record approvals
      this.globalLastSignalTime = now;
      this.lastSignalBySymbol.set(signal.symbol, now);
      approvedSignals.push(signal);

      // Persist approved signal to database
      try {
        await this.saveSignal(signal);
      } catch (err) {
        console.error('Error saving signal to DB:', err);
      }

      // Only allow 1 signal per batch
      break;
    }

    return approvedSignals;
  }

  private async saveSignal(signal: Signal): Promise<void> {
    const sql = `
      INSERT INTO signals (id, symbol, signal_type, severity, description, metadata, triggered_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await query(sql, [
      signal.id,
      signal.symbol,
      signal.signalType,
      signal.severity,
      signal.description,
      JSON.stringify(signal.metadata || {}),
      signal.triggeredAt,
    ]);
  }
}

export const signalEngine = new SignalEngine();
