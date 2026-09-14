import { Tick } from '../domain/types';

export interface MarketBaseline {
  price: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export const REAL_MARKET_BASELINES: Record<string, MarketBaseline> = {
  RELIANCE: { price: 1257.50, close: 1274.00, high: 1267.40, low: 1253.00, volume: 8777736 },
  TCS: { price: 2200.80, close: 2204.10, high: 2232.60, low: 2185.50, volume: 2634124 },
  INFY: { price: 1037.70, close: 1036.50, high: 1047.30, low: 1029.70, volume: 6168088 },
  HDFCBANK: { price: 708.25, close: 693.80, high: 709.00, low: 681.90, volume: 31411934 },
  ICICIBANK: { price: 1379.30, close: 1384.50, high: 1389.00, low: 1367.60, volume: 7064417 },
  SBIN: { price: 995.70, close: 1009.70, high: 1001.90, low: 993.00, volume: 7771109 },
  BHARTIARTL: { price: 1831.10, close: 1839.00, high: 1852.00, low: 1830.50, volume: 4181325 },
  ITC: { price: 259.85, close: 259.30, high: 261.65, low: 257.70, volume: 11116049 },
  TATAMOTORS: { price: 740.00, close: 748.50, high: 752.00, low: 736.00, volume: 8400000 },
  LT: { price: 3930.70, close: 3955.00, high: 3948.00, low: 3880.70, volume: 1195489 },
  BAJFINANCE: { price: 1034.50, close: 1043.50, high: 1035.00, low: 1015.10, volume: 5411299 },
  MARUTI: { price: 12400.00, close: 12450.00, high: 12520.00, low: 12340.00, volume: 620000 },
  SUNPHARMA: { price: 1750.00, close: 1735.00, high: 1762.00, low: 1730.00, volume: 2900000 },
  TITAN: { price: 3600.00, close: 3640.00, high: 3655.00, low: 3585.00, volume: 1400000 },
  AXISBANK: { price: 1246.00, close: 1246.00, high: 1252.80, low: 1229.80, volume: 4562285 },
  KOTAKBANK: { price: 419.00, close: 416.55, high: 420.00, low: 409.25, volume: 15197483 },
  WIPRO: { price: 167.40, close: 166.30, high: 167.75, low: 165.16, volume: 8484897 },
  HCLTECH: { price: 1206.10, close: 1207.00, high: 1223.40, low: 1195.70, volume: 2272845 },
  TECHM: { price: 1541.00, close: 1525.80, high: 1557.30, low: 1518.60, volume: 2007328 },
  ZOMATO: { price: 254.50, close: 252.00, high: 258.00, low: 250.50, volume: 21500000 },
  PAYTM: { price: 1807.50, close: 1739.00, high: 1840.00, low: 1726.80, volume: 9269434 },
  JIOFIN: { price: 229.90, close: 230.25, high: 231.37, low: 226.44, volume: 22102551 },
  WIT: { price: 480.20, close: 485.00, high: 488.00, low: 478.00, volume: 1500000 },
  NVDA: { price: 218.29, close: 218.36, high: 222.00, low: 218.15, volume: 89060140 },
  AAPL: { price: 332.27, close: 326.57, high: 336.22, low: 326.30, volume: 50716865 },
  TSLA: { price: 365.44, close: 363.56, high: 368.66, low: 361.60, volume: 30153019 },
  MSFT: { price: 495.63, close: 492.44, high: 498.97, low: 492.58, volume: 14518435 },
  GOOGL: { price: 338.50, close: 332.60, high: 342.97, low: 335.07, volume: 24708293 },
  AMZN: { price: 256.78, close: 251.89, high: 257.59, low: 253.14, volume: 26724121 },
  META: { price: 648.03, close: 644.38, high: 664.24, low: 646.20, volume: 16924953 },
};

export class MarketSimulator {
  private currentPrices: Map<string, number> = new Map();
  private baseCloses: Map<string, number> = new Map();
  private dayHighs: Map<string, number> = new Map();
  private dayLows: Map<string, number> = new Map();
  private baseVolumes: Map<string, number> = new Map();
  private sparklines: Map<string, number[]> = new Map();

  constructor() {
    Object.entries(REAL_MARKET_BASELINES).forEach(([symbol, base]) => {
      this.currentPrices.set(symbol, base.price);
      this.baseCloses.set(symbol, base.close);
      this.dayHighs.set(symbol, base.high);
      this.dayLows.set(symbol, base.low);
      this.baseVolumes.set(symbol, base.volume);

      // Generate realistic 24-point intraday baseline trajectory from close to price
      this.sparklines.set(symbol, this.generateInitialTrajectory(base.close, base.price));
    });
  }

