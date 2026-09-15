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
};
