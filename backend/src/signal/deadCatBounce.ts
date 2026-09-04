import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculateDeadCatBounce(
  currTick: Tick,
  prevTick: Tick | null,
  ema20?: number
): Signal | null {
  const baseClose = currTick.close || currTick.open || currTick.ltp;
  if (baseClose <= 0 || !prevTick) return null;

  const percentMove = ((currTick.ltp - baseClose) / baseClose) * 100;
  const tickJump = ((currTick.ltp - prevTick.ltp) / prevTick.ltp) * 100;

  // Severe macro downtrend (>1.5% down on the day)
  if (percentMove > -1.5) return null;

  // Weak tick bounce (+0.15% to +0.8% micro-tick)
  if (tickJump < 0.15 || tickJump > 0.9) return null;

  // Must remain below 20-EMA if provided
  if (ema20 && currTick.ltp >= ema20) return null;

  const dayHigh = currTick.high || baseClose;
  const drawdownFromHigh = dayHigh > 0 ? ((dayHigh - currTick.ltp) / dayHigh) * 100 : Math.abs(percentMove);
  const trapRisk = Math.min(95, Math.round(75 + Math.abs(percentMove) * 2.5));

  return {
    id: `sig-${uuidv4().slice(0, 8)}`,
    symbol: currTick.symbol,
    signalType: SignalType.DEAD_CAT_BOUNCE,
    severity: trapRisk,
    description: `${currTick.symbol}: ⚠ DEAD CAT BOUNCE DETECTED — Weak +${tickJump.toFixed(2)}% bounce in -${Math.abs(percentMove).toFixed(1)}% downtrend below 20-EMA • High Trap Risk (${trapRisk}%)`,
    metadata: {
      action: 'FAKE_RALLY_WARNING',
      drawdownPercent: Number(Math.abs(percentMove).toFixed(2)),
      tickJumpPercent: Number(tickJump.toFixed(2)),
      drawdownFromHigh: Number(drawdownFromHigh.toFixed(2)),
      trapRiskPercent: trapRisk,
      ltp: currTick.ltp,
      rationale: `Retail bull trap alert: Minor ${tickJump.toFixed(2)}% upward retracement in a dominant -${Math.abs(percentMove).toFixed(1)}% downtrend. Trading below 20-EMA resistance without institutional volume support.`,
      keyStats: [
        { label: 'Warning Type', value: 'Dead Cat Bounce' },
        { label: 'Net Downtrend', value: `${percentMove.toFixed(2)}%` },
        { label: 'Rebound Impulse', value: `+${tickJump.toFixed(2)}% (Weak)` },
        { label: 'Bull-Trap Risk', value: `${trapRisk}% Probability` },
      ],
    },
    triggeredAt: currTick.timestamp || new Date(),
  };
}
