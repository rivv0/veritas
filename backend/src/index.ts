import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { wsManager } from './websocket';
import {
  jwtAuthMiddleware,
  requireAuth,
  csrfProtection,
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  revokeAllSessionsHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from './handlers/authHandler';
import { authRateLimiter, passwordResetRateLimiter } from './middleware/rateLimiter';
import { watchlistHandler } from './handlers/watchlistHandler';
import { marketHandler } from './handlers/marketHandler';
import { alertHandler } from './handlers/alertHandler';
import { pushHandler } from './handlers/pushHandler';
import { sseHandler } from './handlers/sseHandler';
import { marketDataService } from './services/marketDataService';

export const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Strictly scope to explicitly configured frontend origins
      if (config.auth.corsOrigins.includes(origin) || config.auth.corsOrigins.includes('*')) {
        return callback(null, true);
      }
      // Allow localhost in non-production environments only
      if (config.env !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-Fp', 'X-User-Id', 'X-Veritas-Client'],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(jwtAuthMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication API Routes
app.post('/api/v1/auth/signup', authRateLimiter, signupHandler);
app.post('/api/v1/auth/login', authRateLimiter, loginHandler);
app.post('/api/v1/auth/forgot-password', passwordResetRateLimiter, forgotPasswordHandler);
app.post('/api/v1/auth/reset-password', passwordResetRateLimiter, resetPasswordHandler);
app.post('/api/v1/auth/refresh', csrfProtection, refreshHandler);
app.post('/api/v1/auth/logout', csrfProtection, logoutHandler);
app.get('/api/v1/auth/me', requireAuth, meHandler);
app.post('/api/v1/auth/revoke-all', requireAuth, revokeAllSessionsHandler);

// Watchlist API Routes
app.get('/api/v1/watchlists', (req, res) => watchlistHandler.getWatchlists(req, res));
app.post('/api/v1/watchlists', (req, res) => watchlistHandler.createWatchlist(req, res));
app.patch('/api/v1/watchlists/:id', (req, res) => watchlistHandler.renameWatchlist(req, res));
app.delete('/api/v1/watchlists/:id', (req, res) => watchlistHandler.deleteWatchlist(req, res));
app.put('/api/v1/watchlists/:id/reorder', (req, res) => watchlistHandler.reorderWatchlist(req, res));
app.post('/api/v1/watchlists/:id/symbols', (req, res) => watchlistHandler.addSymbol(req, res));
app.delete('/api/v1/watchlists/:id/symbols/:symbol', (req, res) => watchlistHandler.removeSymbol(req, res));
app.patch('/api/v1/watchlists/:id/symbols/:symbol/thesis', (req, res) => watchlistHandler.updateThesis(req, res));
app.get('/api/v1/watchlists/:id/theses', (req, res) => watchlistHandler.getTheses(req, res));

// Market & Telemetry API Routes
app.get('/api/v1/market/snapshot', (req, res) => marketHandler.getSnapshot(req, res));
app.get('/api/v1/market/catchup', (req, res) => marketHandler.getCatchup(req, res));
app.get('/api/v1/market/chart', (req, res) => marketHandler.getChart(req, res));
app.get('/api/v1/market/trajectory', (req, res) => marketHandler.getTrajectory(req, res));
app.get('/api/v1/market/stream-sse', (req, res) => sseHandler.handleSseConnection(req, res));
app.get('/api/v1/watchlists/:id/digest', (req, res) => marketHandler.getDigest(req, res));
app.get('/api/v1/search', (req, res) => marketHandler.searchSymbols(req, res));
app.get('/api/v1/news', (req, res) => marketHandler.getNews(req, res));

// Signals & Replay API Routes
app.get('/api/v1/signals', (req, res) => marketHandler.getSignals(req, res));
app.post('/api/v1/signals/replay', (req, res) => marketHandler.runReplay(req, res));
app.get('/api/v1/detectors', (req, res) => marketHandler.getDetectors(req, res));
app.patch('/api/v1/detectors/:id', (req, res) => marketHandler.updateDetector(req, res));

// User Price & Market Condition Alerts API Routes
app.get('/api/v1/alerts', (req, res) => alertHandler.getAlerts(req, res));
app.post('/api/v1/alerts', (req, res) => alertHandler.createAlert(req, res));
app.patch('/api/v1/alerts/:id/toggle', (req, res) => alertHandler.toggleAlert(req, res));
app.delete('/api/v1/alerts/:id', (req, res) => alertHandler.deleteAlert(req, res));

// Web Push (VAPID) API Routes
app.get('/api/v1/push/vapid-key', (req, res) => pushHandler.getVapidKey(req, res));
app.post('/api/v1/push/subscribe', (req, res) => pushHandler.subscribe(req, res));

export const server = http.createServer(app);


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