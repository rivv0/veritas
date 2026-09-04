import { watchlistRepository } from '../repositories/watchlistRepository';
import { Watchlist } from '../domain/types';

export class WatchlistService {
  async getUserWatchlists(userId: string): Promise<Watchlist[]> {
    return watchlistRepository.findByUserId(userId);
  }

  async createWatchlist(userId: string, name: string): Promise<Watchlist> {
    return watchlistRepository.create(userId, name);
  }

  async addSymbolToWatchlist(watchlistId: string, symbol: string): Promise<void> {
    const cleanSymbol = symbol.trim().toUpperCase();
    await watchlistRepository.addSymbol(watchlistId, cleanSymbol);
  }

  async removeSymbolFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
    await watchlistRepository.removeSymbol(watchlistId, symbol);
  }

  async reorderSymbols(watchlistId: string, symbols: string[]): Promise<void> {
    const cleanSymbols = symbols.map((s) => s.trim().toUpperCase());
    await watchlistRepository.reorderSymbols(watchlistId, cleanSymbols);
  }

  async renameWatchlist(watchlistId: string, name: string): Promise<void> {
    await watchlistRepository.updateName(watchlistId, name.trim());
  }

  async deleteWatchlist(watchlistId: string): Promise<void> {
    await watchlistRepository.delete(watchlistId);
  }

  async getAllTrackedSymbols(): Promise<string[]> {
    return watchlistRepository.getAllWatchlistSymbols();
  }
}

export const watchlistService = new WatchlistService();