  private generateInitialTrajectory(startPrice: number, endPrice: number, points = 24): number[] {
    const trajectory: number[] = [Number(startPrice.toFixed(2))];
    let current = startPrice;
    const netTrend = (endPrice - startPrice) / points;

    for (let i = 1; i < points - 1; i++) {
      const noise = (Math.random() - 0.48) * (startPrice * 0.004);
      current = Math.max(startPrice * 0.92, current + netTrend + noise);
      trajectory.push(Number(current.toFixed(2)));
    }
    trajectory.push(Number(endPrice.toFixed(2)));
    return trajectory;
  }

  getSparkline(symbol: string, currentLtp?: number, baseClose?: number): number[] {
    const existing = this.sparklines.get(symbol);
    if (existing && existing.length >= 6) {
      if (currentLtp && Math.abs(existing[existing.length - 1] - currentLtp) > 0.01) {
        return [...existing.slice(0, existing.length - 1), Number(currentLtp.toFixed(2))];
      }
      return existing;
    }

    const start = baseClose || currentLtp || REAL_MARKET_BASELINES[symbol]?.close || REAL_MARKET_BASELINES[symbol]?.price || 1250;
    const end = currentLtp || start;
    const generated = this.generateInitialTrajectory(start, end);
    this.sparklines.set(symbol, generated);
    return generated;
  }

  updateRealQuote(quote: { symbol: string; ltp: number; close?: number; high?: number; low?: number; volume?: number; sparkline?: number[] }) {
    this.currentPrices.set(quote.symbol, quote.ltp);
    if (quote.close) this.baseCloses.set(quote.symbol, quote.close);
    if (quote.high) this.dayHighs.set(quote.symbol, Math.max(quote.high, quote.ltp));
    if (quote.low) this.dayLows.set(quote.symbol, Math.min(quote.low, quote.ltp));
    if (quote.volume) this.baseVolumes.set(quote.symbol, quote.volume);

    if (quote.sparkline && quote.sparkline.length >= 6) {
      this.sparklines.set(quote.symbol, quote.sparkline);
    } else {
      const existing = this.sparklines.get(quote.symbol);
      const close = quote.close || quote.ltp;
      if (!existing || existing.length < 6) {
        this.sparklines.set(quote.symbol, this.generateInitialTrajectory(close, quote.ltp));
      } else {
        // Append or recalibrate latest point
        const updated = [...existing.slice(-23), Number(quote.ltp.toFixed(2))];
        this.sparklines.set(quote.symbol, updated);
      }
    }
  }

  generateTick(symbol: string): Tick {
    const prevPrice = this.currentPrices.get(symbol) || REAL_MARKET_BASELINES[symbol]?.price || 1250;
    const baseClose = this.baseCloses.get(symbol) || REAL_MARKET_BASELINES[symbol]?.close || prevPrice;

    // Realistic micro-fluctuations (sub-tick level spread oscillation)
    // 3% chance of a small move
    const volatility = Math.random() < 0.03 ? 0.0018 : 0.0004;
    const changePercent = (Math.random() - 0.495) * volatility; 
    const newPrice = Number((prevPrice * (1 + changePercent)).toFixed(2));
    
    this.currentPrices.set(symbol, newPrice);

    const high = Math.max(newPrice, this.dayHighs.get(symbol) || newPrice);
    const low = Math.min(newPrice, this.dayLows.get(symbol) || newPrice);
    this.dayHighs.set(symbol, high);
    this.dayLows.set(symbol, low);

    // Roll sparkline
    const history = this.sparklines.get(symbol) || this.generateInitialTrajectory(baseClose, prevPrice);
    if (history.length >= 28) {
      this.sparklines.set(symbol, [...history.slice(1), newPrice]);
    } else {
      this.sparklines.set(symbol, [...history, newPrice]);
    }

    const spread = Number((newPrice * 0.0004).toFixed(2));
    const isVolumeSurge = Math.random() < 0.04;
    const volumeStep = isVolumeSurge
      ? Math.floor(Math.random() * 50000) + 20000
      : Math.floor(Math.random() * 120) + 10;
    const currentBase = this.baseVolumes.get(symbol) || 1200000;
    const totalVolume = currentBase + volumeStep;
    this.baseVolumes.set(symbol, totalVolume);

    return {
      timestamp: new Date(),
      symbol,
      ltp: newPrice,
      volume: totalVolume,
      bid: Number((newPrice - spread).toFixed(2)),
      ask: Number((newPrice + spread).toFixed(2)),
      high,
      low,
      open: baseClose,
      close: baseClose,
    };
  }
}

export const marketSimulator = new MarketSimulator();
