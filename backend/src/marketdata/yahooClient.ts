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

interface YahooSession {
  cookie: string;
  crumb: string;
  expiresAt: number;
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const US_EQUITIES = new Set([
  'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'WIT',
  'AMD', 'NFLX', 'INTC', 'PLTR', 'COIN', 'UBER', 'DIS', 'BABA', 'CRM',
  'ORCL', 'ADBE', 'AVGO', 'QCOM', 'ARM', 'MU', 'SMCI', 'CRWD', 'PANW',
  'NOW', 'SNOW', 'PYPL', 'HOOD', 'SOFI', 'SPY', 'QQQ', 'V', 'MA', 'JPM',
  'BAC', 'WMT', 'COST', 'NKE', 'SBUX'
]);
const SYMBOL_MAP: Record<string, string> = {
  GROWW: 'GROWW.NS',
  TATAMOTORS: 'TMCV.NS',
  ZOMATO: 'ETERNAL.NS',
};

export class YahooClient {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTLMs = 60000; // 60 seconds cache to prevent spamming and rate-limiting
  private avgVolCache: Map<string, { value: number; expiresAt: number }> = new Map();
  private throttleQueue: Promise<void> = Promise.resolve();
  private minIntervalMs = 500; // Paced between Yahoo calls to completely avoid 429 rate limits
  private rateLimitedUntil = 0;

  private session: YahooSession | null = null;
  private sessionPromise: Promise<YahooSession | null> | null = null;

  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  private async getSession(): Promise<YahooSession | null> {
    if (this.session && this.session.expiresAt > Date.now()) {
      return this.session;
    }
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    this.sessionPromise = (async () => {
      try {
        const cookieRes = await fetch('https://fc.yahoo.com', {
          headers: { 'User-Agent': DEFAULT_UA },
          signal: AbortSignal.timeout(6000),
        });
        const rawCookie = cookieRes.headers.get('set-cookie');
        if (!rawCookie) {
          console.warn('[Yahoo] No set-cookie header returned from fc.yahoo.com');
          return null;
        }
        const cookie = rawCookie.split(';')[0];

        for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
          try {
            const crumbRes = await fetch(`https://${host}/v1/test/getcrumb`, {
              headers: {
                'User-Agent': DEFAULT_UA,
                Cookie: cookie,
              },
              signal: AbortSignal.timeout(6000),
            });
            if (crumbRes.ok) {
              const crumb = (await crumbRes.text()).trim();
              if (crumb && !crumb.includes('<') && crumb !== 'Too Many Requests') {
                console.log(`[Yahoo] Session established with ${host} (authenticated with crumb)`);
                this.session = {
                  cookie,
                  crumb,
                  expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours validity
                };
                return this.session;
              }
            }
          } catch (err: any) {
            console.warn(`[Yahoo] Failed to get crumb from ${host}:`, err.message || err);
          }
        }
        console.warn('[Yahoo] Could not acquire crumb token');
        return null;
      } catch (err: any) {
        console.error('[Yahoo] Session initialization error:', err.message || err);
        return null;
      } finally {
        this.sessionPromise = null;
      }
    })();

    return this.sessionPromise;
  }

  private getYahooTicker(symbol: string): string {
    const clean = symbol.trim().toUpperCase();
    if (SYMBOL_MAP[clean]) return SYMBOL_MAP[clean];
    if (US_EQUITIES.has(clean)) return clean;
    if (clean.includes('.')) return clean;
    return `${clean}.NS`;
  }

  private throttle(): Promise<void> {
    this.throttleQueue = this.throttleQueue.then(
      () => new Promise((resolve) => setTimeout(resolve, this.minIntervalMs))
    );
    return this.throttleQueue;
  }

