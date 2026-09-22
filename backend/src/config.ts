import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  postgres: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'watchlist_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgrespassword',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  market: {
    tickIntervalMs: 2000,
    symbols: [
      'GROWW', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
      'ITC', 'TATAMOTORS', 'LT', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA', 'TITAN', 'AXISBANK',
      'WIPRO', 'HCLTECH', 'ZOMATO', 'PAYTM', 'JIOFIN',
      'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META'
    ],
    sectorEtfMap: {
      'GROWW': 'NIFTYFIN',
      'TCS': 'NIFTYIT',
      'INFY': 'NIFTYIT',
      'WIPRO': 'NIFTYIT',
      'HCLTECH': 'NIFTYIT',
      'HDFCBANK': 'BANKNIFTY',
      'ICICIBANK': 'BANKNIFTY',
      'SBIN': 'BANKNIFTY',
      'AXISBANK': 'BANKNIFTY',
      'RELIANCE': 'NIFTY50',
      'NVDA': 'QQQ',
      'AAPL': 'QQQ',
      'MSFT': 'QQQ',
      'GOOGL': 'QQQ',
      'AMZN': 'QQQ',
      'TSLA': 'QQQ',
      'META': 'QQQ',
    } as Record<string, string>,
  },
  auth: {
    jwtSecret: (() => {
      if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
      }
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[AUTH WARNING] JWT_SECRET environment variable is not defined in production. Using fallback secret. For maximum security, define JWT_SECRET in your Render dashboard Environment tab.'
        );
        return 'veritas-production-default-jwt-secret-9843729182374-fallback';
      }
      return 'veritas-development-jwt-secret-do-not-use-in-production-12345';
    })(),
    accessTokenTtlSec: 15 * 60, // 15 minutes
    refreshTokenTtlSec: 7 * 24 * 60 * 60, // 7 days
    cookieName: 'veritas_refresh_token',
    corsOrigins: [
      'https://veritas-frontend.onrender.com',
      'https://veritas-frontend-6epf.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ],
  },
};
