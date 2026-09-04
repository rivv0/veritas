import { MarketStructure } from '../domain/types';

const L1_SYMBOLS = new Set([
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT',
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'
]);

const L2_SYMBOLS = new Set([
  'TATAMOTORS', 'BHARTIARTL', 'ITC', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA',
  'TITAN', 'AXISBANK', 'KOTAKBANK', 'WIPRO', 'HCLTECH', 'ULTRACEMCO',
  'NTPC', 'POWERGRID', 'ONGC', 'COALINDIA', 'NESTLEIND', 'JSWSTEEL', 'TATASTEEL', 'M&M'
]);

const EVENT_SUFFIX_MAP: Record<string, string> = {
  RELIANCE: 'OI_BUILDUP',
  TCS: 'EARNINGS_PREVIEW',
  INFY: 'EARNINGS_PREVIEW',
  HDFCBANK: 'MERGER_WEIGHT',
  BHARTIARTL: 'BLOCK_DEAL',
  TSLA: 'HIGH_BETA',
  NVDA: 'AI_FLOW',
  ZOMATO: 'MOMENTUM_EXP',
  PAYTM: 'TURNAROUND',
  JIOFIN: 'INST_ACCUMULATION',
  AAPL: 'PRODUCT_CYCLE',
  MSFT: 'CLOUD_CATALYST',
  TATAMOTORS: 'EV_EXPANSION',
};

export function calculateMarketStructure(
  symbol: string,
  ltp: number,
  changePercent: number,
  sparkline: number[] = [],
  dayHigh?: number,
  dayLow?: number
): MarketStructure {
  const cleanSym = symbol.trim().toUpperCase();

  // 1. Tier Identification (L1 = Core Mega Cap, L2 = Sector Leader, L3 = High Beta / Momentum)
  let tier: 'L1' | 'L2' | 'L3' = 'L3';
  if (L1_SYMBOLS.has(cleanSym)) {
    tier = 'L1';
  } else if (L2_SYMBOLS.has(cleanSym)) {
    tier = 'L2';
  }

  // 2. 20-period Exponential Moving Average (X-EMA)
  const series = sparkline.length >= 8 ? sparkline : [ltp * 0.99, ltp * 0.995, ltp];
  const period = Math.min(series.length, 14);
  const k = 2 / (period + 1);
  let ema = series[0];
  for (let i = 1; i < series.length; i++) {
    ema = series[i] * k + ema * (1 - k);
  }
  const ema20 = Number(ema.toFixed(2));

  let emaState: 'ABOVE_EMA' | 'BELOW_EMA' | 'EMA_CROSS' = 'EMA_CROSS';
  if (ltp > ema20 * 1.002) {
    emaState = 'ABOVE_EMA';
  } else if (ltp < ema20 * 0.998) {
    emaState = 'BELOW_EMA';
  }

  // 3. RSI & Overbought / Oversold Detection
  let rsi = 50;
  if (series.length >= 6) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < series.length; i++) {
      const diff = series[i] - series[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / (series.length - 1);
    const avgLoss = losses / (series.length - 1);
    if (avgLoss === 0) {
      rsi = 85;
    } else {
      const rs = avgGain / avgLoss;
      rsi = Number((100 - (100 / (1 + rs))).toFixed(1));
    }
  } else {
    // Fallback: estimate from intraday range position
    const high = dayHigh || ltp * 1.01;
    const low = dayLow || ltp * 0.99;
    const range = high - low;
    if (range > 0) {
      rsi = Number((((ltp - low) / range) * 100).toFixed(1));
    }
  }

  // Clamp RSI to realistic bounds
  rsi = Math.min(88, Math.max(16, rsi));

  let rsiState: 'OVERBOUGHT' | 'OVERSOLD' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
  if (rsi >= 68 || (dayHigh && ltp >= dayHigh * 0.997 && changePercent >= 1.5)) {
    rsiState = 'OVERBOUGHT';
  } else if (rsi <= 34 || (dayLow && ltp <= dayLow * 1.003 && changePercent <= -1.5)) {
    rsiState = 'OVERSOLD';
  }

  // 4. Sentiment synthesis
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if ((changePercent > 0.3 && emaState === 'ABOVE_EMA') || rsi >= 62) {
    sentiment = 'BULLISH';
  } else if ((changePercent < -0.3 && emaState === 'BELOW_EMA') || rsi <= 38) {
    sentiment = 'BEARISH';
  }

  // 5. Dead Cat Bounce (DCB) Detection
  // Criteria: Severe prior drawdown (changePercent <= -1.2% or high-drawdown >= 2.0%),
  // minor weak bounce off intraday trough (>=0.10% from low and <=2.2%), firmly below 20-EMA, weak RSI (<=48)
  const effectiveLow = dayLow || (ltp * 0.985);
  const bounceFromLow = effectiveLow > 0 ? ((ltp - effectiveLow) / effectiveLow) * 100 : 0;
  const isDrawdownSevere = changePercent <= -1.2 || (dayHigh ? ((dayHigh - ltp) / dayHigh) >= 0.02 : false);
  const isWeakBounce = bounceFromLow >= 0.10 && bounceFromLow <= 2.2;
  const isFirmlyBelowEma = emaState === 'BELOW_EMA' || emaState === 'EMA_CROSS' || ltp <= ema20 * 1.002;

  const isDeadCatBounce = isDrawdownSevere && isWeakBounce && isFirmlyBelowEma && rsi <= 48;
  const trapRiskPercent = isDeadCatBounce
    ? Math.min(96, Math.round(72 + Math.abs(changePercent) * 3 + (48 - rsi) * 0.5))
    : 0;

  const deadCatBounceDetails = isDeadCatBounce
    ? {
        drawdownPercent: Number(Math.abs(changePercent).toFixed(2)),
        bouncePercent: Number(bounceFromLow.toFixed(2)),
        trapRiskPercent,
        warning: `FAKE RALLY WARNING: Downtrend of ${changePercent.toFixed(1)}% remains dominant below 20-EMA (₹${ema20}). Minor +${bounceFromLow.toFixed(2)}% bounce is an unconfirmed retail bull-trap.`,
      }
    : undefined;

  // 6. Event Suffix
  let eventSuffix = isDeadCatBounce ? 'DEAD_CAT_BOUNCE' : EVENT_SUFFIX_MAP[cleanSym];
  if (!eventSuffix) {
    if (Math.abs(changePercent) >= 2.2) {
      eventSuffix = 'VOLATILITY_BURST';
    } else if (rsiState === 'OVERBOUGHT') {
      eventSuffix = 'UPPER_STRETCH';
    } else if (rsiState === 'OVERSOLD') {
      eventSuffix = 'MEAN_REVERT_TEST';
    }
  }

  return {
    tier,
    sentiment,
    rsiState,
    rsi,
    emaState,
    ema20,
    eventSuffix,
    isDeadCatBounce,
    deadCatBounceDetails,
  };
}
