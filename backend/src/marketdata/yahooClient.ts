import { Tick } from '../domain/types';

export interface LiveStockData extends Tick {
  sparkline?: number[];
  change?: number;
  changePercent?: number;
}

interface CacheEntry {
  data: LiveStockData;
  expiresAt: number;
}

export class YahooClient {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTLMs = 8000; // 8 seconds cache to prevent spamming

  async fetchQuote(symbol: string): Promise<LiveStockData | null> {
    const cleanSym = symbol.trim().toUpperCase();
    const cached = this.cache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Try primary symbol (append .NS if no suffix), then fallback to raw symbol
    const candidates = cleanSym.includes('.')
      ? [cleanSym]
      : [`${cleanSym}.NS`, cleanSym, `${cleanSym}.BO`];

    for (const candidate of candidates) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          candidate
        )}?interval=1m&range=1d`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        });

        if (!response.ok) continue;

        const json: any = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result || !result.meta) continue;

        const meta = result.meta;
        const ltp = meta.regularMarketPrice ?? meta.chartPreviousClose;
        if (!ltp || typeof ltp !== 'number') continue;

        const close = meta.chartPreviousClose ?? meta.previousClose ?? ltp;
        const high = meta.regularMarketDayHigh ?? ltp;
        const low = meta.regularMarketDayLow ?? ltp;
        const open = meta.regularMarketOpen ?? close;
        const volume = meta.regularMarketVolume ?? 0;

        const rawCloses: (number | null)[] =
          result.indicators?.quote?.[0]?.close || [];
        const validCloses = rawCloses.filter(
          (c): c is number => typeof c === 'number' && !isNaN(c)
        );

        // Downsample intraday closes to 20-30 points for sparkline
        const sparkline = this.downsample(validCloses, 24);

        const spread = Number((ltp * 0.0005).toFixed(2));
        const change = Number((ltp - close).toFixed(2));
        const changePercent = close > 0 ? Number(((change / close) * 100).toFixed(2)) : 0;

        const liveData: LiveStockData = {
          timestamp: new Date(),
          symbol: cleanSym,
          ltp,
          volume,
          bid: Number((ltp - spread).toFixed(2)),
          ask: Number((ltp + spread).toFixed(2)),
          high,
          low,
          open,
          close,
          sparkline: sparkline.length > 0 ? sparkline : [close, ltp],
          change,
          changePercent,
        };

        this.cache.set(cleanSym, {
          data: liveData,
          expiresAt: Date.now() + this.cacheTTLMs,
        });

        return liveData;
      } catch (err) {
        // Try next candidate
        continue;
      }
    }

    return null;
  }

  private downsample(data: number[], targetPoints: number): number[] {
    if (data.length <= targetPoints) return data.map((v) => Number(v.toFixed(2)));
    const step = (data.length - 1) / (targetPoints - 1);
    const result: number[] = [];
    for (let i = 0; i < targetPoints; i++) {
      const idx = Math.min(Math.round(i * step), data.length - 1);
      result.push(Number(data[idx].toFixed(2)));
    }
    return result;
  }
}

export const yahooClient = new YahooClient();
