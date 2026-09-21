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
  // Honorary & Nifty 50 Core Indian Stocks
  { symbol: 'GROWW', name: 'Groww (Billionbrains Garage Ventures)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', sector: 'Energy' },
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
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ind.', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', exchange: 'NSE', sector: 'Materials' },
  { symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp of India', exchange: 'NSE', sector: 'Utilities' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd.', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', exchange: 'NSE', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and SEZ Ltd.', exchange: 'NSE', sector: 'Infrastructure' },
  { symbol: 'ZOMATO', name: 'Zomato Limited', exchange: 'NSE', sector: 'Consumer Tech' },
  { symbol: 'PAYTM', name: 'One97 Communications (Paytm)', exchange: 'NSE', sector: 'Fintech' },
  { symbol: 'JIOFIN', name: 'Jio Financial Services', exchange: 'NSE', sector: 'Financials' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd.', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'VBL', name: 'Varun Beverages Ltd.', exchange: 'NSE', sector: 'Consumer Goods' },
  { symbol: 'TRENT', name: 'Trent Ltd.', exchange: 'NSE', sector: 'Retail' },
  // Major US Equities
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Automobile' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Technology' },
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
        return res.json({ success: true, data: STOCK_DIRECTORY.slice(0, 10) });
      }

      // 1. Search in curated directory
      const matches = STOCK_DIRECTORY.filter(
        (item) => item.symbol.includes(q) || item.name.toUpperCase().includes(q)
      );

      // 2. If exact symbol not in curated list, attempt live quote probe on Yahoo
      if (matches.length === 0 && q.length >= 2 && q.length <= 15) {
        try {
          const liveQuote = await yahooClient.fetchQuote(q);
          if (liveQuote) {
            matches.push({
              symbol: q,
              name: `${q} Equity`,
              exchange: q.includes('.') ? q.split('.')[1] : 'NSE',
              sector: 'Equity',
            });
          }
        } catch (e) { }
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

