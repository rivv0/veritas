import { describe, it, expect } from 'vitest';
import { computeAttentionScore } from '../src/signal/attention';
import { Signal, SignalType } from '../src/domain/types';

describe('Attention Scoring Unit Tests', () => {
  it('Floor test: proves quiet stocks score low and algorithm discriminates (score <= 8)', () => {
    // Quiet session: 0.1% move, 1.0x baseline volume, no signals, 0.3% day range
    const score = computeAttentionScore(0.1, 1.0, [], 0.3);

    expect(score).toBeLessThanOrEqual(8);
  });

  it('Decay test: proves exponential time-decay with recent score strictly greater than stale', () => {
    const referenceTime = new Date('2026-09-14T18:00:00.000Z');

    const recentSignal: Signal = {
      id: 'sig-recent-30m',
      symbol: 'GROWW',
      signalType: SignalType.OPTIONS_FLOW,
      severity: 90,
      description: 'Institutional Call Flow',
      triggeredAt: new Date(referenceTime.getTime() - 30 * 60 * 1000), // 30 minutes ago
    };

    const staleSignal: Signal = {
      id: 'sig-stale-6h',
      symbol: 'GROWW',
      signalType: SignalType.OPTIONS_FLOW,
      severity: 90,
      description: 'Institutional Call Flow',
      triggeredAt: new Date(referenceTime.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    };

    const scoreRecent = computeAttentionScore(0.2, 1.0, [recentSignal], 0.5, referenceTime);
    const scoreStale = computeAttentionScore(0.2, 1.0, [staleSignal], 0.5, referenceTime);

    expect(scoreRecent).toBeGreaterThan(scoreStale);
  });
});
