'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchWatchlists,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  reorderWatchlistSymbols,
  addSymbol,
  removeSymbol,
} from '@/lib/api';
import type { Watchlist } from '@/lib/types';

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWatchlists();
      if (res.success) {
        setWatchlists(res.data);
        if (res.data.length > 0 && !activeWatchlist) {
          setActiveWatchlist(res.data[0]);
        } else if (activeWatchlist) {
          const updated = res.data.find((w: Watchlist) => w.id === activeWatchlist.id);
          if (updated) {
            setActiveWatchlist(updated);
          } else if (res.data.length > 0) {
            setActiveWatchlist(res.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWatchlist]);

  useEffect(() => {
    load();
  }, []);

  const create = async (name: string) => {
    const res = await createWatchlist(name);
    if (res.success) {
      await load();
      if (res.data) setActiveWatchlist(res.data);
    }
    return res;
  };

  const rename = async (watchlistId: string, name: string) => {
    const res = await renameWatchlist(watchlistId, name);
    if (res.success) {
      setWatchlists((prev) =>
        prev.map((w) => (w.id === watchlistId ? { ...w, name } : w))
      );
      if (activeWatchlist?.id === watchlistId) {
        setActiveWatchlist((prev) => (prev ? { ...prev, name } : prev));
      }
    }
    return res;
  };

  const remove = async (watchlistId: string) => {
    const res = await deleteWatchlist(watchlistId);
    if (res.success) {
      setWatchlists((prev) => prev.filter((w) => w.id !== watchlistId));
      if (activeWatchlist?.id === watchlistId) {
        const remaining = watchlists.filter((w) => w.id !== watchlistId);
        setActiveWatchlist(remaining.length > 0 ? remaining[0] : null);
      }
    }
    return res;
  };

  const reorder = async (watchlistId: string, newSymbols: string[]) => {
    // 1. Optimistic local update
    setWatchlists((prev) =>
      prev.map((w) => (w.id === watchlistId ? { ...w, symbols: newSymbols } : w))
    );
    if (activeWatchlist?.id === watchlistId) {
      setActiveWatchlist((prev) =>
        prev ? { ...prev, symbols: newSymbols } : prev
      );
    }

    // 2. Persist to backend
    try {
      await reorderWatchlistSymbols(watchlistId, newSymbols);
    } catch (err) {
      console.error('Failed to persist watchlist reorder:', err);
      await load(); // rollback on error
    }
  };

  const addSym = async (watchlistId: string, symbol: string) => {
    const res = await addSymbol(watchlistId, symbol);
    if (res.success) {
      await load();
    }
    return res;
  };

  const removeSym = async (watchlistId: string, symbol: string) => {
    const res = await removeSymbol(watchlistId, symbol);
    if (res.success) {
      await load();
    }
    return res;
  };

  return {
    watchlists,
    activeWatchlist,
    setActiveWatchlist,
    loading,
    create,
    rename,
    removeWatchlist: remove,
    reorderSymbols: reorder,
    addSymbol: addSym,
    removeSymbol: removeSym,
    refresh: load,
  };
}
