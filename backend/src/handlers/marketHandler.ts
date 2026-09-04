import { Response } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { tickRepository } from '../repositories/tickRepository';
import { digestService } from '../services/digestService';
import { yahooClient } from '../marketdata/yahooClient';
import { marketSimulator } from '../marketdata/simulator';
import { MarketSnapshot } from '../domain/types';
import { newsService } from '../services/newsService';
import { calculateMarketStructure } from '../signal/marketStructure';

const STOCK_DIRECTORY = [
  // Nifty 50 / Major Indian Stocks
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

            const sparkline = liveData.sparkline || existing?.sparkline || [liveData.close || liveData.ltp, liveData.ltp];
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
            const sparkline = existing.sparkline || [existing.close, existing.ltp];
            const structure = calculateMarketStructure(symbol, existing.ltp, existing.changePercent, sparkline, existing.high, existing.low);
            return {
              ...existing,
              sparkline,
              structure,
            };
          }

          // Fallback if brand new symbol not yet in repo or Yahoo
          const basePrice = 1000;
          const fallbackSparkline = [basePrice, basePrice];
          const structure = calculateMarketStructure(symbol, basePrice, 0, fallbackSparkline, basePrice, basePrice);
          return {
            symbol,
            ltp: basePrice,
            change: 0,
            changePercent: 0,
            volume: 50000,
            avgVolume20d: 45000,
            high: basePrice,
            low: basePrice,
            open: basePrice,
            close: basePrice,
            bid: basePrice * 0.999,
            ask: basePrice * 1.001,
            atr20: basePrice * 0.015,
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
      const digest = await digestService.generateDigest(req.userId!, req.deviceFp!, id);
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
}

export const marketHandler = new MarketHandler();
