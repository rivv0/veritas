export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  role: 'trader' | 'admin';
  avatarUrl?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: UserPublicProfile;
  accessToken: string;
}

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
  thesis?: string;
  thesisPrice?: number;
  trajectory?: TrajectoryData;
}

export interface WsTick {
  type: 'tick';
  tickId?: number;
  symbol: string;
  ltp: number;
  volume: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  close: number;
  change?: number;
  changePercent?: number;
  timestamp: string;
}

export interface WsSignal {
  id?: string;
  type: 'signal';
  symbol: string;
  signalType: string;
  severity: number;
  description: string;
  metadata?: Record<string, any>;
  mode?: 'live' | 'shadow';
  timestamp: string;
}

export interface WsMarketState {
  type: 'market_state';
  sessionState: 'REGULAR' | 'CLOSED' | 'PRE_MARKET_SOON';
  isOpen: boolean;
  nextOpen: string;
  minutesToOpen: number;
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
  triggeredAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TrajectoryData {
  p30d: number;
  p90d: number;
  p1y: number;
  spark30d: number[];
  spark90d: number[];
  spark1y: number[];
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BreadthStats {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  advDecRatio: number;
  avgChangePercent: number;
  regime: 'BULLISH DOMINANCE' | 'BEARISH SKEW' | 'EQUILIBRIUM';
  topGainer?: { symbol: string; changePercent: number };
  topLoser?: { symbol: string; changePercent: number };
  totalVolume: number;
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


