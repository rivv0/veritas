import { Tick, Signal, SignalType, DetectorConfig } from '../domain/types';
import { calculateVolatilitySignal } from './volatility';
import { calculatePriceBreakout } from './breakout';
import { calculateOptionsFlow } from './optionsFlow';
import { calculateMomentumReversal } from './momentumReversal';
import { calculateDeadCatBounce } from './deadCatBounce';
import { calculateVolumeAnomaly } from './volume';
import { calculateSectorDivergence, NIFTY_SECTOR_MAP } from './divergence';
import { gapDetector } from './gapDetector';
import { query } from '../db/postgres';

export class SignalEngine {
  private lastTicks: Map<string, Tick> = new Map();
  private base20dVolumes: Map<string, number> = new Map();

  // Cooldown & Deduplication tracker
  private globalLastSignalTime = 0;
  private globalCooldownMs = 40 * 1000; // at most 1 signal for the ENTIRE system every 40s
  private lastSignalBySymbol: Map<string, number> = new Map(); // at most 1 signal per symbol every 3 minutes
  private symbolCooldownMs = 3 * 60 * 1000;
  private lastEmittedBySymbolType: Map<string, { price: number; timestamp: number; signature: string }> = new Map();

  // Detector Registry & Kill Switches
  private detectorConfigs: Map<string, DetectorConfig> = new Map([
    [SignalType.PRICE_BREAKOUT, { id: SignalType.PRICE_BREAKOUT, name: 'Price Breakout', mode: 'live', enabled: true, minSeverity: 60 }],
    [SignalType.OPTIONS_FLOW, { id: SignalType.OPTIONS_FLOW, name: 'Institutional Order Flow', mode: 'live', enabled: true, minSeverity: 65 }],
    [SignalType.MOMENTUM_REVERSAL, { id: SignalType.MOMENTUM_REVERSAL, name: 'Momentum Reversal', mode: 'live', enabled: true, minSeverity: 60 }],
    [SignalType.VOLATILITY_SPIKE, { id: SignalType.VOLATILITY_SPIKE, name: 'Volatility Spike', mode: 'live', enabled: true, minSeverity: 70 }],
    [SignalType.DEAD_CAT_BOUNCE, { id: SignalType.DEAD_CAT_BOUNCE, name: 'Dead Cat Bounce (Bull Trap)', mode: 'live', enabled: true, minSeverity: 75 }],
    [SignalType.VOLUME_ANOMALY, { id: SignalType.VOLUME_ANOMALY, name: 'Volume Anomaly', mode: 'live', enabled: true, minSeverity: 65 }],
    [SignalType.SECTOR_DIVERGENCE, { id: SignalType.SECTOR_DIVERGENCE, name: 'Sector Divergence', mode: 'live', enabled: true, minSeverity: 60 }],
    [SignalType.GAP_DETECTION, { id: SignalType.GAP_DETECTION, name: 'Opening Gap Detector', mode: 'live', enabled: true, minSeverity: 70 }],
  ]);

  isDetectorEnabled(type: SignalType | string): boolean {
    const cfg = this.detectorConfigs.get(type);
    return cfg ? cfg.enabled : true;
  }

  getDetectorMode(type: SignalType | string): 'live' | 'shadow' {
    const cfg = this.detectorConfigs.get(type);
    return cfg ? cfg.mode : 'live';
  }

  getDetectorConfigs(): DetectorConfig[] {
    return Array.from(this.detectorConfigs.values());
  }

  updateDetectorConfig(id: string, updates: Partial<DetectorConfig>): boolean {
    const cfg = this.detectorConfigs.get(id);
    if (!cfg) return false;
    this.detectorConfigs.set(id, { ...cfg, ...updates });
    return true;
  }

