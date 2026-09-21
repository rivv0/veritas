import { Tick, Signal, ReplayReport, SignalType } from '../domain/types';
import { tickRepository } from '../repositories/tickRepository';
import { signalEngine } from './engine';

export interface BacktestOptions {
  symbols: string[];
  forwardWindowMinutes?: number; // default 15m
  targetReturnThreshold?: number; // default +0.3% favorable move
}

export class ReplayBacktester {
  /**
   * High-speed offline replay of historical ticks through the signal engine.
   * Evaluates shadow & live detectors against forward returns.
   */
  async runBacktest(options: BacktestOptions): Promise<ReplayReport[]> {
    const forwardWindowMs = (options.forwardWindowMinutes || 15) * 60 * 1000;
    const targetThreshold = options.targetReturnThreshold || 0.3; // 0.3%

    console.log(`[ReplayBacktester] Starting replay for ${options.symbols.length} symbols...`);

    const detectorStats: Map<
      string,
      {
        total: number;
        winners: number;
        returns: number[];
      }
    > = new Map();

    for (const symbol of options.symbols) {
      // 1. Fetch ticks chronologically
      const ticks = await tickRepository.getHistoricalTicksForWarmup(symbol, 200);
      if (ticks.length < 5) continue;

      // Map ticks by timestamp for fast forward lookup
      const ticksChronological = [...ticks].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < ticksChronological.length; i++) {
        const tick = ticksChronological[i];
        const tickTime = new Date(tick.timestamp).getTime();

        // Process tick through engine (in shadow/replay mode to capture signals)
        const signals = await signalEngine.processTick(tick, 'shadow');

        for (const signal of signals) {
          const detectorId = signal.signalType;
          if (!detectorStats.has(detectorId)) {
            detectorStats.set(detectorId, { total: 0, winners: 0, returns: [] });
          }
          const stats = detectorStats.get(detectorId)!;
          stats.total++;

          // Look ahead to target forward horizon
          const futureTicks = ticksChronological.slice(i + 1).filter(
            (ft) => new Date(ft.timestamp).getTime() <= tickTime + forwardWindowMs
          );

          if (futureTicks.length > 0) {
            const futureLtp = futureTicks[futureTicks.length - 1].ltp;
            const ret = ((futureLtp - tick.ltp) / tick.ltp) * 100;
            stats.returns.push(ret);

            // Determine if win based on signal direction
            const isBearish =
              signal.signalType === SignalType.DEAD_CAT_BOUNCE ||
              (signal.metadata?.direction === 'BEARISH');

            const isWin = isBearish ? ret <= -targetThreshold : ret >= targetThreshold;
            if (isWin) {
              stats.winners++;
            }
          }
        }
      }
    }

    // Build reports
    const reports: ReplayReport[] = [];
    for (const [detectorId, stats] of detectorStats.entries()) {
      const hitRate = stats.total > 0 ? Number(((stats.winners / stats.total) * 100).toFixed(1)) : 0;
      const avgReturnPercent =
        stats.returns.length > 0
          ? Number((stats.returns.reduce((sum, r) => sum + r, 0) / stats.returns.length).toFixed(2))
          : 0;

      const grossWins = stats.returns.filter((r) => r > 0).reduce((sum, r) => sum + r, 0);
      const grossLosses = Math.abs(stats.returns.filter((r) => r < 0).reduce((sum, r) => sum + r, 0));
      const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 9.99 : 1.0;

      let recommendation: 'PROMOTE_TO_LIVE' | 'NEEDS_TUNING' | 'REJECT' = 'NEEDS_TUNING';
      if (stats.total >= 5 && hitRate >= 60.0 && avgReturnPercent > 0) {
        recommendation = 'PROMOTE_TO_LIVE';
      } else if (stats.total >= 5 && hitRate < 45.0) {
        recommendation = 'REJECT';
      }

      reports.push({
        detectorId,
        totalSignals: stats.total,
        winningSignals: stats.winners,
        hitRate,
        avgReturnPercent,
        profitFactor,
        recommendation,
        evaluatedAt: new Date(),
      });
    }

    console.log(`[ReplayBacktester] Replay complete. Evaluated ${reports.length} detectors.`);
    return reports;
  }
}

export const replayBacktester = new ReplayBacktester();
