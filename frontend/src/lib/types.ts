export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  symbols: string[];
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Signal {
  id: string;
  symbol: string;
  signalType?: string;
  type?: string;
  severity: number;
  description: string;
  metadata?: Record<string, any>;
  triggeredAt: string;
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
  generatedAt: string;
  since: string;
  items: DigestItem[];
  meaningfulCount: number;
  topMovers: DigestItem[];
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
  lastUpdated: string;
  sparkline?: number[];
  structure?: MarketStructure;
}

export interface WsTick {
  type: 'tick';
  symbol: string;
  ltp: number;
  volume: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: string;
}

export interface WsSignal {
  type: 'signal';
  symbol: string;
  signalType: string;
  severity: number;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  timeAgo: string;
  tag?: 'Bullish' | 'Bearish' | 'Earnings' | 'Deal' | 'Analyst' | 'Regulatory' | 'General';
}

