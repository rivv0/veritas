import { Response } from 'express';
import { AuthenticatedRequest } from './authHandler';
import { watchlistService } from '../services/watchlistService';

export class WatchlistHandler {
  async getWatchlists(req: AuthenticatedRequest, res: Response) {
    try {
      const watchlists = await watchlistService.getUserWatchlists(req.userId!);
      res.json({ success: true, data: watchlists });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createWatchlist(req: AuthenticatedRequest, res: Response) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

      const watchlist = await watchlistService.createWatchlist(req.userId!, name);
      res.json({ success: true, data: watchlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async addSymbol(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { symbol } = req.body;
      if (!symbol) return res.status(400).json({ success: false, error: 'Symbol is required' });

      await watchlistService.addSymbolToWatchlist(id, symbol);
      res.json({ success: true, message: `Added ${symbol}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async removeSymbol(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, symbol } = req.params;
      await watchlistService.removeSymbolFromWatchlist(id, symbol);
      res.json({ success: true, message: `Removed ${symbol}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async reorderWatchlist(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { symbols } = req.body;
      if (!Array.isArray(symbols)) {
        return res.status(400).json({ success: false, error: 'Symbols array is required' });
      }

      await watchlistService.reorderSymbols(id, symbols);
      res.json({ success: true, message: 'Watchlist reordered successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async renameWatchlist(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

      await watchlistService.renameWatchlist(id, name);
      res.json({ success: true, message: 'Watchlist renamed successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteWatchlist(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await watchlistService.deleteWatchlist(id);
      res.json({ success: true, message: 'Watchlist deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const watchlistHandler = new WatchlistHandler();
