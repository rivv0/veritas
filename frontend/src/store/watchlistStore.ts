import { create } from 'zustand';

interface WatchlistState {
  selectedSymbols: string[];
  setSelectedSymbols: (symbols: string[]) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  selectedSymbols: [],
  setSelectedSymbols: (symbols) => set({ selectedSymbols: symbols }),
  addSymbol: (symbol) =>
    set((state) => ({
      selectedSymbols: Array.from(new Set([...state.selectedSymbols, symbol])),
    })),
  removeSymbol: (symbol) =>
    set((state) => ({
      selectedSymbols: state.selectedSymbols.filter((s) => s !== symbol),
    })),
}));
