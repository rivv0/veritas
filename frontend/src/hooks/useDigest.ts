'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchDigest } from '@/lib/api';
import type { WatchlistDigest } from '@/lib/types';

export function useDigest(watchlistId: string | null) {
  const [digest, setDigest] = useState<WatchlistDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookbackMinutes, setLookbackMinutes] = useState<number | undefined>(undefined);

  const load = useCallback(async (customLookback?: number) => {
    if (!watchlistId) return;
    setLoading(true);
    try {
      const activeLookback = customLookback !== undefined ? customLookback : lookbackMinutes;
      const res = await fetchDigest(watchlistId, activeLookback);
      if (res.success) {
        setDigest(res.data);
      }
    } catch (err) {
      console.error('Failed to load digest:', err);
    } finally {
      setLoading(false);
    }
  }, [watchlistId, lookbackMinutes]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const changeLookback = (minutes?: number) => {
    setLookbackMinutes(minutes);
    load(minutes);
  };

  return {
    digest,
    loading,
    refresh: () => load(),
    lookbackMinutes,
    setLookback: changeLookback,
  };
}
