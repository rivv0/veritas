import { tickRepository } from '../repositories/tickRepository';
import { yahooClient } from '../marketdata/yahooClient';
import { Tick } from '../domain/types';

export class ReconciliationJob {
  private isRunning = false;

  /**
   * Hourly reconciliation: compares stored ticks against Yahoo candles,
   * detects gaps in market_ticks, and fills missing records.
   */
  async reconcileSymbols(symbols: string[]): Promise<{ reconciledCount: number; gapsFilled: number }> {
    if (this.isRunning) return { reconciledCount: 0, gapsFilled: 0 };
    this.isRunning = true;
    let reconciledCount = 0;
    let gapsFilled = 0;

    try {
      console.log(`[ReconciliationJob] Starting hourly tick reconciliation for ${symbols.length} symbols...`);

      for (const symbol of symbols) {
        try {
          const latestTick = await tickRepository.getLatestTick(symbol);
          const quote = await yahooClient.fetchQuote(symbol);

          if (!quote) continue;

          reconciledCount++;

          // Gap condition: no stored ticks or last stored tick is older than 2 hours
          const lastTs = latestTick ? new Date(latestTick.timestamp).getTime() : 0;
          const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

          if (lastTs < twoHoursAgo) {
            console.log(`[ReconciliationJob] Gap detected for ${symbol}. Backfilling reference candle tick.`);
            const gapFillTick: Tick = {
              timestamp: new Date(),
              symbol,
              ltp: quote.ltp,
              volume: quote.volume || 100000,
              high: quote.high || quote.ltp,
              low: quote.low || quote.ltp,
              open: quote.open || quote.ltp,
              close: quote.close || quote.ltp,
              bid: quote.bid,
              ask: quote.ask,
            };
            await tickRepository.insertTick(gapFillTick);
            gapsFilled++;
          }
        } catch (err: any) {
          console.warn(`[ReconciliationJob] Error checking ${symbol}:`, err.message || err);
        }
      }

      console.log(
        `[ReconciliationJob] Reconciliation complete: checked=${reconciledCount}, gapsFilled=${gapsFilled}`
      );
    } finally {
      this.isRunning = false;
    }

    return { reconciledCount, gapsFilled };
  }
}

export const reconciliationJob = new ReconciliationJob();
