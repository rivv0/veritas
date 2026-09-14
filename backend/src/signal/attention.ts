import { Signal } from '../domain/types';

export function computeAttentionScore(
  percentChange: number,
  volumeRatio: number = 1.0,
  signals: Signal[] = [],
  dayRangePercent: number = 1.5,
  referenceTime: Date = new Date()
): number {
  // 1. Price Momentum & Net Displacement (up to 35 points)
  const absMove = Math.abs(percentChange);
  const moveScore = Math.min(35, absMove * 16);

  // 2. Intraday Range Expansion / Volatility (up to 25 points)
  const rangeScore = Math.min(25, (dayRangePercent || 0) * 11);

  // 3. Institutional Signals & Smart Flow (up to 45 points)
  let signalScore = 0;
  const nowMs = referenceTime.getTime();

  for (const signal of signals) {
    const triggerMs = new Date(signal.triggeredAt).getTime();
    const hoursAgo = Math.max(0, (nowMs - triggerMs) / (60 * 60 * 1000));
    
    // Smooth time decay across session hours
    const recencyMultiplier = Math.exp(-hoursAgo / 3);
    const severityFactor = (signal.severity || 60) / 100;

    let baseSignalWeight = 22;
    if (signal.signalType === 'PRICE_BREAKOUT') baseSignalWeight = 28;
    if (signal.signalType === 'OPTIONS_FLOW') baseSignalWeight = 26;
    if (signal.signalType === 'MOMENTUM_REVERSAL') baseSignalWeight = 24;

    signalScore += baseSignalWeight * severityFactor * recencyMultiplier;
  }

  const cappedSignalScore = Math.min(45, signalScore);

  // 4. Relative Volume Expansion (up to 20 points, kicks in when volume exceeds 1.0x baseline)
  const volumeScore = Math.min(20, Math.max(0, (volumeRatio - 1.0) * 14));

  // 5. Total composite Attention Score
  const rawTotal = moveScore + rangeScore + cappedSignalScore + volumeScore;

  // Honest baseline floor of 5 (quiet sessions score low, proving the algorithm discriminates)
  const score = Math.min(98, Math.max(5, Math.round(rawTotal)));
  return score;
}
