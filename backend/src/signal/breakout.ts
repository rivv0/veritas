import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculatePriceBreakout(
  tick: Tick,
  prevTick: Tick | null
): Signal | null {
  const baseClose = tick.close || tick.open || tick.ltp;
  if (baseClose <= 0 || !prevTick) return null;

  const gainPercent = ((tick.ltp - baseClose) / baseClose) * 100;
  const tickJump = ((tick.ltp - prevTick.ltp) / prevTick.ltp) * 100;

  // Strict Breakout criteria:
  // Must be at least +1.8% intraday gain AND testing/breaking day high AND fresh upward tick surge
  const isNearDayHigh = tick.high ? tick.ltp >= tick.high * 0.999 : true;
  if (isNearDayHigh && gainPercent >= 1.8 && tickJump >= 0.25) {
    const severity = Math.min(95, Math.max(78, Math.round(70 + gainPercent * 8)));
    const dayHigh = tick.high || tick.ltp;
    const dayLow = tick.low || baseClose;

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: tick.symbol,
      signalType: SignalType.PRICE_BREAKOUT,
      severity,
      description: `${tick.symbol} Intraday Resistance Breakout @ ₹${tick.ltp.toFixed(
        2
      )} (+${gainPercent.toFixed(2)}%) • Buyer Squeeze Active`,
      metadata: {
        breakoutType: 'RESISTANCE_BREAKOUT',
        gainPercent: Number(gainPercent.toFixed(2)),
        ltp: tick.ltp,
        high: dayHigh,
        low: dayLow,
        rationale: `Price broke above day high ₹${dayHigh.toFixed(2)} on heavy buying pressure`,
        keyStats: [
          { label: 'Day Move', value: `+${gainPercent.toFixed(2)}%` },
          { label: 'Day High', value: `₹${dayHigh.toFixed(2)}` },
          { label: 'Day Low', value: `₹${dayLow.toFixed(2)}` },
          { label: 'Order Flow', value: 'Aggressive Buyer Squeeze' },
        ],
      },
      triggeredAt: tick.timestamp || new Date(),
    };
  }

  // Downside Breakdown criteria: Net loss <= -2.0% breaking support
  const isNearDayLow = tick.low ? tick.ltp <= tick.low * 1.001 : false;
  if (isNearDayLow && gainPercent <= -2.0 && tickJump <= -0.25) {
    const severity = Math.min(95, Math.max(78, Math.round(70 + Math.abs(gainPercent) * 8)));
    const dayHigh = tick.high || baseClose;
    const dayLow = tick.low || tick.ltp;

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: tick.symbol,
      signalType: SignalType.PRICE_BREAKOUT,
      severity,
      description: `${tick.symbol} Breakdown below Day Support @ ₹${tick.ltp.toFixed(
        2
      )} (${gainPercent.toFixed(2)}%) • Bearish Pressure`,
      metadata: {
        breakoutType: 'SUPPORT_BREAKDOWN',
        gainPercent: Number(gainPercent.toFixed(2)),
        ltp: tick.ltp,
        high: dayHigh,
        low: dayLow,
        rationale: `Price breached intraday support level ₹${dayLow.toFixed(2)} on seller liquidations`,
        keyStats: [
          { label: 'Day Move', value: `${gainPercent.toFixed(2)}%` },
          { label: 'Support Level', value: `₹${dayLow.toFixed(2)}` },
          { label: 'Day High', value: `₹${dayHigh.toFixed(2)}` },
          { label: 'Order Flow', value: 'Heavy Ask Dumping' },
        ],
      },
      triggeredAt: tick.timestamp || new Date(),
    };
  }

  return null;
}
