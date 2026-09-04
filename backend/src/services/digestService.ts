import { watchlistRepository } from '../repositories/watchlistRepository';
import { sessionRepository } from '../repositories/sessionRepository';
import { tickRepository } from '../repositories/tickRepository';
import { signalService } from './signalService';
import { computeAttentionScore } from '../signal/attention';
import { calculateMarketStructure } from '../signal/marketStructure';
import { WatchlistDigest, DigestItem } from '../domain/types';

export class DigestService {
  async generateDigest(userId: string, deviceFp: string, watchlistId?: string): Promise<WatchlistDigest> {
    // 1. Determine realistic baseline time:
    // If user was seen very recently (< 20 mins ago), look back 45 mins so there are genuine deltas to review
    const session = await sessionRepository.getSession(userId, deviceFp);
    const now = Date.now();
    let since: Date;

    if (session && session.lastSeenAt) {
      const msSinceLastSeen = now - new Date(session.lastSeenAt).getTime();
      if (msSinceLastSeen < 20 * 60 * 1000) {
        since = new Date(now - 45 * 60 * 1000); // 45-min lookback baseline
      } else {
        since = new Date(session.lastSeenAt);
      }
    } else {
      since = new Date(now - 45 * 60 * 1000);
    }

    // 2. Fetch target watchlist
    const watchlists = await watchlistRepository.findByUserId(userId);
    const activeWatchlist = watchlistId
      ? watchlists.find((w) => w.id === watchlistId)
      : watchlists[0];

    if (!activeWatchlist || !activeWatchlist.symbols || activeWatchlist.symbols.length === 0) {
      return {
        watchlistId: watchlistId || 'none',
        watchlistName: activeWatchlist ? activeWatchlist.name : 'Empty Watchlist',
        generatedAt: new Date(),
        since,
        items: [],
        meaningfulCount: 0,
        topMovers: [],
      };
    }

    const symbols = activeWatchlist.symbols;

    // 3. Fetch signals from at least the last 2 hours so active anomalies are scored
    const signalSince = new Date(Math.min(since.getTime(), now - 2 * 60 * 60 * 1000));
    const signals = await signalService.getRecentSignals(symbols, signalSince);

    // 4. Compute delta for each symbol in the watchlist
    const items: DigestItem[] = [];

    for (const symbol of symbols) {
      const currentTick = await tickRepository.getLatestTick(symbol);
      const prevTick = await tickRepository.getTickAtOrBefore(symbol, since);

      if (!currentTick) continue;

      const baseClose = currentTick.close || currentTick.open || currentTick.ltp;
      const previousPrice = prevTick ? prevTick.ltp : baseClose;

      // Compute both interval delta and session delta
      const deltaFromSince = previousPrice > 0 ? ((currentTick.ltp - previousPrice) / previousPrice) * 100 : 0;
      const sessionDelta = baseClose > 0 ? ((currentTick.ltp - baseClose) / baseClose) * 100 : 0;

      // Use the larger absolute movement so trader sees what actually happened
      const percentChange = Number(
        (Math.abs(deltaFromSince) >= Math.abs(sessionDelta) ? deltaFromSince : sessionDelta).toFixed(2)
      );
      const absoluteChange = Number((currentTick.ltp - previousPrice).toFixed(2));

      // Compute intraday high/low spread
      const high = currentTick.high || currentTick.ltp;
      const low = currentTick.low || (baseClose * 0.985);
      const dayRangePercent = low > 0 ? Number((((high - low) / low) * 100).toFixed(2)) : 1.5;

      // Estimate volume ratio
      const volumeRatio = currentTick.volume
        ? Math.min(2.8, Math.max(0.7, Number((currentTick.volume / 1200000).toFixed(2))))
        : 1.1;

      const symbolSignals = signals.filter((s) => s.symbol === symbol);
      const attentionScore = computeAttentionScore(percentChange, volumeRatio, symbolSignals, dayRangePercent);

      // Criteria for "Meaningful": >=0.4% move OR active signals OR attention score >= 48
      const isMeaningful = Math.abs(percentChange) >= 0.4 || symbolSignals.length > 0 || attentionScore >= 48;

      let catalyst: string | undefined;
      if (symbolSignals.length > 0) {
        catalyst = symbolSignals[0].description;
      } else if (attentionScore >= 65) {
        catalyst = `Elevated volatility action (${percentChange >= 0 ? '+' : ''}${percentChange}% move • ${dayRangePercent}% day range)`;
      } else if (Math.abs(percentChange) >= 0.75) {
        catalyst = `Substantial intraday momentum move (${percentChange >= 0 ? '+' : ''}${percentChange}%)`;
      }

      const minutesAgo = Math.max(1, Math.round((now - since.getTime()) / (60 * 1000)));

      const structure = calculateMarketStructure(
        symbol,
        currentTick.ltp,
        percentChange,
        [previousPrice, currentTick.ltp],
        high,
        low
      );

      items.push({
        symbol,
        currentPrice: currentTick.ltp,
        previousPrice,
        absoluteChange,
        percentChange,
        signals: symbolSignals,
        attentionScore,
        catalyst,
        timeSinceLastCheck: `${minutesAgo}m ago`,
        isMeaningful,
        structure,
      });
    }

    // Sort items by attention score descending
    items.sort((a, b) => b.attentionScore - a.attentionScore);

    const topMovers = [...items].sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
    const meaningfulCount = items.filter((i) => i.isMeaningful).length;

    // Only update last_seen_at if previous marker was more than 15 mins ago
    if (!session || (now - new Date(session.lastSeenAt).getTime()) > 15 * 60 * 1000) {
      await sessionRepository.updateLastSeen(userId, deviceFp, activeWatchlist.id);
    }

    return {
      watchlistId: activeWatchlist.id,
      watchlistName: activeWatchlist.name,
      generatedAt: new Date(),
      since,
      items,
      meaningfulCount,
      topMovers,
    };
  }
}

export const digestService = new DigestService();
