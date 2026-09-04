import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculateVolatilitySignal(
  currTick: Tick,
  prevTick: Tick | null,
  atr20Param?: number
): Signal | null {
  const baseClose = currTick.close || currTick.open || currTick.ltp;
  const intradayMove = Math.abs(currTick.ltp - baseClose);
  const percentMove = baseClose > 0 ? (intradayMove / baseClose) * 100 : 0;

  const atr20 = atr20Param && atr20Param > 0 ? atr20Param : currTick.ltp * 0.016;
  const atrRatio = Number((intradayMove / atr20).toFixed(2));
  const tickJump = prevTick ? (Math.abs(currTick.ltp - prevTick.ltp) / prevTick.ltp) * 100 : 0;

  // Trigger only on genuine institutional outlier volatility (>= 1.5x 20d ATR or rapid surge >= 0.6%)
  if (atrRatio >= 1.5 || tickJump >= 0.6) {
    const isUp = currTick.ltp >= baseClose;
    const severity = Math.min(
      95,
      Math.max(65, Math.round(Math.max(atrRatio * 35, tickJump * 75)))
    );

    const description =
      atrRatio >= 1.5
        ? `${currTick.symbol}: High Volatility Move ${atrRatio}x 20-day ATR (${isUp ? '+' : '-'}${percentMove.toFixed(2)}%)`
        : `${currTick.symbol}: Rapid ${isUp ? 'upside' : 'downside'} volatility burst (+${tickJump.toFixed(2)}% tick)`;

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: currTick.symbol,
      signalType: SignalType.VOLATILITY_SPIKE,
      severity,
      description,
      metadata: {
        atrRatio,
        atr20: Number(atr20.toFixed(2)),
        intradayMove: Number(intradayMove.toFixed(2)),
        percentMove: Number(percentMove.toFixed(2)),
        tickJump: Number(tickJump.toFixed(2)),
        isUp,
        rationale: `Intraday displacement of ₹${intradayMove.toFixed(2)} exceeds 20-day benchmark ATR (₹${atr20.toFixed(2)}) by ${atrRatio}x`,
        keyStats: [
          { label: '20-Day ATR', value: `₹${atr20.toFixed(2)}` },
          { label: 'ATR Multiple', value: `${atrRatio}x Normal Range` },
          { label: 'Intraday Move', value: `${isUp ? '+' : '-'}${percentMove.toFixed(2)}%` },
          { label: 'Signal Type', value: atrRatio >= 2.5 ? 'Statistical Outlier' : 'High Volatility' },
        ],
      },
      triggeredAt: currTick.timestamp || new Date(),
    };
  }

  return null;
}
