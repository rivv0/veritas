import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config';
import { wsManager } from './websocket';
import { mockAuthMiddleware } from './handlers/authHandler';
import { watchlistHandler } from './handlers/watchlistHandler';
import { marketHandler } from './handlers/marketHandler';
import { marketDataService } from './services/marketDataService';

const app = express();
app.use(cors());
app.use(express.json());
app.use(mockAuthMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Watchlist API Routes
app.get('/api/v1/watchlists', (req, res) => watchlistHandler.getWatchlists(req, res));
app.post('/api/v1/watchlists', (req, res) => watchlistHandler.createWatchlist(req, res));
app.patch('/api/v1/watchlists/:id', (req, res) => watchlistHandler.renameWatchlist(req, res));
app.delete('/api/v1/watchlists/:id', (req, res) => watchlistHandler.deleteWatchlist(req, res));
app.put('/api/v1/watchlists/:id/reorder', (req, res) => watchlistHandler.reorderWatchlist(req, res));
app.post('/api/v1/watchlists/:id/symbols', (req, res) => watchlistHandler.addSymbol(req, res));
app.delete('/api/v1/watchlists/:id/symbols/:symbol', (req, res) => watchlistHandler.removeSymbol(req, res));

// Market & Digest API Routes
app.get('/api/v1/market/snapshot', (req, res) => marketHandler.getSnapshot(req, res));
app.get('/api/v1/watchlists/:id/digest', (req, res) => marketHandler.getDigest(req, res));
app.get('/api/v1/search', (req, res) => marketHandler.searchSymbols(req, res));
app.get('/api/v1/news', (req, res) => marketHandler.getNews(req, res));

const server = http.createServer(app);

import { initPostgresSchema } from './db/postgres';

// Initialize WebSocket server
wsManager.init(server);

/** Race an async task against a timeout so boot never hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | 'timeout'> {
  return Promise.race([
    promise.then((v) => v as T),
    new Promise<'timeout'>((_, reject) =>
      setTimeout(() => {
        console.warn(`[BOOT] ${label} timed out after ${ms}ms — continuing without it`);
        reject('timeout');
      }, ms)
    ),
  ]).catch((err) => {
    if (err === 'timeout') return 'timeout' as const;
    throw err;
  });
}

// Start HTTP & WebSocket server
server.listen(config.port, async () => {
  console.log(`[BOOT] Smart Watchlist Backend API listening on port ${config.port}`);
  console.log(`[BOOT] WebSocket server endpoint: ws://localhost:${config.port}/ws/v1/market`);

  // Initialize remote database schema if configured — but NEVER let it block the streamer
  const schemaResult = await withTimeout(initPostgresSchema(), 10_000, 'Postgres schema init').catch(
    (err) => {
      console.error('[BOOT] Postgres init failed:', err.message || err);
      return 'timeout' as const;
    }
  );

  if (schemaResult === 'timeout') {
    console.log('[BOOT] Proceeding in In-Memory mode (Postgres unreachable)');
  }

  // Start market tick streaming loop — guaranteed to run
  console.log('[BOOT] Kicking off market data streamer...');
  marketDataService.startTickStream();
  console.log('[BOOT] Market data streamer started');
});

const shutdown = () => {
  console.log('[BOOT] SIGTERM/SIGINT received — shutting down gracefully');
  marketDataService.stopTickStream();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);