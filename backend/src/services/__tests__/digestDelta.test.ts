import { describe, it, expect } from 'vitest';
import { calculateMarketStructure } from '../../signal/marketStructure';
import { computeAttentionScore } from '../../signal/attention';
import { Tick } from '../../domain/types';

describe('Session Delta & Digest Integrity Integration Test', () => {
  it('correctly computes session delta, meaningful flag, and attention score from two historical tick states', () => {
    // T0: Historical tick when user closed the app
    const prevTick: Tick = {
      timestamp: new Date('2026-09-14T09:15:00.000Z'),
      symbol: 'RELIANCE',
      ltp: 1320.00,
      volume: 1200000,
      open: 1320.00,
      close: 1320.00,
      high: 1325.00,
      low: 1318.00,
    };

    // T1: Current tick when user re-opens the app 45 minutes later
    const currTick: Tick = {
      timestamp: new Date('2026-09-14T10:00:00.000Z'),
      symbol: 'RELIANCE',
      ltp: 1342.50,
      volume: 2400000,
      open: 1320.00,
      close: 1320.00,
      high: 1345.00,
      low: 1318.00,
    };

    // 1. Assert exact delta calculations
    const absoluteChange = Number((currTick.ltp - prevTick.ltp).toFixed(2));
    const percentChange = Number((((currTick.ltp - prevTick.ltp) / prevTick.ltp) * 100).toFixed(2));

    expect(absoluteChange).toBe(22.50);
    expect(percentChange).toBe(1.70); // +1.70% displacement

    // 2. Assert meaningful criteria: |percentChange| >= 0.4%
    const isMeaningful = Math.abs(percentChange) >= 0.4;
    expect(isMeaningful).toBe(true);

    // 3. Assert market structure telemetry
    const structure = calculateMarketStructure(
      currTick.symbol,
      currTick.ltp,
      percentChange,
      [1320.00, 1330.00, 1342.50],
      currTick.high,
      currTick.low
    );

    expect(structure.tier).toBe('L1'); // RELIANCE is L1 Mega-Cap
    expect(structure.sentiment).toBe('BULLISH');
    expect(structure.emaState).toBe('ABOVE_EMA');
    expect(currTick.ltp).toBeGreaterThan(structure.ema20);

    // 4. Assert dynamic attention score
    const volumeRatio = Number((currTick.volume / 1500000).toFixed(2)); // 1.6x relative volume
    const dayRangePercent = Number((((currTick.high! - currTick.low!) / currTick.low!) * 100).toFixed(2));
    const attentionScore = computeAttentionScore(percentChange, volumeRatio, [], dayRangePercent);

    expect(attentionScore).toBeGreaterThanOrEqual(50);
  });

  it('correctly identifies a quiet session without phantom volatility', () => {
    // Stock barely moved (+0.08%) with normal volume and no signals
    const prevPrice = 1000.00;
    const currPrice = 1000.80;

    const percentChange = Number((((currPrice - prevPrice) / prevPrice) * 100).toFixed(2));
    const isMeaningful = Math.abs(percentChange) >= 0.4;
    const attentionScore = computeAttentionScore(percentChange, 1.0, [], 0.2);

    expect(percentChange).toBe(0.08);
    expect(isMeaningful).toBe(false); // Quiet session: not flagged as meaningful
    expect(attentionScore).toBeLessThanOrEqual(15); // Low honest score
  });
});
