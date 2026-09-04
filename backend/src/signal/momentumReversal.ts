import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculateMomentumReversal(
  currTick: Tick,
  prevTick: Tick | null
): Signal | null {
  const baseClose = currTick.close || currTick.open || currTick.ltp;
  if (baseClose <= 0 || !prevTick) return null;

  const tickDelta = currTick.ltp - prevTick.ltp;
  const tickJumpPercent = (tickDelta / prevTick.ltp) * 100;
  const netChangePercent = ((currTick.ltp - baseClose) / baseClose) * 100;

  // 1. Oversold Support Bounce:
  const isNearDayLow = currTick.low ? (prevTick.ltp <= currTick.low * 1.004) : netChangePercent <= -1.0;
  if (isNearDayLow && tickJumpPercent >= 0.22) {
    const severity = Math.min(95, Math.max(65, Math.round(60 + tickJumpPercent * 60 + Math.abs(netChangePercent) * 7)));
    const lowPrice = currTick.low || (baseClose * (1 + netChangePercent / 100));

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: currTick.symbol,
      signalType: SignalType.MOMENTUM_REVERSAL,
      severity,
      description: `${currTick.symbol}: Support Bounce off ₹${lowPrice.toFixed(2)} (+${tickJumpPercent.toFixed(2)}% impulse) • Institutional Absorption & Short Covering`,
      metadata: {
        reversalType: 'SUPPORT_BOUNCE',
        lowPrice: Number(lowPrice.toFixed(2)),
        tickJumpPercent: Number(tickJumpPercent.toFixed(2)),
        netChangePercent: Number(netChangePercent.toFixed(2)),
        sentiment: 'BULLISH_REVERSAL',
        ltp: currTick.ltp,
        rationale: `Sharp rebound impulse of +${tickJumpPercent.toFixed(2)}% immediately following test of intraday support ₹${lowPrice.toFixed(2)}`,
        keyStats: [
          { label: 'Pivot Low', value: `₹${lowPrice.toFixed(2)}` },
          { label: 'Reversal Impulse', value: `+${tickJumpPercent.toFixed(2)}%` },
          { label: 'Net Intraday', value: `${netChangePercent.toFixed(2)}%` },
          { label: 'Market Action', value: 'Institutional Short Covering' },
        ],
      },
      triggeredAt: currTick.timestamp || new Date(),
    };
  }

  // 2. Overbought Resistance Rejection:
  const isNearDayHigh = currTick.high ? (prevTick.ltp >= currTick.high * 0.996) : netChangePercent >= 1.5;
  if (isNearDayHigh && tickJumpPercent <= -0.25) {
    const severity = Math.min(95, Math.max(65, Math.round(60 + Math.abs(tickJumpPercent) * 60 + netChangePercent * 6)));
    const highPrice = currTick.high || (baseClose * (1 + netChangePercent / 100));

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: currTick.symbol,
      signalType: SignalType.MOMENTUM_REVERSAL,
      severity,
      description: `${currTick.symbol}: Resistance Rejection at ₹${highPrice.toFixed(2)} (${tickJumpPercent.toFixed(2)}% drop) • Profit Booking Exhaustion`,
      metadata: {
        reversalType: 'RESISTANCE_REJECTION',
        highPrice: Number(highPrice.toFixed(2)),
        tickJumpPercent: Number(tickJumpPercent.toFixed(2)),
        netChangePercent: Number(netChangePercent.toFixed(2)),
        sentiment: 'BEARISH_REJECTION',
        ltp: currTick.ltp,
        rationale: `Exhaustion pullback of ${tickJumpPercent.toFixed(2)}% after rejection at overhead resistance ₹${highPrice.toFixed(2)}`,
        keyStats: [
          { label: 'Resistance High', value: `₹${highPrice.toFixed(2)}` },
          { label: 'Pullback Delta', value: `${tickJumpPercent.toFixed(2)}%` },
          { label: 'Net Intraday', value: `+${netChangePercent.toFixed(2)}%` },
          { label: 'Market Action', value: 'Overhead Profit Booking' },
        ],
      },
      triggeredAt: currTick.timestamp || new Date(),
    };
  }

  return null;
}