  async fetchQuote(symbol: string): Promise<LiveStockData | null> {
    if (this.isRateLimited()) {
      return null;
    }

    const cleanSym = symbol.trim().toUpperCase();
    const cached = this.cache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const ticker = this.getYahooTicker(cleanSym);
    const session = await this.getSession();
    const crumbParam = session ? `&crumb=${encodeURIComponent(session.crumb)}` : '';
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_UA,
      Accept: 'application/json',
    };
    if (session) {
      headers['Cookie'] = session.cookie;
    }

    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        await this.throttle();
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
          ticker
        )}?interval=1m&range=1d${crumbParam}`;

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Yahoo] 429 Too Many Requests from ${host} for ${ticker}`);
            this.session = null; // Invalidate session to refresh cookie/crumb on next cycle
            continue;
          }
          if (response.status === 401 || response.status === 403) {
            this.session = null;
          }
          console.error(`[Yahoo] ${ticker} @ ${host} HTTP error: ${response.status} ${response.statusText}`);
          continue;
        }

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

        // Downsample intraday closes to 20-30 points for sparkline, or synthesize if market is closed / sparse
        let sparkline = this.downsample(validCloses, 24);
        if (sparkline.length < 6) {
          sparkline = this.synthesizeIntradayCurve(open, high, low, close, ltp, 24);
        }

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
          sparkline,
          change,
          changePercent,
        };

        this.cache.set(cleanSym, {
          data: liveData,
          expiresAt: Date.now() + this.cacheTTLMs,
        });

        return liveData;
      } catch (err: any) {
        console.error(`[Yahoo] ${ticker} @ ${host} failed:`, err.message || err);
        continue;
      }
    }

    console.warn(`[Yahoo] Quote failed for ${cleanSym} (${ticker})`);
    return null;
  }

  async fetch20DayAvgVolume(symbol: string): Promise<number | null> {
    if (this.isRateLimited()) {
      return null;
    }

    const cleanSym = symbol.trim().toUpperCase();
    const cached = this.avgVolCache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const ticker = this.getYahooTicker(cleanSym);
    const session = await this.getSession();
    const crumbParam = session ? `&crumb=${encodeURIComponent(session.crumb)}` : '';
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_UA,
      Accept: 'application/json',
    };
    if (session) {
      headers['Cookie'] = session.cookie;
    }

    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        await this.throttle();
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
          ticker
        )}?interval=1d&range=1mo${crumbParam}`;

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Yahoo-Stats] 429 Too Many Requests from ${host} for ${ticker}`);
            this.session = null;
            continue;
          }
          if (response.status === 401 || response.status === 403) {
            this.session = null;
          }
          console.error(`[Yahoo-Stats] ${ticker} @ ${host} HTTP error: ${response.status} ${response.statusText}`);
          continue;
        }

        const json: any = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result) continue;

        const rawVols: (number | null)[] = result.indicators?.quote?.[0]?.volume || [];
        const validVols = rawVols.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);

        if (validVols.length > 0) {
          const recent20 = validVols.slice(-20);
          const avgVol = Math.round(recent20.reduce((sum, v) => sum + v, 0) / recent20.length);
          this.avgVolCache.set(cleanSym, {
            value: avgVol,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          });
          return avgVol;
        }
      } catch (err: any) {
        console.error(`[Yahoo-Stats] ${ticker} @ ${host} failed:`, err.message || err);
        continue;
      }
    }
    return null;
  }

  private historicalClosesCache: Map<string, { data: number[]; expiresAt: number }> = new Map();

  async fetchHistoricalCloses(symbol: string): Promise<number[]> {
    if (this.isRateLimited()) {
      return [];
    }

    const cleanSym = symbol.trim().toUpperCase();
    const cached = this.historicalClosesCache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const ticker = this.getYahooTicker(cleanSym);
    const session = await this.getSession();
    const crumbParam = session ? `&crumb=${encodeURIComponent(session.crumb)}` : '';
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_UA,
      Accept: 'application/json',
    };
    if (session) {
      headers['Cookie'] = session.cookie;
    }

    for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
      try {
        await this.throttle();
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
          ticker
        )}?interval=1d&range=1y${crumbParam}`;

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          if (response.status === 429) {
            this.rateLimitedUntil = Date.now() + 60000;
            break;
          }
          continue;
        }

        const json: any = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result) continue;

        const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
        const validCloses = rawCloses.filter(
          (c): c is number => typeof c === 'number' && !isNaN(c) && c > 0
        );

        if (validCloses.length >= 2) {
          this.historicalClosesCache.set(cleanSym, {
            data: validCloses,
            expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
          });
          return validCloses;
        }
      } catch (err: any) {
        continue;
      }
    }
    return [];
  }

  private searchCache: Map<string, { data: { symbol: string; name: string; exchange: string; sector?: string }[]; expiresAt: number }> = new Map();

  async search(query: string): Promise<{ symbol: string; name: string; exchange: string; sector?: string }[]> {
    const clean = query.trim();
    if (!clean || clean.length < 2) return [];

    const cached = this.searchCache.get(clean.toUpperCase());
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(clean)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_UA },
        signal: AbortSignal.timeout(2000), // Strict 2s timeout
      });

      if (!res.ok) return [];
      const json: any = await res.json();
      const quotes: any[] = json?.quotes || [];

      const results = quotes
        .filter((q) => q && q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || !q.quoteType))
        .map((q) => {
          let sym = (q.symbol as string).toUpperCase();
          let exchange = q.exchange || 'GLOBAL';
          if (sym.endsWith('.NS')) {
            sym = sym.replace('.NS', '');
            exchange = 'NSE';
          } else if (sym.endsWith('.BO')) {
            sym = sym.replace('.BO', '');
            exchange = 'BSE';
          }
          return {
            symbol: sym,
            name: q.shortname || q.longname || sym,
            exchange: exchange,
            sector: q.sector || 'Equity',
          };
        });

      if (results.length > 0) {
        this.searchCache.set(clean.toUpperCase(), {
          data: results,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes cache
        });
      }
      return results;
    } catch (e) {
      return [];
    }
  }

  private synthesizeIntradayCurve(open: number, high: number, low: number, close: number, ltp: number, points = 24): number[] {
    const curve: number[] = [Number(open.toFixed(2))];
    const isBullish = ltp >= close;
    const extreme1 = isBullish ? low : high;
    const extreme2 = isBullish ? high : low;

    for (let i = 1; i < points - 1; i++) {
      const progress = i / (points - 1);
      let target: number;
      if (progress < 0.35) {
        target = open + (extreme1 - open) * (progress / 0.35);
      } else if (progress < 0.7) {
        target = extreme1 + (extreme2 - extreme1) * ((progress - 0.35) / 0.35);
      } else {
        target = extreme2 + (ltp - extreme2) * ((progress - 0.7) / 0.3);
      }
      const noise = (Math.random() - 0.5) * (ltp * 0.0015);
      curve.push(Number((target + noise).toFixed(2)));
    }
    curve.push(Number(ltp.toFixed(2)));
    return curve;
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
