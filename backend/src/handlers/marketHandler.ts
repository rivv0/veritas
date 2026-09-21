import { Response } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { tickRepository } from '../repositories/tickRepository';
import { digestService } from '../services/digestService';
import { yahooClient } from '../marketdata/yahooClient';
import { marketSimulator, REAL_MARKET_BASELINES } from '../marketdata/simulator';
import { MarketSnapshot } from '../domain/types';
import { newsService } from '../services/newsService';
import { calculateMarketStructure } from '../signal/marketStructure';
import { replayBacktester } from '../signal/replayBacktester';
import { signalEngine } from '../signal/engine';
import { query } from '../db/postgres';
import { watchlistRepository } from '../repositories/watchlistRepository';


const STOCK_DIRECTORY = [
  // Honorary & Core Indian Tech / Fintech
  { symbol: 'GROWW', name: 'Groww (Billionbrains Garage Ventures)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'ZOMATO', name: 'Zomato Limited (Eternal)', exchange: 'NSE', sector: 'Consumer Tech' },
  { symbol: 'PAYTM', name: 'One97 Communications (Paytm)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'BSE', name: 'BSE Limited', exchange: 'NSE', sector: 'Exchange' },
  { symbol: 'CDSL', name: 'Central Depository Services (India)', exchange: 'NSE', sector: 'Financial Infrastructure' },
  { symbol: 'MCX', name: 'Multi Commodity Exchange of India', exchange: 'NSE', sector: 'Exchange' },

  // Indian Large Caps - Nifty 50
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy & Retail' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', sector: 'Capital Goods' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', exchange: 'NSE', sector: 'Materials' },
  { symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp of India Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', exchange: 'NSE', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd.', exchange: 'NSE', sector: 'Renewables' },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd.', exchange: 'NSE', sector: 'Power' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd.", exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories", exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'CIPLA', name: 'Cipla Limited', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd. (Royal Enfield)', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corp Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', exchange: 'NSE', sector: 'Materials' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },

  // Defence, Railway & High Momentum Indian Equities
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TRENT', name: 'Trent Ltd. (Westside / Zudio)', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'DMART', name: 'Avenue Supermarts (DMart)', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'TATACHEM', name: 'Tata Chemicals Ltd.', exchange: 'NSE', sector: 'Chemicals' },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism', exchange: 'NSE', sector: 'Railways & Tourism' },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corp', exchange: 'NSE', sector: 'Railways & Finance' },
  { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', exchange: 'NSE', sector: 'Railways' },
  { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', exchange: 'NSE', sector: 'Renewables' },
  { symbol: 'YESBANK', name: 'Yes Bank Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'VEDL', name: 'Vedanta Limited', exchange: 'NSE', sector: 'Metals & Mining' },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd.', exchange: 'NSE', sector: 'Electricals' },
  { symbol: 'HAVELLS', name: 'Havells India Ltd.', exchange: 'NSE', sector: 'Consumer Durables' },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd.', exchange: 'NSE', sector: 'Automotive Tech' },
  { symbol: 'COFORGE', name: 'Coforge Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'DLF', name: 'DLF Limited', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'GODREJPROP', name: 'Godrej Properties Ltd.', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'PFC', name: 'Power Finance Corporation', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'RECLTD', name: 'REC Limited', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd.', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'IOC', name: 'Indian Oil Corporation', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'NMDC', name: 'NMDC Limited', exchange: 'NSE', sector: 'Mining' },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd.', exchange: 'NSE', sector: 'Metals' },

  // Major US Tech Titans & Global Equities
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Consumer Tech' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Software & Cloud' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', sector: 'Internet' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'E-Commerce & Cloud' },
  { symbol: 'META', name: 'Meta Platforms Inc. (Facebook/Instagram)', exchange: 'NASDAQ', sector: 'Social Media & AI' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'EV & Clean Energy' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', sector: 'Entertainment' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', sector: 'AI & Defence Software' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', sector: 'Crypto Infrastructure' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE', sector: 'Mobility & Delivery' },
  { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', sector: 'Entertainment' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Ltd.', exchange: 'NYSE', sector: 'E-Commerce' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', exchange: 'NYSE', sector: 'Enterprise Software' },
  { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', sector: 'Cloud & Database' },
  { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', sector: 'Creative Software' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'QCOM', name: 'Qualcomm Incorporated', exchange: 'NASDAQ', sector: 'Wireless & Chips' },
  { symbol: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', sector: 'Chip Architecture' },
  { symbol: 'MU', name: 'Micron Technology, Inc.', exchange: 'NASDAQ', sector: 'Memory & Storage' },
  { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', exchange: 'NASDAQ', sector: 'AI Server Hardware' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings, Inc.', exchange: 'NASDAQ', sector: 'Cybersecurity' },
  { symbol: 'PANW', name: 'Palo Alto Networks, Inc.', exchange: 'NASDAQ', sector: 'Cybersecurity' },
  { symbol: 'NOW', name: 'ServiceNow, Inc.', exchange: 'NYSE', sector: 'Enterprise Workflow' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', sector: 'Data Cloud' },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', exchange: 'NASDAQ', sector: 'Fintech' },
  { symbol: 'HOOD', name: 'Robinhood Markets, Inc.', exchange: 'NASDAQ', sector: 'Fintech Brokerage' },
  { symbol: 'SOFI', name: 'SoFi Technologies, Inc.', exchange: 'NASDAQ', sector: 'Fintech Banking' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA', sector: 'Index ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', exchange: 'NASDAQ', sector: 'Index ETF' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Payments' },
  { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', sector: 'Payments' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Banking' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Retail' },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', exchange: 'NASDAQ', sector: 'Retail' },
];

export class MarketHandler {
  async getSnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const symbolsStr = req.query.symbols as string;
      const symbols = symbolsStr ? symbolsStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [];

      if (symbols.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Fetch repository snapshot
      const repoSnapshots = await tickRepository.getSnapshot(symbols);
      const snapshotMap = new Map<string, MarketSnapshot>(repoSnapshots.map((s) => [s.symbol, s]));

      // Enrich with real live quote data & sparklines from Yahoo Finance
      const enrichedSnapshots: MarketSnapshot[] = await Promise.all(
        symbols.map(async (symbol) => {
          const liveData = await yahooClient.fetchQuote(symbol);
          const existing = snapshotMap.get(symbol);

          if (liveData) {
            marketSimulator.updateRealQuote(liveData);

            const sparkline = (liveData.sparkline && liveData.sparkline.length >= 6)
              ? liveData.sparkline
              : marketSimulator.getSparkline(symbol, liveData.ltp, liveData.close || liveData.ltp);
            const changePercent = liveData.changePercent ?? (existing?.changePercent || 0);
            const high = liveData.high || existing?.high || liveData.ltp;
            const low = liveData.low || existing?.low || liveData.ltp;
            const structure = calculateMarketStructure(symbol, liveData.ltp, changePercent, sparkline, high, low);

            return {
              symbol,
              ltp: liveData.ltp,
              change: liveData.change ?? (existing?.change || 0),
              changePercent,
              volume: liveData.volume || existing?.volume || 100000,
              avgVolume20d: Math.round((liveData.volume || 100000) * 0.85),
              high,
              low,
              open: liveData.open || existing?.open || liveData.ltp,
              close: liveData.close || existing?.close || liveData.ltp,
              bid: liveData.bid || Number((liveData.ltp * 0.9995).toFixed(2)),
              ask: liveData.ask || Number((liveData.ltp * 1.0005).toFixed(2)),
              atr20: existing?.atr20 || Number((liveData.ltp * 0.015).toFixed(2)),
              dataFreshness: 'live',
              lastUpdated: liveData.timestamp,
              sparkline,
              structure,
            };
          }

          if (existing) {
            const sparkline = (existing.sparkline && existing.sparkline.length >= 6)
              ? existing.sparkline
              : marketSimulator.getSparkline(symbol, existing.ltp, existing.close);
            const structure = calculateMarketStructure(symbol, existing.ltp, existing.changePercent, sparkline, existing.high, existing.low);
            return {
              ...existing,
              sparkline,
              structure,
            };
          }

          // Real institutional market baseline if quote not yet fetched
          const cleanSym = symbol.trim().toUpperCase();
          const base = REAL_MARKET_BASELINES[cleanSym] || {
            price: 1250,
            close: 1265,
            high: 1270,
            low: 1245,
            volume: 1500000,
          };
          const basePrice = base.price;
          const close = base.close;
          const change = Number((basePrice - close).toFixed(2));
          const changePercent = close > 0 ? Number(((change / close) * 100).toFixed(2)) : 0;
          const fallbackSparkline = marketSimulator.getSparkline(cleanSym, basePrice, close);
          const high = base.high;
          const low = base.low;
          const volume = base.volume;
          const structure = calculateMarketStructure(cleanSym, basePrice, changePercent, fallbackSparkline, high, low);
          return {
            symbol: cleanSym,
            ltp: basePrice,
            change,
            changePercent,
            volume,
            avgVolume20d: Math.round(volume * 0.85),
            high,
            low,
            open: close,
            close,
            bid: Number((basePrice * 0.9995).toFixed(2)),
            ask: Number((basePrice * 1.0005).toFixed(2)),
            atr20: Number(((high - low) || basePrice * 0.015).toFixed(2)),
            dataFreshness: 'delayed',
            lastUpdated: new Date(),
            sparkline: fallbackSparkline,
            structure,
          };
        })
      );

      res.json({ success: true, data: enrichedSnapshots });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getDigest(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const rawLookback = (req.query.lookbackMinutes || req.query.lookback) as string;
      const lookbackMinutes = rawLookback ? parseInt(rawLookback, 10) : undefined;
      const digest = await digestService.generateDigest(req.userId!, req.deviceFp!, id, lookbackMinutes);
      res.json({ success: true, data: digest });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async searchSymbols(req: AuthenticatedRequest, res: Response) {
    try {
      const rawQ = (req.query.q as string) || '';
      const q = rawQ.trim().toUpperCase();

      if (!q) {
        return res.json({ success: true, data: STOCK_DIRECTORY.slice(0, 15) });
      }

      // 1. Search in curated directory with relevance ranking
      const exact: typeof STOCK_DIRECTORY = [];
      const start: typeof STOCK_DIRECTORY = [];
      const contain: typeof STOCK_DIRECTORY = [];
      const nameMatch: typeof STOCK_DIRECTORY = [];

      for (const item of STOCK_DIRECTORY) {
        const sym = item.symbol.toUpperCase();
        const name = item.name.toUpperCase();
        if (sym === q) exact.push(item);
        else if (sym.startsWith(q)) start.push(item);
        else if (sym.includes(q)) contain.push(item);
        else if (name.includes(q)) nameMatch.push(item);
      }

      const matches = [...exact, ...start, ...contain, ...nameMatch];

      // 2. If fewer than 5 matches and query is at least 2 chars, probe Yahoo Search API
      if (matches.length < 5 && q.length >= 2) {
        try {
          const yahooMatches = await yahooClient.search(q);
          for (const ym of yahooMatches) {
            if (!matches.some((m) => m.symbol === ym.symbol)) {
              matches.push({
                symbol: ym.symbol,
                name: ym.name,
                exchange: ym.exchange,
                sector: ym.sector || 'Equity',
              });
            }
          }
        } catch (e) {}
      }

      res.json({ success: true, data: matches.slice(0, 15) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getNews(req: AuthenticatedRequest, res: Response) {
    try {
      const symbolsStr = req.query.symbols as string;
      const symbols = symbolsStr
        ? symbolsStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];

      const news = await newsService.fetchNewsForSymbols(symbols);
      res.json({ success: true, data: news });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getCatchup(req: AuthenticatedRequest, res: Response) {
    try {
      const symbolsStr = req.query.symbols as string;
      const sinceTickIdStr = (req.query.since_tick_id || req.query.sinceTickId) as string;
      const symbols = symbolsStr
        ? symbolsStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      const sinceTickId = sinceTickIdStr ? parseInt(sinceTickIdStr, 10) : 0;

      if (symbols.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const ticks = await tickRepository.getCatchupTicks(symbols, sinceTickId);
      res.json({ success: true, data: ticks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getChart(req: AuthenticatedRequest, res: Response) {
    try {
      const symbol = ((req.query.symbol as string) || 'GROWW').trim().toUpperCase();
      const timeframe = (((req.query.timeframe as string) || '15m')) as '1m' | '5m' | '15m' | '1D';
      const candles = await tickRepository.getChartCandles(symbol, timeframe);
      res.json({ success: true, data: candles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTrajectory(req: AuthenticatedRequest, res: Response) {
    try {
      const symbol = ((req.query.symbol as string) || 'GROWW').trim().toUpperCase();
      const trajectory = await tickRepository.getTrajectoryData(symbol);
      res.json({ success: true, data: trajectory });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSignals(req: AuthenticatedRequest, res: Response) {
    try {
      const symbolsStr = req.query.symbols as string;
      const symbols = symbolsStr
        ? symbolsStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      const since = req.query.since
        ? new Date(req.query.since as string)
        : new Date(Date.now() - 30 * 60 * 1000);

      const rows = await query<any>(
        `SELECT id, symbol, signal_type as "signalType", severity, description, metadata, mode, triggered_at as "triggeredAt"
         FROM signals
         WHERE symbol = ANY($1) AND triggered_at >= $2
         ORDER BY triggered_at DESC`,
        [symbols, since]
      );
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async runReplay(req: AuthenticatedRequest, res: Response) {
    try {
      const { symbols, forwardWindowMinutes, targetReturnThreshold } = req.body;
      const targetSymbols =
        Array.isArray(symbols) && symbols.length > 0
          ? symbols
          : ['GROWW', 'RELIANCE', 'TCS', 'INFY'];
      const reports = await replayBacktester.runBacktest({
        symbols: targetSymbols,
        forwardWindowMinutes,
        targetReturnThreshold,
      });
      res.json({ success: true, data: reports });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getDetectors(req: AuthenticatedRequest, res: Response) {
    res.json({ success: true, data: signalEngine.getDetectorConfigs() });
  }

  async updateDetector(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { mode, enabled, minSeverity } = req.body;
      const success = signalEngine.updateDetectorConfig(id, { mode, enabled, minSeverity });
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const marketHandler = new MarketHandler();

