import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class GapDetector {
  private lastGapEmittedDate: Map<string, string> = new Map();
  private gapThresholdPercent = 1.2; // 1.2% gap minimum

  /**
   * Evaluates if today's opening price gapped up or down compared to yesterday's close.
   * Runs once per symbol per calendar day.
   */
  detectGap(tick: Tick, mode: 'live' | 'shadow' = 'live'): Signal | null {
    if (!tick.open || !tick.close || tick.close <= 0) return null;

    const todayDate = new Date(tick.timestamp || Date.now()).toISOString().split('T')[0];
    const dedupeKey = `${tick.symbol}:${todayDate}`;

    if (this.lastGapEmittedDate.has(dedupeKey)) {
      return null;
    }

    const gapPercent = Number((((tick.open - tick.close) / tick.close) * 100).toFixed(2));

    if (Math.abs(gapPercent) < this.gapThresholdPercent) {
      return null;
    }

    const isGapUp = gapPercent > 0;
    const severity = Math.min(95, Math.round(70 + Math.abs(gapPercent) * 6));
    const description = isGapUp
      ? `Gap Up +${gapPercent}% above prior close (${tick.close.toFixed(2)} → ${tick.open.toFixed(2)})`
      : `Gap Down ${gapPercent}% below prior close (${tick.close.toFixed(2)} → ${tick.open.toFixed(2)})`;

    this.lastGapEmittedDate.set(dedupeKey, todayDate);

    return {
      id: `sig-gap-${uuidv4().slice(0, 8)}`,
      symbol: tick.symbol,
      signalType: SignalType.GAP_DETECTION,
      severity,
      description,
      metadata: {
        gapPercent,
        prevClose: tick.close,
        openPrice: tick.open,
        direction: isGapUp ? 'GAP_UP' : 'GAP_DOWN',
      },
      mode,
      triggeredAt: new Date(tick.timestamp || Date.now()),
    };
  }

  resetDailyCache(): void {
    this.lastGapEmittedDate.clear();
  }
}

export const gapDetector = new GapDetector();
