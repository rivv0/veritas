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

// Initialize WebSocket server
wsManager.init(server);

// Start HTTP & WebSocket server
server.listen(config.port, () => {
  console.log(`Smart Watchlist Backend API listening on port ${config.port}`);
  console.log(`WebSocket server endpoint: ws://localhost:${config.port}/ws/v1/market`);

  // Start market tick streaming loop
  marketDataService.startTickStream();
});

const shutdown = () => {
  marketDataService.stopTickStream();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

