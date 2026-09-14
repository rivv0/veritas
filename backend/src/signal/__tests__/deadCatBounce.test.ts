import { describe, it, expect } from 'vitest';
import { calculateDeadCatBounce } from '../deadCatBounce';
import { Tick, SignalType } from '../../domain/types';

describe('Quantitative Signal: Dead Cat Bounce Bull-Trap Engine', () => {
  const baseTick: Tick = {
    timestamp: new Date(),
    symbol: 'PAYTM',
    ltp: 678.50,
    volume: 1500000,
    open: 695.00,
    close: 695.00,
    high: 696.00,
    low: 676.00,
  };

  it('triggers DEAD_CAT_BOUNCE alert on severe downtrend with weak impulse below 20-EMA', () => {
    // Current price is down -2.37%, previous tick was 676.20 (+0.34% weak bounce)
    const prevTick: Tick = {
      ...baseTick,
      ltp: 676.20,
    };
    const currTick: Tick = {
      ...baseTick,
      ltp: 678.50,
    };
    const ema20 = 684.00; // Price 678.50 is strictly below 20-EMA

    const signal = calculateDeadCatBounce(currTick, prevTick, ema20);

    expect(signal).not.toBeNull();
    expect(signal?.signalType).toBe(SignalType.DEAD_CAT_BOUNCE);
    expect(signal?.severity).toBeGreaterThanOrEqual(75);
    expect(signal?.metadata?.action).toBe('FAKE_RALLY_WARNING');
    expect(signal?.metadata?.trapRiskPercent).toBeGreaterThanOrEqual(75);
  });

  it('safely rejects signal if price has reclaimed above 20-EMA resistance', () => {
    const prevTick: Tick = {
      ...baseTick,
      ltp: 676.20,
    };
    const currTick: Tick = {
      ...baseTick,
      ltp: 678.50,
    };
    const ema20 = 675.00; // Price 678.50 is above 20-EMA (legitimate recovery attempt)

    const signal = calculateDeadCatBounce(currTick, prevTick, ema20);
    expect(signal).toBeNull();
  });

  it('safely rejects signal if rebound impulse is too aggressive (> 0.9%)', () => {
    const prevTick: Tick = {
      ...baseTick,
      ltp: 668.00, // Jump from 668 to 678.50 is +1.57% (strong impulse, not an anemic dead cat bounce)
    };
    const currTick: Tick = {
      ...baseTick,
      ltp: 678.50,
    };

    const signal = calculateDeadCatBounce(currTick, prevTick, 684.00);
    expect(signal).toBeNull();
  });

  it('safely rejects signal if stock is not in a severe downtrend (> -1.5%)', () => {
    const mildDropTick: Tick = {
      ...baseTick,
      close: 680.00, // ltp 678.50 is only -0.22% drop
    };
    const prevTick: Tick = {
      ...mildDropTick,
      ltp: 676.50,
    };

    const signal = calculateDeadCatBounce(mildDropTick, prevTick, 684.00);
    expect(signal).toBeNull();
  });
});
