'use client';

import { useState } from 'react';
import {
  Trash2,
  Plus,
  BarChart2,
  Activity,
  GripVertical,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { RealtimePrice } from './RealtimePrice';
import { SignalBadge } from './SignalBadge';
import { StaleIndicator } from './StaleIndicator';
import { AddSymbolModal } from './AddSymbolModal';
import { Sparkline } from './Sparkline';
import type { Watchlist, WsTick, WsSignal, MarketSnapshot } from '@/lib/types';

interface Props {
  watchlist: Watchlist;
  snapshots: MarketSnapshot[];
  ticks: Record<string, WsTick>;
  signals: WsSignal[];
  connected: boolean;
  stale: boolean;
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onReorderSymbols?: (newSymbols: string[]) => void;
  onRenameWatchlist?: (name: string) => void;
  onDeleteWatchlist?: () => void;
  onInspectSymbol?: (symbol: string) => void;
}

export function WatchlistTable({
  watchlist,
  snapshots,
  ticks,
  signals,
  connected,
  stale,
  onAddSymbol,
  onRemoveSymbol,
  onReorderSymbols,
  onRenameWatchlist,
  onDeleteWatchlist,
  onInspectSymbol,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(watchlist.name);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'L1' | 'L2' | 'L3'>('ALL');
  const [structureFilter, setStructureFilter] = useState<
    'ALL' | 'OVERBOUGHT' | 'OVERSOLD' | 'ABOVE_EMA' | 'BELOW_EMA' | 'BULLISH' | 'BEARISH' | 'DEAD_CAT_BOUNCE'
  >('ALL');
  const [sortBy, setSortBy] = useState<'custom' | 'attention' | 'changeDesc' | 'changeAsc' | 'volume' | 'symbol'>('custom');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const rawSymbols = watchlist.symbols || [];

  const getSnapshotForSymbol = (symbol: string): MarketSnapshot | undefined => {
    return snapshots.find((s) => s.symbol === symbol);
  };

  const getSignalsForSymbol = (symbol: string): WsSignal[] => {
    const now = Date.now();
    return signals
      .filter((s) => s.symbol === symbol && (now - new Date(s.timestamp).getTime()) < 2 * 60 * 1000)
      .slice(0, 1);
  };

  // Filter and Sort symbols
  const filteredAndSortedSymbols = [...rawSymbols].filter((sym) => {
    const snap = getSnapshotForSymbol(sym);
    const struct = snap?.structure;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSym = sym.toLowerCase().includes(q);
      const matchSuffix = struct?.eventSuffix?.toLowerCase().includes(q);
      if (!matchSym && !matchSuffix) return false;
    }

    // L1 / L2 / L3 Tier filter
    if (tierFilter !== 'ALL') {
      if (struct?.tier !== tierFilter) return false;
    }

    // Market Structure Micro-Filter
    if (structureFilter !== 'ALL') {
      if (structureFilter === 'OVERBOUGHT' && struct?.rsiState !== 'OVERBOUGHT') return false;
      if (structureFilter === 'OVERSOLD' && struct?.rsiState !== 'OVERSOLD') return false;
      if (structureFilter === 'ABOVE_EMA' && struct?.emaState !== 'ABOVE_EMA') return false;
      if (structureFilter === 'BELOW_EMA' && struct?.emaState !== 'BELOW_EMA') return false;
      if (structureFilter === 'BULLISH' && struct?.sentiment !== 'BULLISH') return false;
      if (structureFilter === 'BEARISH' && struct?.sentiment !== 'BEARISH') return false;
      if (structureFilter === 'DEAD_CAT_BOUNCE' && !struct?.isDeadCatBounce) return false;
    }

    return true;
  }).sort((a, b) => {
    const snapA = getSnapshotForSymbol(a);
    const snapB = getSnapshotForSymbol(b);
    const tickA = ticks[a];
    const tickB = ticks[b];

    const changeA = tickA?.ltp && snapA?.close ? ((tickA.ltp - snapA.close) / snapA.close) * 100 : snapA?.changePercent || 0;
    const changeB = tickB?.ltp && snapB?.close ? ((tickB.ltp - snapB.close) / snapB.close) * 100 : snapB?.changePercent || 0;
    const volA = tickA?.volume ?? snapA?.volume ?? 0;
    const volB = tickB?.volume ?? snapB?.volume ?? 0;

    if (sortBy === 'changeDesc') return changeB - changeA;
    if (sortBy === 'changeAsc') return changeA - changeB;
    if (sortBy === 'volume') return volB - volA;
    if (sortBy === 'symbol') return a.localeCompare(b);
    if (sortBy === 'attention') {
      const scoreA = Math.abs(changeA) * 15 + (volA > 1000000 ? 20 : 0);
      const scoreB = Math.abs(changeB) * 15 + (volB > 1000000 ? 20 : 0);
      return scoreB - scoreA;
    }
    return 0; // custom drag order
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (sortBy !== 'custom') return; // only allow dragging in custom sort mode
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.dataTransfer.setDragImage && e.currentTarget) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (sortBy !== 'custom') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (sortBy !== 'custom') return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...rawSymbols];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setDraggedIndex(null);
    setDragOverIndex(null);

    if (onReorderSymbols) {
      onReorderSymbols(updated);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveName = () => {
    if (editedName.trim() && onRenameWatchlist) {
      onRenameWatchlist(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="bg-[#09090b] border border-zinc-800 rounded-none p-4 shadow-2xl space-y-3 font-sans">
      {/* Table Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white text-black rounded-none">
            <BarChart2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-2 py-0.5 bg-black border border-white rounded-none text-sm text-white font-mono font-bold focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-emerald-400 hover:bg-zinc-800 rounded-none"
                    title="Save"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 text-zinc-400 hover:bg-zinc-800 rounded-none"
                    title="Cancel"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 uppercase">
                    {watchlist.name}
                    <span className="text-[11px] font-normal text-zinc-400 font-mono lowercase">
                      ({rawSymbols.length} assets)
                    </span>
                  </h2>
                  {onRenameWatchlist && (
                    <button
                      onClick={() => {
                        setEditedName(watchlist.name);
                        setIsEditingName(true);
                      }}
                      className="text-zinc-500 hover:text-white transition-colors p-1"
                      title="Rename watchlist"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  {!watchlist.isDefault && onDeleteWatchlist && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete watchlist "${watchlist.name}"?`)) {
                          onDeleteWatchlist();
                        }
                      }}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      title="Delete this watchlist"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Market Structure Filtering • L1/L2/L3 • RSI Extremes • X-EMA Direction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StaleIndicator connected={connected} stale={stale} />
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs transition-colors border border-white"
          >
            <Plus size={14} />
            ADD SYMBOL
          </button>
        </div>
      </div>

      {/* Micro-Filtering & Quick-Sort Toolbar */}
      <div className="bg-black border border-zinc-800 p-2.5 space-y-2 font-mono text-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          {/* Search box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search symbol or event suffix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 rounded-none focus:outline-none focus:border-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 rounded-none focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="custom">Default (Drag-Order)</option>
              <option value="attention">Attention / Velocity</option>
              <option value="changeDesc">% Gainers First</option>
              <option value="changeAsc">% Losers First</option>
              <option value="volume">Highest Volume</option>
              <option value="symbol">Symbol (A-Z)</option>
            </select>
          </div>
        </div>

        {/* L1/L2/L3 & Structure Micro-Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-zinc-900">
          {/* L1 / L2 / L3 Tiers */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-zinc-500 mr-1 uppercase">Tier:</span>
            {(['ALL', 'L1', 'L2', 'L3'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-none border transition-colors ${
                  tierFilter === t
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
                }`}
              >
                {t === 'ALL' ? 'ALL TIERS' : t === 'L1' ? 'L1: MEGA' : t === 'L2' ? 'L2: GROWTH' : 'L3: BETA'}
              </button>
            ))}
          </div>

          {/* Market Structure Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-zinc-500 mr-1 uppercase">Structure:</span>
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'DEAD_CAT_BOUNCE', label: '⚠ Dead Cat Bounce' },
              { id: 'OVERBOUGHT', label: 'Overbought (RSI≥68)' },
              { id: 'OVERSOLD', label: 'Oversold (RSI≤34)' },
              { id: 'ABOVE_EMA', label: 'Above 20-EMA' },
              { id: 'BELOW_EMA', label: 'Below 20-EMA' },
              { id: 'BULLISH', label: '▲ Bullish' },
              { id: 'BEARISH', label: '▼ Bearish' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStructureFilter(f.id as any)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-none border transition-colors whitespace-nowrap ${
                  structureFilter === f.id
                    ? 'bg-zinc-200 text-black border-zinc-200'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Matches Count */}
          <div className="text-[10px] text-zinc-500 shrink-0">
            Showing <strong className="text-zinc-200">{filteredAndSortedSymbols.length}</strong> of {rawSymbols.length} assets
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <th className="py-2.5 px-2 w-8 text-center"></th>
              <th className="py-2.5 px-3">Symbol & Structure</th>
              <th className="py-2.5 px-4 text-right">LTP / Change</th>
              <th className="py-2.5 px-4 text-center hidden sm:table-cell">1D Trend</th>
              <th className="py-2.5 px-4 text-right hidden md:table-cell">High / Low</th>
              <th className="py-2.5 px-4 text-right hidden lg:table-cell">Volume</th>
              <th className="py-2.5 px-4 text-left">Market Structure & Flow</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {filteredAndSortedSymbols.map((symbol, idx) => {
              const snap = getSnapshotForSymbol(symbol);
              const tick = ticks[symbol];
              const symbolSignals = getSignalsForSymbol(symbol);
              const struct = snap?.structure;

              const fallbackPrice = snap?.ltp ?? 1000;
              const fallbackChange = snap?.changePercent ?? 0;
              const high = tick?.high ?? snap?.high ?? fallbackPrice;
              const low = tick?.low ?? snap?.low ?? fallbackPrice;
              const volume = tick?.volume ?? snap?.volume ?? 0;

              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <tr
                  key={symbol}
                  draggable={sortBy === 'custom'}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-colors group cursor-default select-none ${
                    isDragging ? 'opacity-25 bg-zinc-900' : 'hover:bg-zinc-950'
                  } ${isDragOver ? 'border-t-2 border-white bg-zinc-900' : ''}`}
                >
                  {/* Drag Handle */}
                  <td className="py-3 px-2 text-center text-zinc-600 group-hover:text-zinc-300 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} className="inline-block" />
                  </td>

                  {/* Symbol & Market Structure Tags */}
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-white text-xs tracking-tight flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => onInspectSymbol?.(symbol)}
                        className="hover:underline text-left cursor-pointer focus:outline-none"
                        title={`Inspect VERITAS institutional chart for ${symbol}`}
                      >
                        {symbol}
                      </button>

                      {/* Tier badge */}
                      {struct?.tier && (
                        <span className="px-1 py-0.2 rounded-none text-[8px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 uppercase">
                          {struct.tier}
                        </span>
                      )}

                      {/* Dead Cat Bounce Trap Warning Tag */}
                      {struct?.isDeadCatBounce && (
                        <button 
                          onClick={() => onInspectSymbol?.(symbol)}
                          className="px-1.5 py-0.2 rounded-none text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/60 cursor-pointer hover:bg-amber-500/30 flex items-center gap-0.5 uppercase animate-pulse"
                          title="Dead Cat Bounce warning: Click to inspect chart and trap risk metrics"
                        >
                          ⚠ TRAP RALLY
                        </button>
                      )}

                      {/* Sentiment arrow */}
                      {struct?.sentiment && (
                        <span className={`text-[9px] font-bold ${
                          struct.sentiment === 'BULLISH' ? 'text-emerald-400' : struct.sentiment === 'BEARISH' ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {struct.sentiment === 'BULLISH' ? '▲' : struct.sentiment === 'BEARISH' ? '▼' : '■'}
                        </span>
                      )}

                      {/* Event Suffix */}
                      {struct?.eventSuffix && (
                        <span className="px-1 py-0.2 rounded-none text-[8px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 uppercase">
                          [{struct.eventSuffix}]
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {symbol.includes('.') ? symbol.split('.')[1] : 'NSE'} • EQ
                    </div>
                  </td>

                  {/* Realtime Price */}
                  <td className="py-3 px-4 text-right font-mono">
                    <RealtimePrice
                      symbol={symbol}
                      tick={tick}
                      fallbackPrice={fallbackPrice}
                      fallbackChange={fallbackChange}
                    />
                  </td>

                  {/* 1D Sparkline Trend & Interactive Chart Inspection */}
                  <td className="py-3 px-4 text-center hidden sm:table-cell">
                    <div
                      onClick={() => onInspectSymbol?.(symbol)}
                      className="flex flex-col items-center justify-center cursor-pointer group/chart hover:opacity-90 transition-all p-1"
                      title={`Click to open VERITAS institutional chart & warnings for ${symbol}`}
                    >
                      <Sparkline
                        data={snap?.sparkline}
                        isPositive={fallbackChange >= 0}
                        width={90}
                        height={24}
                      />
                      {struct?.isDeadCatBounce ? (
                        <span className="mt-1 px-1 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/60 text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 group-hover/chart:bg-amber-500/30 animate-pulse">
                          ⚠ DEAD CAT BOUNCE
                        </span>
                      ) : (
                        <span className="mt-0.5 text-[8px] text-zinc-600 font-mono group-hover/chart:text-zinc-400 flex items-center gap-0.5">
                          chart ↗
                        </span>
                      )}
                    </div>
                  </td>

                  {/* High / Low */}
                  <td className="py-3 px-4 text-right hidden md:table-cell font-mono text-xs text-zinc-300 tabular-nums">
                    <div>₹{high.toFixed(2)}</div>
                    <div className="text-zinc-500 text-[10px]">₹{low.toFixed(2)}</div>
                  </td>

                  {/* Volume */}
                  <td className="py-3 px-4 text-right hidden lg:table-cell font-mono text-xs text-zinc-300 tabular-nums">
                    {volume.toLocaleString()}
                  </td>

                  {/* Market Structure & Signals Telemetry */}
                  <td className="py-3 px-4">
                    <div className="space-y-1 font-mono">
                      {/* Structure Telemetry (RSI & X-EMA) */}
                      {struct && (
                        <div className="flex items-center gap-1.5 text-[9px] flex-wrap">
                          <span className={`px-1 py-0.2 border ${
                            struct.rsiState === 'OVERBOUGHT' 
                              ? 'bg-amber-950/60 text-amber-400 border-amber-800' 
                              : struct.rsiState === 'OVERSOLD'
                              ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            RSI {struct.rsi}
                          </span>

                          <span className={`px-1 py-0.2 border ${
                            struct.emaState === 'ABOVE_EMA' 
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                              : struct.emaState === 'BELOW_EMA'
                              ? 'bg-red-950/60 text-red-400 border-red-800'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            {struct.emaState === 'ABOVE_EMA' ? '> 20-EMA' : struct.emaState === 'BELOW_EMA' ? '< 20-EMA' : '≈ 20-EMA'}
                          </span>
                        </div>
                      )}

                      {/* Active Signals */}
                      <div className="flex flex-wrap gap-1">
                        {symbolSignals.length > 0 ? (
                          symbolSignals.map((sig, sIdx) => (
                            <SignalBadge
                              key={sIdx}
                              type={sig.signalType}
                              severity={sig.severity}
                              description={sig.description}
                              metadata={sig.metadata}
                            />
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-zinc-700" /> steady flow
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onInspectSymbol?.(symbol)}
                        className={`p-1 rounded-none transition-colors ${
                          struct?.isDeadCatBounce
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                            : 'text-zinc-600 hover:text-white hover:bg-zinc-900'
                        }`}
                        title={`Inspect ${symbol} chart & alerts`}
                      >
                        <BarChart2 size={13} />
                      </button>
                      <button
                        onClick={() => onRemoveSymbol(symbol)}
                        className="p-1 rounded-none text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                        title={`Remove ${symbol} from watchlist`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedSymbols.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-zinc-500 font-mono text-xs">
                  <p>No symbols match the current micro-filter criteria.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTierFilter('ALL');
                      setStructureFilter('ALL');
                    }}
                    className="mt-2 px-3 py-1 rounded-none bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddSymbolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddSymbol}
        existingSymbols={rawSymbols}
      />
    </div>
  );
}
