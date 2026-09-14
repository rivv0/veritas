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
  TCS: { price: 4120.00, close: 4155.00, high: 4165.00, low: 4108.00, volume: 1850000 },
  INFY: { price: 1820.75, close: 1845.00, high: 1850.00, low: 1812.00, volume: 4200000 },
  HDFCBANK: { price: 1650.30, close: 1642.00, high: 1660.00, low: 1638.00, volume: 12500000 },
  ICICIBANK: { price: 1210.00, close: 1218.00, high: 1224.00, low: 1205.00, volume: 8900000 },
  SBIN: { price: 815.00, close: 810.00, high: 822.00, low: 808.00, volume: 14200000 },
  BHARTIARTL: { price: 1840.00, close: 1855.00, high: 1862.00, low: 1832.00, volume: 3800000 },
  ITC: { price: 480.00, close: 485.00, high: 488.00, low: 477.00, volume: 11000000 },
  TATAMOTORS: { price: 980.00, close: 995.00, high: 1002.00, low: 974.00, volume: 9400000 },
  LT: { price: 3650.00, close: 3690.00, high: 3705.00, low: 3635.00, volume: 2100000 },
  BAJFINANCE: { price: 7100.00, close: 7150.00, high: 7190.00, low: 7065.00, volume: 1650000 },
  MARUTI: { price: 12400.00, close: 12450.00, high: 12520.00, low: 12340.00, volume: 620000 },
  SUNPHARMA: { price: 1750.00, close: 1735.00, high: 1762.00, low: 1730.00, volume: 2900000 },
  TITAN: { price: 3600.00, close: 3640.00, high: 3655.00, low: 3585.00, volume: 1400000 },
  AXISBANK: { price: 1180.00, close: 1175.00, high: 1192.00, low: 1170.00, volume: 7300000 },
  KOTAKBANK: { price: 1780.00, close: 1795.00, high: 1805.00, low: 1772.00, volume: 3100000 },
  WIPRO: { price: 520.00, close: 528.00, high: 531.00, low: 518.00, volume: 5600000 },
  HCLTECH: { price: 1750.00, close: 1765.00, high: 1778.00, low: 1742.00, volume: 2700000 },
  TECHM: { price: 1620.00, close: 1635.00, high: 1645.00, low: 1612.00, volume: 1950000 },
  ZOMATO: { price: 260.00, close: 255.00, high: 266.00, low: 254.00, volume: 24000000 },
  PAYTM: { price: 680.00, close: 695.00, high: 702.00, low: 674.00, volume: 8200000 },
  JIOFIN: { price: 330.00, close: 334.00, high: 338.00, low: 327.00, volume: 16500000 },
  WIT: { price: 480.20, close: 485.00, high: 488.00, low: 478.00, volume: 1500000 },
  NVDA: { price: 120.00, close: 118.50, high: 122.50, low: 117.80, volume: 45000000 },
  AAPL: { price: 225.00, close: 223.50, high: 227.00, low: 222.80, volume: 38000000 },
  TSLA: { price: 215.00, close: 220.00, high: 222.00, low: 212.50, volume: 52000000 },
  MSFT: { price: 440.00, close: 438.00, high: 443.50, low: 436.50, volume: 21000000 },
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
