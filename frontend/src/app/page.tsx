'use client';

import { useState, useEffect } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useDigest } from '@/hooks/useDigest';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchSnapshot } from '@/lib/api';
import { WatchlistTable } from '@/components/WatchlistTable';
import { SinceYouLeft } from '@/components/SinceYouLeft';
import { CreateWatchlistModal } from '@/components/CreateWatchlistModal';
import { WatchlistNewsFeed } from '@/components/WatchlistNewsFeed';
import { SignalToast } from '@/components/SignalToast';
import { StockChartModal } from '@/components/StockChartModal';
import type { MarketSnapshot } from '@/lib/types';
import { TrendingUp, RefreshCw, Layers, Plus, Zap } from 'lucide-react';

export default function VeritasDashboard() {
  const {
    watchlists,
    activeWatchlist,
    setActiveWatchlist,
    loading: loadingWatchlists,
    create,
    rename,
    removeWatchlist,
    reorderSymbols,
    addSymbol,
    removeSymbol,
  } = useWatchlist();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [simulateStale, setSimulateStale] = useState(false);
  const [inspectSymbol, setInspectSymbol] = useState<string | null>(null);

  const activeWatchlistId = activeWatchlist?.id || null;
  const activeSymbols = activeWatchlist?.symbols || [];

  const {
    digest,
    loading: loadingDigest,
    refresh: refreshDigest,
    lookbackMinutes,
    setLookback,
  } = useDigest(activeWatchlistId);
  const { ticks, signals, connected, stale } = useWebSocket(activeSymbols);

  const isEffectiveStale = stale || simulateStale;

  useEffect(() => {
    if (activeSymbols.length === 0) {
      setSnapshots([]);
      return;
    }
    setLoadingSnapshots(true);
    fetchSnapshot(activeSymbols)
      .then((res) => {
        if (res.success) setSnapshots(res.data);
      })
      .catch((err) => console.error('Snapshot fetch error:', err))
      .finally(() => setLoadingSnapshots(false));
  }, [activeSymbols.join(',')]);

  const handleCreateWatchlist = async (name: string, initialSymbols?: string[]) => {
    const res = await create(name);
    if (res.success && res.data && initialSymbols && initialSymbols.length > 0) {
      for (const sym of initialSymbols) {
        await addSymbol(res.data.id, sym);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-12 selection:bg-white selection:text-black font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-black/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Veritas Bespoke Geometric Icon Mark */}
            <div className="flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                {/* Left faceted wing */}
                <path
                  d="M4 5H10.5L16 18.5L21.5 5H28L18 27H14L4 5Z"
                  fill="white"
                />
                {/* Right ambient prism facet */}
                <path
                  d="M16 18.5L21.5 5H25L17.2 22.8L16 18.5Z"
                  fill="#a1a1aa"
                  opacity="0.7"
                />
                {/* Micro precision core notch */}
                <path
                  d="M14.5 5H17.5L16 8.5L14.5 5Z"
                  fill="#000000"
                />
              </svg>
            </div>
            <h1 className="text-base font-mono font-bold tracking-[0.22em] text-white select-none">
              VERITAS
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time Status Badge */}
            <div className={`flex items-center gap-2 px-2.5 py-1 bg-zinc-950 border text-[11px] font-mono rounded-none ${
              isEffectiveStale ? 'border-amber-700/80 text-amber-400' : 'border-zinc-800 text-zinc-200'
            }`}>
              <span className={`w-1.5 h-1.5 ${isEffectiveStale ? 'bg-amber-400 animate-ping' : connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="font-bold">
                {isEffectiveStale ? 'FEED STALLED' : connected ? 'FEED ONLINE' : 'DISCONNECTED'}
              </span>
              <span className="text-zinc-400 text-[10px]">
                {isEffectiveStale ? '35s lag' : '12ms'}
              </span>
            </div>

            {/* Test Stale / Delayed Data Simulation Toggle */}
            <button
              onClick={() => setSimulateStale(!simulateStale)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-none border transition-colors ${
                simulateStale
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-900'
              }`}
              title="Test system behavior when market data is stale or delayed"
            >
              {simulateStale ? '● Simulating Delay' : 'Simulate Delay'}
            </button>

            <button
              onClick={() => refreshDigest()}
              className="p-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors rounded-none"
              title="Refresh Digest"
            >
              <RefreshCw size={14} className={loadingDigest ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Stale / Delayed Data Notification Banner */}
      {isEffectiveStale && (
        <div className="bg-amber-950/40 border-b border-amber-800/80 text-amber-200 text-xs font-mono py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.2 bg-amber-900 text-amber-100 font-bold text-[9px] uppercase">
                Data Latency Protocol
              </span>
              <span>
                Market feed delay detected (&gt;15s). Displaying last verified prices from TimescaleDB hypertable.
                Outlier signals quarantined to prevent conflicting execution.
              </span>
            </div>
            <button
              onClick={() => setSimulateStale(false)}
              className="underline text-[11px] text-amber-300 hover:text-white shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* Watchlist Tabs Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
            <Layers size={15} className="text-zinc-500 mr-1 hidden sm:block shrink-0" />
            {watchlists.map((wl) => {
              const isActive = activeWatchlist?.id === wl.id;
              return (
                <button
                  key={wl.id}
                  onClick={() => setActiveWatchlist(wl)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium transition-all whitespace-nowrap rounded-none border ${
                    isActive
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-zinc-800'
                  }`}
                >
                  {wl.name}
                </button>
              );
            })}

            {/* "+ New Watchlist" Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-700 transition-all whitespace-nowrap rounded-none"
            >
              <Plus size={13} />
              <span>New List</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono shrink-0">
            <span className="w-1.5 h-1.5 bg-white" />
            <span>L1/L2/L3 • Overbought/Oversold • X-EMA Telemetry</span>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Main Left Column: Realtime Watchlist Table & Shortlist News */}
          <div className="lg:col-span-2 space-y-5">
            {activeWatchlist ? (
              <>
                <WatchlistTable
                  watchlist={activeWatchlist}
                  snapshots={snapshots}
                  ticks={ticks}
                  signals={signals}
                  connected={connected}
                  stale={isEffectiveStale}
                  onAddSymbol={(symbol) => addSymbol(activeWatchlist.id, symbol)}
                  onRemoveSymbol={(symbol) => removeSymbol(activeWatchlist.id, symbol)}
                  onReorderSymbols={(newSymbols) => reorderSymbols(activeWatchlist.id, newSymbols)}
                  onRenameWatchlist={(newName) => rename(activeWatchlist.id, newName)}
                  onDeleteWatchlist={() => removeWatchlist(activeWatchlist.id)}
                  onInspectSymbol={(sym) => setInspectSymbol(sym)}
                />
                
                {/* Live News Section for Shortlisted Stocks */}
                <WatchlistNewsFeed symbols={activeSymbols} />
              </>
            ) : (
              <div className="p-12 text-center text-zinc-500 bg-[#09090b] border border-zinc-800 rounded-none font-mono text-xs">
                Loading watchlists...
              </div>
            )}
          </div>

          {/* Right Column: "Since You Left" Digest Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#09090b] border border-zinc-800 rounded-none p-4 shadow-xl">
              <SinceYouLeft
                digest={digest}
                loading={loadingDigest}
                activeLookback={lookbackMinutes}
                onSelectLookback={setLookback}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Real-time Alerts */}
      <CreateWatchlistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWatchlist}
      />

      <SignalToast signals={signals} />

      {/* VERITAS Chart & Dead Cat Bounce Inspection Modal */}
      <StockChartModal
        isOpen={Boolean(inspectSymbol)}
        onClose={() => setInspectSymbol(null)}
        symbol={inspectSymbol}
        snapshot={snapshots.find((s) => s.symbol === inspectSymbol)}
        tick={inspectSymbol ? ticks[inspectSymbol] : undefined}
        signals={signals.filter((s) => s.symbol === inspectSymbol)}
      />
    </div>
  );
}
