import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export const NIFTY_SECTOR_MAP: Record<string, { index: string; name: string }> = {
  // Financials -> Nifty Bank
  HDFCBANK: { index: 'BANKNIFTY', name: 'Nifty Bank' },
  ICICIBANK: { index: 'BANKNIFTY', name: 'Nifty Bank' },
  SBIN: { index: 'BANKNIFTY', name: 'Nifty Bank' },
  AXISBANK: { index: 'BANKNIFTY', name: 'Nifty Bank' },
  KOTAKBANK: { index: 'BANKNIFTY', name: 'Nifty Bank' },
  BAJFINANCE: { index: 'NIFTYFIN', name: 'Nifty Financial Services' },
  JIOFIN: { index: 'NIFTYFIN', name: 'Nifty Financial Services' },

  // IT -> Nifty IT
  TCS: { index: 'NIFTYIT', name: 'Nifty IT' },
  INFY: { index: 'NIFTYIT', name: 'Nifty IT' },
  WIPRO: { index: 'NIFTYIT', name: 'Nifty IT' },
  HCLTECH: { index: 'NIFTYIT', name: 'Nifty IT' },
  WIT: { index: 'NIFTYIT', name: 'Nifty IT' },

  // Auto -> Nifty Auto
  TATAMOTORS: { index: 'NIFTYAUTO', name: 'Nifty Auto' },
  MARUTI: { index: 'NIFTYAUTO', name: 'Nifty Auto' },
  'M&M': { index: 'NIFTYAUTO', name: 'Nifty Auto' },

  // FMCG -> Nifty FMCG
  ITC: { index: 'NIFTYFMCG', name: 'Nifty FMCG' },
  NESTLEIND: { index: 'NIFTYFMCG', name: 'Nifty FMCG' },
  VBL: { index: 'NIFTYFMCG', name: 'Nifty FMCG' },

  // Energy -> Nifty Energy
  RELIANCE: { index: 'NIFTYENERGY', name: 'Nifty Energy' },
  ONGC: { index: 'NIFTYENERGY', name: 'Nifty Energy' },
  COALINDIA: { index: 'NIFTYENERGY', name: 'Nifty Energy' },
  NTPC: { index: 'NIFTYENERGY', name: 'Nifty Energy' },

  // Metals -> Nifty Metal
  TATASTEEL: { index: 'NIFTYMETAL', name: 'Nifty Metal' },
  JSWSTEEL: { index: 'NIFTYMETAL', name: 'Nifty Metal' },

  // Pharma -> Nifty Pharma
  SUNPHARMA: { index: 'NIFTYPHARMA', name: 'Nifty Pharma' },

  // Consumer -> Nifty Consumption
  TITAN: { index: 'NIFTYCONSUMPTION', name: 'Nifty Consumption' },
  ZOMATO: { index: 'NIFTYCONSUMPTION', name: 'Nifty Consumption' },
  TRENT: { index: 'NIFTYCONSUMPTION', name: 'Nifty Consumption' },

  // Default / Global
  BHARTIARTL: { index: 'NIFTY50', name: 'Nifty 50' },
  LT: { index: 'NIFTY50', name: 'Nifty 50' },
};

export function calculateSectorDivergence(
  stockTick: Tick,
  stockClose: number,
  sectorChangePercent: number
): Signal | null {
  if (stockClose <= 0) return null;

  const stockChangePercent = ((stockTick.ltp - stockClose) / stockClose) * 100;
  const divergence = Number((stockChangePercent - sectorChangePercent).toFixed(2));

  // Divergence >= 1.2% from sector benchmark
  if (Math.abs(divergence) >= 1.2) {
    const isOutperforming = divergence > 0;
    const severity = Math.min(100, Math.max(45, Math.round(Math.abs(divergence) * 35)));

    const sectorInfo = NIFTY_SECTOR_MAP[stockTick.symbol] || {
      index: 'NIFTY50',
      name: 'Nifty 50 Index',
    };

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: stockTick.symbol,
      signalType: SignalType.SECTOR_DIVERGENCE,
      severity,
      description: `${stockTick.symbol} is ${
        isOutperforming ? 'outperforming' : 'underperforming'
      } ${sectorInfo.name} (${sectorInfo.index}) by ${Math.abs(divergence)}%`,
      metadata: {
        stockChangePercent: Number(stockChangePercent.toFixed(2)),
        sectorChangePercent: Number(sectorChangePercent.toFixed(2)),
        divergence,
        sectorIndex: sectorInfo.index,
        sectorName: sectorInfo.name,
      },
      triggeredAt: stockTick.timestamp,
    };
  }

  return null;
}
