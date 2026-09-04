import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'watchlist_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgrespassword',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  market: {
    tickIntervalMs: 2000,
    symbols: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIT'],
    sectorEtfMap: {
      'TCS': 'NIFTYIT',
      'INFY': 'NIFTYIT',
      'WIT': 'NIFTYIT',
      'HDFCBANK': 'BANKNIFTY',
      'ICICIBANK': 'BANKNIFTY',
      'RELIANCE': 'NIFTY50',
    } as Record<string, string>,
  },
};
