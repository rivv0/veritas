import { describe, it, expect } from 'vitest';
import { computeAttentionScore } from '../attention';
import { Signal, SignalType } from '../../domain/types';

describe('Quantitative Scoring Core: computeAttentionScore', () => {
  it('assigns honest baseline floor to a quiet stock with 0% movement and no signals', () => {
    const score = computeAttentionScore(
      0.0,  // 0% price move
      1.0,  // normal 1.0x volume
      [],   // zero signals
      0.0   // zero range expansion
    );

    // Floor is set to 5 (proves quiet sessions score low and algorithm discriminates)
    expect(score).toBe(5);
  });

  it('proves exponential time-decay: fresh signal scores higher than stale signal', () => {
    const referenceTime = new Date('2026-09-14T12:00:00.000Z');

    const freshSignal: Signal = {
      id: 'sig-fresh',
      symbol: 'TATAMOTORS',
      signalType: SignalType.OPTIONS_FLOW,
      severity: 90,
      description: 'Institutional Call Sweep',
      triggeredAt: new Date('2026-09-14T11:30:00.000Z'), // 30 minutes ago
    };

    const staleSignal: Signal = {
      id: 'sig-stale',
      symbol: 'TATAMOTORS',
      signalType: SignalType.OPTIONS_FLOW,
      severity: 90,
      description: 'Institutional Call Sweep',
      triggeredAt: new Date('2026-09-14T07:00:00.000Z'), // 5 hours ago
    };

    const scoreFresh = computeAttentionScore(0.5, 1.2, [freshSignal], 1.5, referenceTime);
    const scoreStale = computeAttentionScore(0.5, 1.2, [staleSignal], 1.5, referenceTime);

    expect(scoreFresh).toBeGreaterThan(scoreStale);
    // At 30m, e^(-0.5/3) = ~0.846; at 5h, e^(-5/3) = ~0.188 (over 4x difference in signal weight)
    expect(scoreFresh - scoreStale).toBeGreaterThanOrEqual(10);
  });

  it('scales composite score aggressively on large displacement and active breakout', () => {
    const referenceTime = new Date('2026-09-14T12:00:00.000Z');
    const breakoutSignal: Signal = {
      id: 'sig-breakout',
      symbol: 'NVDA',
      signalType: SignalType.PRICE_BREAKOUT,
      severity: 95,
      description: 'Resistance Breakout',
      triggeredAt: new Date('2026-09-14T11:55:00.000Z'), // 5 minutes ago
    };

    const score = computeAttentionScore(
      3.2, // +3.2% massive move
      2.5, // 2.5x volume surge
      [breakoutSignal],
      3.0, // 3% intraday range
      referenceTime
    );

    // High momentum + volume + fresh breakout should score well above 75
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThanOrEqual(98);
  });
});
