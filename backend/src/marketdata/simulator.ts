import { Tick } from '../domain/types';

const INITIAL_PRICES: Record<string, number> = {
  RELIANCE: 1330.00,
  TCS: 2355.00,
  INFY: 1475.00,
  HDFCBANK: 1650.30,
  ICICIBANK: 1210.00,
  SBIN: 815.00,
  BHARTIARTL: 1840.00,
  ITC: 480.00,
  TATAMOTORS: 980.00,
  LT: 3650.00,
  BAJFINANCE: 7100.00,
  MARUTI: 12400.00,
  SUNPHARMA: 1750.00,
  TITAN: 3600.00,
  AXISBANK: 1180.00,
  KOTAKBANK: 1780.00,
  WIPRO: 520.00,
  HCLTECH: 1750.00,
  TECHM: 1620.00,
  ZOMATO: 260.00,
  PAYTM: 680.00,
  JIOFIN: 330.00,
  NVDA: 120.00,
  AAPL: 225.00,
  TSLA: 215.00,
  MSFT: 440.00,
};

export class MarketSimulator {
  private currentPrices: Map<string, number> = new Map();
  private baseCloses: Map<string, number> = new Map();
  private dayHighs: Map<string, number> = new Map();
  private dayLows: Map<string, number> = new Map();
  private baseVolumes: Map<string, number> = new Map();

  constructor() {
    Object.entries(INITIAL_PRICES).forEach(([symbol, price]) => {
      this.currentPrices.set(symbol, price);
      this.baseCloses.set(symbol, price * (1 + (Math.random() * 0.01 - 0.005)));
      this.dayHighs.set(symbol, price * 1.015);
      this.dayLows.set(symbol, price * 0.985);
      this.baseVolumes.set(symbol, 1200000);
    });
  }

  updateRealQuote(quote: { symbol: string; ltp: number; close?: number; high?: number; low?: number; volume?: number }) {
    this.currentPrices.set(quote.symbol, quote.ltp);
    if (quote.close) this.baseCloses.set(quote.symbol, quote.close);
    if (quote.high) this.dayHighs.set(quote.symbol, Math.max(quote.high, quote.ltp));
    if (quote.low) this.dayLows.set(quote.symbol, Math.min(quote.low, quote.ltp));
    if (quote.volume) this.baseVolumes.set(quote.symbol, quote.volume);
  }

  generateTick(symbol: string): Tick {
    const prevPrice = this.currentPrices.get(symbol) || INITIAL_PRICES[symbol] || 1000;
    const baseClose = this.baseCloses.get(symbol) || prevPrice;

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
