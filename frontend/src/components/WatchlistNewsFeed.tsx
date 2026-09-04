'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { NewsItem } from '@/lib/types';
import { fetchNews } from '@/lib/api';

interface Props {
  symbols: string[];
}

export function WatchlistNewsFeed({ symbols }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadNews = useCallback(async (showLoading = false) => {
    if (!symbols || symbols.length === 0) {
      setNews([]);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const res = await fetchNews(symbols);
      if (res && res.success && Array.isArray(res.data)) {
        setNews(res.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load watchlist news:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [symbols]);

  // Load news when symbols list changes
  useEffect(() => {
    loadNews(true);
  }, [loadNews]);

  // Auto-refresh news every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNews(false);
    }, 45000);
    return () => clearInterval(interval);
  }, [loadNews]);

  return (
    <div className="border border-zinc-800 bg-[#09090b] rounded-none shadow-2xl overflow-hidden font-sans">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 bg-black">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white text-black flex items-center justify-center rounded-none font-mono font-bold text-xs">
            <Radio size={13} className="text-black animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-xs uppercase font-mono">
                Shortlist News Wire
              </h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                <span className="w-1 h-1 bg-emerald-400" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Live one-liners exclusively for your active shortlisted assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lastRefreshed && (
            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
              SYNC {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadNews(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-mono font-medium bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh news wire"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-white' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>
      </div>

      {/* News List */}
      <div className="divide-y divide-zinc-900">
        {loading && news.length === 0 ? (
          <div className="p-6 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-14 h-5 bg-zinc-900 rounded-none" />
                <div className="flex-1 h-4 bg-zinc-900 rounded-none" />
                <div className="w-20 h-3 bg-zinc-900 rounded-none" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono">
            <Newspaper className="w-6 h-6 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-zinc-400">
              No breaking headlines found for current shortlisted symbols.
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Active company headlines will populate automatically when available.
            </p>
          </div>
        ) : (
          news.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between px-4 py-2.5 hover:bg-zinc-950 transition-colors gap-3"
            >
              {/* Symbol & One-Liner Title */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex items-center gap-1 shrink-0 font-mono">
                  <span className="px-1.5 py-0.5 rounded-none bg-zinc-900 text-white border border-zinc-700 text-[10px] font-bold">
                    {item.symbol}
                  </span>
                  {item.tag && (
                    <span className="px-1 py-0.2 rounded-none text-[8px] font-bold uppercase tracking-wider bg-black text-zinc-400 border border-zinc-800">
                      {item.tag}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 group-hover:text-white transition-colors truncate font-medium">
                  {item.title}
                </p>
              </div>

              {/* Publisher, Time & External Icon */}
              <div className="flex items-center gap-2.5 shrink-0 text-[10px] text-zinc-400 font-mono">
                <span className="hidden md:inline-block max-w-[120px] truncate text-zinc-400">
                  {item.publisher}
                </span>
                <span className="text-zinc-400 whitespace-nowrap">
                  {item.timeAgo}
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </a>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-black border-t border-zinc-800 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
        <span>Monitored for active shortlisted assets</span>
        <span>{news.length} headlines live</span>
      </div>
    </div>
  );
}
