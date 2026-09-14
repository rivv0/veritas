import { Tick } from '../domain/types';
import { yahooClient, LiveStockData } from './yahooClient';

export interface CandleTick extends Tick {
  isRealCandle: boolean;
  change?: number;
  changePercent?: number;
  sparkline?: number[];
  avgVolume20d?: number;
}

export class YfCandleClient {
  /**
   * Fetches the latest real 1-minute OHLCV candle tick for a given symbol from Yahoo Finance.
   * Converts real exchange candle data into an institutional-grade Tick payload.
   */
  async fetchLatest(symbol: string): Promise<CandleTick | null> {
    const liveData: LiveStockData | null = await yahooClient.fetchQuote(symbol);
    if (!liveData) return null;

    const baseClose = liveData.close || liveData.open || liveData.ltp;
    const change = Number((liveData.ltp - baseClose).toFixed(2));
    const changePercent = baseClose > 0 ? Number(((change / baseClose) * 100).toFixed(2)) : 0;

    return {
      timestamp: liveData.timestamp || new Date(),
      symbol: liveData.symbol,
      ltp: liveData.ltp,
      volume: liveData.volume,
      bid: liveData.bid,
      ask: liveData.ask,
      high: liveData.high,
      low: liveData.low,
      open: liveData.open,
      close: baseClose,
      isRealCandle: true,
      change,
      changePercent,
      sparkline: liveData.sparkline,
    };
  }
}

export const yfCandleClient = new YfCandleClient();
