import { create } from 'zustand';
import type { WsTick, WsSignal, BreadthStats } from '@/lib/types';

interface WatchlistState {
  selectedSymbols: string[];
  activeSymbols: string[];
  ticks: Record<string, WsTick>;
  signals: WsSignal[];
  theses: Record<string, { thesis?: string; thesisPrice?: number }>;

  setSelectedSymbols: (symbols: string[]) => void;
  setActiveSymbols: (symbols: string[]) => void;
  setTick: (tick: WsTick) => void;
  setTicks: (ticks: Record<string, WsTick>) => void;
  addSignal: (signal: WsSignal) => void;
  setTheses: (theses: Record<string, { thesis?: string; thesisPrice?: number }>) => void;
  updateThesis: (symbol: string, thesis: string, thesisPrice?: number) => void;

  getBreadthStats: () => BreadthStats;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  selectedSymbols: [],
  activeSymbols: [],
  ticks: {},
  signals: [],
  theses: {},

  setSelectedSymbols: (symbols) => set({ selectedSymbols: symbols }),
  setActiveSymbols: (symbols) => set({ activeSymbols: symbols }),

  setTick: (tick) =>
    set((state) => ({
      ticks: {
        ...state.ticks,
        [tick.symbol]: tick,
      },
    })),

  setTicks: (newTicks) =>
    set((state) => ({
      ticks: {
        ...state.ticks,
        ...newTicks,
      },
    })),

  addSignal: (signal) =>
    set((state) => ({
      signals: [signal, ...state.signals.filter((s) => s.id !== signal.id)].slice(0, 60),
    })),

  setTheses: (theses) => set({ theses }),

  updateThesis: (symbol, thesis, thesisPrice) =>
    set((state) => ({
      theses: {
        ...state.theses,
        [symbol.toUpperCase()]: { thesis, thesisPrice },
      },
    })),

  /**
   * Pure Frontend Market Breadth:
   * Computed directly from the Zustand store's live ticks and active symbols.
   * Zero backend work or overhead.
   */
  getBreadthStats: () => {
    const { activeSymbols, ticks } = get();
    const symbols = activeSymbols.length > 0 ? activeSymbols : Object.keys(ticks);

    if (symbols.length === 0) {
      return {
        advancers: 0,
        decliners: 0,
        unchanged: 0,
        total: 0,
        advDecRatio: 1.0,
        avgChangePercent: 0,
        regime: 'EQUILIBRIUM',
        totalVolume: 0,
      };
    }

    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let totalChangePercent = 0;
    let totalVolume = 0;

    let topGainer: { symbol: string; changePercent: number } | undefined;
    let topLoser: { symbol: string; changePercent: number } | undefined;

    symbols.forEach((sym) => {
      const tick = ticks[sym];
      const changePercent = tick?.changePercent ?? 0;
      const volume = tick?.volume ?? 0;

      totalChangePercent += changePercent;
      totalVolume += volume;

      if (changePercent > 0.001) {
        advancers++;
      } else if (changePercent < -0.001) {
        decliners++;
      } else {
        unchanged++;
      }

      if (!topGainer || changePercent > topGainer.changePercent) {
        topGainer = { symbol: sym, changePercent };
      }
      if (!topLoser || changePercent < topLoser.changePercent) {
        topLoser = { symbol: sym, changePercent };
      }
    });

    const total = symbols.length;
    const advDecRatio = Number((advancers / Math.max(decliners, 1)).toFixed(2));
    const avgChangePercent = Number((totalChangePercent / total).toFixed(2));

    let regime: 'BULLISH DOMINANCE' | 'BEARISH SKEW' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
    if (advancers / total >= 0.65 || advDecRatio >= 2.0) {
      regime = 'BULLISH DOMINANCE';
    } else if (decliners / total >= 0.65 || advDecRatio <= 0.5) {
      regime = 'BEARISH SKEW';
    }

    return {
      advancers,
      decliners,
      unchanged,
      total,
      advDecRatio,
      avgChangePercent,
      regime,
      topGainer,
      topLoser,
      totalVolume,
    };
  },
}));
