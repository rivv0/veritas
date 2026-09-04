export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  symbols?: string[];
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  symbol: string;
  sortOrder: number;
  addedAt: Date;
}

export interface Tick {
  timestamp: Date;
  symbol: string;
  ltp: number;
  volume: number;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface MarketStructure {
  tier: 'L1' | 'L2' | 'L3';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsiState: 'OVERBOUGHT' | 'OVERSOLD' | 'EQUILIBRIUM';
  rsi: number;
  emaState: 'ABOVE_EMA' | 'BELOW_EMA' | 'EMA_CROSS';
  ema20: number;
  eventSuffix?: string;
  isDeadCatBounce?: boolean;
  deadCatBounceDetails?: {
    drawdownPercent: number;
    bouncePercent: number;
    trapRiskPercent: number;
    warning: string;
  };
}

export interface MarketSnapshot {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume20d: number;
  high: number;
  low: number;
  open: number;
  close: number;
  bid: number;
  ask: number;
  atr20: number;
  dataFreshness: 'live' | 'delayed' | 'stale';
  lastUpdated: Date;
  sparkline?: number[];
  structure?: MarketStructure;
}

export enum SignalType {
  VOLATILITY_SPIKE = 'VOLATILITY_SPIKE',
  SECTOR_DIVERGENCE = 'SECTOR_DIVERGENCE',
  VOLUME_ANOMALY = 'VOLUME_ANOMALY',
  PRICE_BREAKOUT = 'PRICE_BREAKOUT',
  OPTIONS_FLOW = 'OPTIONS_FLOW',
  NEWS_VELOCITY = 'NEWS_VELOCITY',
  MOMENTUM_REVERSAL = 'MOMENTUM_REVERSAL',
  DEAD_CAT_BOUNCE = 'DEAD_CAT_BOUNCE',
}

export interface Signal {
  id: string;
  symbol: string;
  signalType: SignalType;
  severity: number; // 0 to 100
  description: string;
  metadata?: Record<string, any>;
  triggeredAt: Date;
}

export interface DigestItem {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  absoluteChange: number;
  percentChange: number;
  signals: Signal[];
  attentionScore: number;
  catalyst?: string;
  timeSinceLastCheck: string;
  isMeaningful: boolean;
  structure?: MarketStructure;
}

export interface WatchlistDigest {
  watchlistId: string;
  watchlistName: string;
  generatedAt: Date;
  since: Date;
  items: DigestItem[];
  meaningfulCount: number;
  topMovers: DigestItem[];
}

export interface UserSession {
  userId: string;
  deviceFp: string;
  lastSeenAt: Date;
  lastWatchlistId?: string;
}
