'use client';

import React from 'react';
import { useWatchlistStore } from '@/store/watchlistStore';
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function MarketBreadthBar() {
  const getBreadthStats = useWatchlistStore((s) => s.getBreadthStats);
  const stats = getBreadthStats();

  if (stats.total === 0) return null;

  const advPercent = stats.total > 0 ? Math.round((stats.advancers / stats.total) * 100) : 50;
  const decPercent = stats.total > 0 ? Math.round((stats.decliners / stats.total) * 100) : 50;

  return (
    <div className="bg-[#09090b] border border-zinc-800 px-4 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-inner">
      {/* Left: Regime & A/D Count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              stats.regime === 'BULLISH DOMINANCE'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : stats.regime === 'BEARISH SKEW'
                ? 'bg-red-400 shadow-[0_0_8px_#f87171]'
                : 'bg-zinc-400'
            }`}
          />
          <span className="text-[10px] font-bold text-white tracking-wider uppercase">
            BREADTH: {stats.regime}
          </span>
        </div>

        {/* Visual Breadth Meter Bar */}
        <div className="w-28 sm:w-36 h-2 bg-zinc-900 border border-zinc-800 flex overflow-hidden">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${advPercent}%` }}
            title={`Advancers: ${stats.advancers} (${advPercent}%)`}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${decPercent}%` }}
            title={`Decliners: ${stats.decliners} (${decPercent}%)`}
          />
        </div>

        {/* Advancers / Decliners / Unchanged */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            ▲ {stats.advancers}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-red-400 font-bold flex items-center gap-0.5">
            ▼ {stats.decliners}
          </span>
          <span className="text-zinc-500 text-[10px]">
            ({stats.unchanged} flat · {stats.advDecRatio}x A/D)
          </span>
        </div>
      </div>

      {/* Right: Avg Change & Top Movers */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-zinc-500 text-[10px] uppercase">Mean:</span>
          <span
            className={`font-bold ${
              stats.avgChangePercent > 0
                ? 'text-emerald-400'
                : stats.avgChangePercent < 0
                ? 'text-red-400'
                : 'text-zinc-400'
            }`}
          >
            {stats.avgChangePercent > 0 ? '+' : ''}
            {stats.avgChangePercent.toFixed(2)}%
          </span>
        </div>

        {/* Top Gainer */}
        {stats.topGainer && (
          <div className="hidden sm:flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 text-[10px]">
            <span className="text-zinc-400">LEADER:</span>
            <span className="text-emerald-300 font-bold">{stats.topGainer.symbol}</span>
            <span className="text-emerald-400">
              +{stats.topGainer.changePercent.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Top Loser */}
        {stats.topLoser && (
          <div className="hidden sm:flex items-center gap-1 bg-red-950/60 border border-red-800/80 px-1.5 py-0.5 text-[10px]">
            <span className="text-zinc-400">LAGGARD:</span>
            <span className="text-red-300 font-bold">{stats.topLoser.symbol}</span>
            <span className="text-red-400">
              {stats.topLoser.changePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
