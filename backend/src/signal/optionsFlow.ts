import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculateOptionsFlow(
  currTick: Tick,
  prevTick: Tick | null,
  avgVolume20d: number = 1000000
): Signal | null {
  const baseClose = currTick.close || currTick.open || currTick.ltp;
  if (baseClose <= 0 || !prevTick) return null;

  const percentMove = ((currTick.ltp - baseClose) / baseClose) * 100;
  const tickJump = ((currTick.ltp - prevTick.ltp) / prevTick.ltp) * 100;
  const volRatio = currTick.volume / Math.max(avgVolume20d, 10000);

  // Deterministic institutional order flow conditions:
  // Requires significant relative volume expansion (>=2.0x 20d average)
  // combined with strong directional displacement and instantaneous velocity
  const isBullishSurge = volRatio >= 2.0 && percentMove >= 1.5 && tickJump >= 0.20;
  const isBearishSurge = volRatio >= 2.0 && percentMove <= -1.5 && tickJump <= -0.20;

  if (!isBullishSurge && !isBearishSurge) {
    return null;
  }

  const isBullish = isBullishSurge;
  const timestamp = currTick.timestamp || new Date();
  const turnoverCr = Number(((currTick.volume * currTick.ltp) / 10000000).toFixed(1));
  const volMultiple = Number(volRatio.toFixed(1));
  const absMove = Math.abs(percentMove);
  const severity = Math.min(95, Math.max(78, Math.round(75 + absMove * 5)));

  if (isBullish) {
    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: currTick.symbol,
      signalType: SignalType.OPTIONS_FLOW,
      severity,
      description: `${currTick.symbol}: Institutional Block Accumulation • ${volMultiple}x Volume Surge (Est. ₹${turnoverCr} Cr Turnover)`,
      metadata: {
        action: 'INSTITUTIONAL_BUY_BLOCK',
        volumeRatio: volMultiple,
        estimatedTurnoverCr: turnoverCr,
        sentiment: 'BULLISH',
        ltp: currTick.ltp,
        percentMove: Number(percentMove.toFixed(2)),
        tickJump: Number(tickJump.toFixed(2)),
        rationale: `Aggressive institutional buyer absorption detected with ${volMultiple}x 20-day average volume expansion and ₹${turnoverCr} Cr traded value`,
        keyStats: [
          { label: 'Traded Turnover', value: `₹${turnoverCr} Cr` },
          { label: 'Volume Surge', value: `${volMultiple}x 20d Avg` },
          { label: 'Session Gain', value: `+${percentMove.toFixed(2)}%` },
          { label: 'Flow Direction', value: 'Aggressive Buyer Lift' },
        ],
      },
      triggeredAt: timestamp,
    };
  } else {
    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: currTick.symbol,
      signalType: SignalType.OPTIONS_FLOW,
      severity,
      description: `${currTick.symbol}: Institutional Block Liquidation • ${volMultiple}x Volume Surge (Est. ₹${turnoverCr} Cr Turnover)`,
      metadata: {
        action: 'INSTITUTIONAL_SELL_BLOCK',
        volumeRatio: volMultiple,
        estimatedTurnoverCr: turnoverCr,
        sentiment: 'BEARISH',
        ltp: currTick.ltp,
        percentMove: Number(percentMove.toFixed(2)),
        tickJump: Number(tickJump.toFixed(2)),
        rationale: `Heavy institutional block distribution detected with ${volMultiple}x 20-day average volume expansion and ₹${turnoverCr} Cr traded value`,
        keyStats: [
          { label: 'Traded Turnover', value: `₹${turnoverCr} Cr` },
          { label: 'Volume Surge', value: `${volMultiple}x 20d Avg` },
          { label: 'Session Drop', value: `${percentMove.toFixed(2)}%` },
          { label: 'Flow Direction', value: 'Aggressive Seller Hit' },
        ],
      },
      triggeredAt: timestamp,
    };
  }
}

export const calculateInstitutionalFlow = calculateOptionsFlow;
