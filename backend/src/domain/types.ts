export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  tokenVersion: number;
  role: 'trader' | 'admin';
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  role: 'trader' | 'admin';
  avatarUrl?: string | null;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  familyId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBy?: string | null;
  createdAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
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
  thesis?: string;
  thesisPrice?: number;
}

export interface Tick {
  tickId?: number;
  timestamp: Date;
  symbol: string;
  ltp: number;
  volume: number;
  avgVolume20d?: number;
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
  thesis?: string;
  thesisPrice?: number;
  trajectory?: TrajectoryData;
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
  GAP_DETECTION = 'GAP_DETECTION',
}

export interface Signal {
  id: string;
  symbol: string;
  signalType: SignalType;
  severity: number; // 0 to 100
  description: string;
  metadata?: Record<string, any>;
  mode?: 'live' | 'shadow';
  triggeredAt: Date;
}

export type AlertCondition = 'ABOVE' | 'BELOW' | 'PCT_CHANGE_UP' | 'PCT_CHANGE_DOWN';

export interface MarketFilter {
  index: 'SPX' | 'NIFTY' | 'IT' | 'BANK';
  condition: 'GREEN' | 'RED' | 'ABOVE' | 'BELOW';
  value?: number;
}

export interface Alert {
  id: string;
  userId: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  marketFilter?: MarketFilter;
  triggeredAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DetectorConfig {
  id: string;
  name: string;
  mode: 'live' | 'shadow';
  enabled: boolean;
  minSeverity: number;
}

export interface ReplayReport {
  detectorId: string;
  totalSignals: number;
  winningSignals: number;
  hitRate: number; // percentage
  avgReturnPercent: number;
  profitFactor: number;
  recommendation: 'PROMOTE_TO_LIVE' | 'NEEDS_TUNING' | 'REJECT';
  evaluatedAt: Date;
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrajectoryData {
  p30d: number; // % change 30d
  p90d: number; // % change 90d
  p1y: number;  // % change 1y
  spark30d: number[];
  spark90d: number[];
  spark1y: number[];
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