  async processTick(tick: Tick, forceMode?: 'live' | 'shadow'): Promise<Signal[]> {
    const rawSignals: Signal[] = [];
    const prevTick = this.lastTicks.get(tick.symbol) || null;

    // Guard: ignore artificial calibration price jumps (>8% single tick)
    if (prevTick && Math.abs((tick.ltp - prevTick.ltp) / prevTick.ltp) > 0.08) {
      this.lastTicks.set(tick.symbol, tick);
      return [];
    }

    // 1. Breakout
    if (this.isDetectorEnabled(SignalType.PRICE_BREAKOUT)) {
      const breakoutSignal = calculatePriceBreakout(tick, prevTick);
      if (breakoutSignal) {
        breakoutSignal.mode = forceMode || this.getDetectorMode(SignalType.PRICE_BREAKOUT);
        rawSignals.push(breakoutSignal);
      }
    }

    // 2. Institutional Order Flow & Block Accumulation
    if (tick.avgVolume20d && tick.avgVolume20d > 0) {
      this.base20dVolumes.set(tick.symbol, tick.avgVolume20d);
    } else if (!this.base20dVolumes.has(tick.symbol)) {
      this.base20dVolumes.set(tick.symbol, tick.volume || 1000000);
    }
    const avgVolume20d = this.base20dVolumes.get(tick.symbol) || 1000000;

    if (this.isDetectorEnabled(SignalType.OPTIONS_FLOW)) {
      const optionsFlowSignal = calculateOptionsFlow(tick, prevTick, avgVolume20d);
      if (optionsFlowSignal) {
        optionsFlowSignal.mode = forceMode || this.getDetectorMode(SignalType.OPTIONS_FLOW);
        rawSignals.push(optionsFlowSignal);
      }
    }

    // 3. Momentum Mean-Reversion & Support Bounce
    if (this.isDetectorEnabled(SignalType.MOMENTUM_REVERSAL)) {
      const reversalSignal = calculateMomentumReversal(tick, prevTick);
      if (reversalSignal) {
        reversalSignal.mode = forceMode || this.getDetectorMode(SignalType.MOMENTUM_REVERSAL);
        rawSignals.push(reversalSignal);
      }
    }

    // 4. Volatility Spike (Extreme ATR multiple outlier moves)
    if (this.isDetectorEnabled(SignalType.VOLATILITY_SPIKE)) {
      const estimatedAtr = (tick.high && tick.low && tick.high > tick.low)
        ? tick.high - tick.low
        : tick.ltp * 0.016;
      const volSignal = calculateVolatilitySignal(tick, prevTick, estimatedAtr);
      if (volSignal) {
        volSignal.mode = forceMode || this.getDetectorMode(SignalType.VOLATILITY_SPIKE);
        rawSignals.push(volSignal);
      }
    }

    // 5. Dead Cat Bounce (Fake rally warning in severe downtrend)
    if (this.isDetectorEnabled(SignalType.DEAD_CAT_BOUNCE)) {
      const dcbSignal = calculateDeadCatBounce(tick, prevTick);
      if (dcbSignal) {
        dcbSignal.mode = forceMode || this.getDetectorMode(SignalType.DEAD_CAT_BOUNCE);
        rawSignals.push(dcbSignal);
      }
    }

    // 6. Volume Anomaly (Unusual institutional participation >= 1.5x 20d average)
    if (this.isDetectorEnabled(SignalType.VOLUME_ANOMALY)) {
      const volAnomalySignal = calculateVolumeAnomaly(tick, avgVolume20d);
      if (volAnomalySignal) {
        volAnomalySignal.mode = forceMode || this.getDetectorMode(SignalType.VOLUME_ANOMALY);
        rawSignals.push(volAnomalySignal);
      }
    }

    // 7. Sector Divergence (Decoupling >= 1.2% from sector peers)
    if (this.isDetectorEnabled(SignalType.SECTOR_DIVERGENCE)) {
      const sectorInfo = NIFTY_SECTOR_MAP[tick.symbol];
      if (sectorInfo) {
        let peerReturnSum = 0;
        let peerCount = 0;
        for (const [sym, peerTick] of this.lastTicks.entries()) {
          if (sym !== tick.symbol && NIFTY_SECTOR_MAP[sym]?.index === sectorInfo.index) {
            const peerClose = peerTick.close || peerTick.open || peerTick.ltp;
            if (peerClose > 0) {
              peerReturnSum += ((peerTick.ltp - peerClose) / peerClose) * 100;
              peerCount++;
            }
          }
        }
        if (peerCount > 0) {
          const sectorAvgReturn = peerReturnSum / peerCount;
          const baseClose = tick.close || tick.open || tick.ltp;
          const divergenceSignal = calculateSectorDivergence(tick, baseClose, sectorAvgReturn);
          if (divergenceSignal) {
            divergenceSignal.mode = forceMode || this.getDetectorMode(SignalType.SECTOR_DIVERGENCE);
            rawSignals.push(divergenceSignal);
          }
        }
      }
    }

    // 8. Gap Detector (~40 lines, evaluates opening vs prior close)
    if (this.isDetectorEnabled(SignalType.GAP_DETECTION)) {
      const gapSignal = gapDetector.detectGap(
        tick,
        forceMode || this.getDetectorMode(SignalType.GAP_DETECTION)
      );
      if (gapSignal) {
        rawSignals.push(gapSignal);
      }
    }

    // Update last tick cache
    this.lastTicks.set(tick.symbol, tick);

    if (rawSignals.length === 0) {
      return [];
    }

    // In shadow replay mode, return all without enforcing live cooldowns
    if (forceMode === 'shadow') {
      return rawSignals;
    }

    // Filter by strict global cooldown and symbol cooldown
    const now = tick.timestamp ? new Date(tick.timestamp).getTime() : Date.now();
    if (now - this.globalLastSignalTime < this.globalCooldownMs) {
      return [];
    }

    const approvedSignals: Signal[] = [];

    for (const signal of rawSignals) {
      // 1. Symbol cooldown check: at least 3 minutes between signals for the same symbol
      const lastSymbolTime = this.lastSignalBySymbol.get(signal.symbol) || 0;
      if (now - lastSymbolTime < this.symbolCooldownMs) {
        continue;
      }

      // 2. Exact Deduplication Check: if market is static and price has not moved, suppress repeat emission
      const dedupeKey = `${signal.symbol}:${signal.signalType}`;
      const lastEmitted = this.lastEmittedBySymbolType.get(dedupeKey);
      if (lastEmitted) {
        const priceMovePercent = lastEmitted.price > 0
          ? Math.abs(tick.ltp - lastEmitted.price) / lastEmitted.price
          : 0;
        const priceMoveAbs = Math.abs(tick.ltp - lastEmitted.price);
        const signature = `${signal.severity}:${signal.description}`;

        // Suppress re-fire if price hasn't shifted by at least 0.15% (or >= 0.05 pts) AND signature is identical
        if (priceMovePercent < 0.0015 && priceMoveAbs < 0.05 && signature === lastEmitted.signature) {
          continue;
        }
      }

      // Record approvals
      this.globalLastSignalTime = now;
      this.lastSignalBySymbol.set(signal.symbol, now);
      this.lastEmittedBySymbolType.set(dedupeKey, {
        price: tick.ltp,
        timestamp: now,
        signature: `${signal.severity}:${signal.description}`,
      });
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
      INSERT INTO signals (id, symbol, signal_type, severity, description, metadata, triggered_at, mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await query(sql, [
      signal.id,
      signal.symbol,
      signal.signalType,
      signal.severity,
      signal.description,
      JSON.stringify(signal.metadata || {}),
      signal.triggeredAt,
      signal.mode || 'live',
    ]);
  }
}

export const signalEngine = new SignalEngine();
