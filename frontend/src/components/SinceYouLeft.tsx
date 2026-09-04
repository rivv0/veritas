'use client';

import { ArrowUpRight, ArrowDownRight, Clock, Sparkles, TrendingUp, TrendingDown, Layers, Activity } from 'lucide-react';
import type { WatchlistDigest, DigestItem } from '@/lib/types';
import { SignalBadge } from './SignalBadge';

interface Props {
  digest: WatchlistDigest | null;
  loading: boolean;
  activeLookback?: number;
  onSelectLookback?: (minutes?: number) => void;
}

function DigestCard({ item }: { item: DigestItem }) {
  const isUp = item.percentChange >= 0;
  const struct = item.structure;
  
  // Deduplicate signals: keep max 2 unique types
  const uniqueSignals: typeof item.signals = [];
  const seenTypes = new Set<string>();
  for (const s of item.signals) {
    const type = s.signalType || s.type || 'SIGNAL';
    if (!seenTypes.has(type)) {
      seenTypes.add(type);
      uniqueSignals.push(s);
      if (uniqueSignals.length >= 2) break;
    }
  }

  return (
    <div className={`p-3 rounded-none border transition-colors ${item.isMeaningful ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-800 bg-black'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold font-mono text-white tracking-tight">{item.symbol}</span>
          
          {/* L1 / L2 / L3 Market Tier Tag */}
          {struct?.tier && (
            <span className="px-1 py-0.2 rounded-none text-[8px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 uppercase">
              {struct.tier}
            </span>
          )}

          {/* Sentiment Badge */}
          {struct?.sentiment && (
            <span className={`px-1 py-0.2 rounded-none text-[8px] font-mono font-bold uppercase flex items-center gap-0.5 ${
              struct.sentiment === 'BULLISH' 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                : struct.sentiment === 'BEARISH'
                ? 'bg-red-950/80 text-red-300 border border-red-800/80'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}>
              {struct.sentiment === 'BULLISH' ? '▲' : struct.sentiment === 'BEARISH' ? '▼' : '■'} {struct.sentiment}
            </span>
          )}

          {/* Event Suffix */}
          {struct?.eventSuffix && (
            <span className="px-1 py-0.2 rounded-none text-[8px] font-mono font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase">
              [{struct.eventSuffix}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
          <Clock size={10} />
          {item.timeSinceLastCheck}
        </div>
      </div>
      
      <div className="flex items-center justify-between my-2 font-mono">
        <div>
          <div className="text-[9px] text-zinc-400 mb-0.5">Price Delta</div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-xs">₹{item.previousPrice.toFixed(2)}</span>
            <span className="text-zinc-400">→</span>
            <span className="text-white font-bold text-xs">₹{item.currentPrice.toFixed(2)}</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-xs font-bold ${isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          <span>{isUp ? '+' : ''}{item.percentChange.toFixed(2)}%</span>
        </div>
      </div>

      {/* Market Structure Telemetry (RSI + X-EMA) */}
      {struct && (
        <div className="flex items-center gap-2 py-1 text-[9px] font-mono text-zinc-400 border-t border-zinc-900">
          <span className={`${struct.rsiState === 'OVERBOUGHT' ? 'text-amber-400 font-bold' : struct.rsiState === 'OVERSOLD' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}>
            RSI: {struct.rsi} ({struct.rsiState.toLowerCase()})
          </span>
          <span>•</span>
          <span className={`${struct.emaState === 'ABOVE_EMA' ? 'text-emerald-400' : struct.emaState === 'BELOW_EMA' ? 'text-red-400' : 'text-zinc-400'}`}>
            {struct.emaState === 'ABOVE_EMA' ? '▲ Above 20-EMA' : struct.emaState === 'BELOW_EMA' ? '▼ Below 20-EMA' : '≈ 20-EMA Pivot'}
          </span>
        </div>
      )}
      
      {uniqueSignals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-zinc-800/80">
          {uniqueSignals.map((sig) => (
            <SignalBadge
              key={sig.id}
              type={sig.signalType || sig.type}
              severity={sig.severity}
              description={sig.description}
              metadata={sig.metadata}
            />
          ))}
        </div>
      )}

      {item.catalyst && (
        <div className="mt-1.5 text-[11px] text-zinc-300 font-mono line-clamp-2">
          * {item.catalyst}
        </div>
      )}
      
      {item.attentionScore > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-800/80 font-mono">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-400 shrink-0">Attention</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-none overflow-hidden max-w-[90px]">
              <div
                className={`h-full transition-all rounded-none ${
                  item.attentionScore >= 80 ? 'bg-white' : item.attentionScore >= 50 ? 'bg-zinc-300' : 'bg-zinc-500'
                }`}
                style={{ width: `${item.attentionScore}%` }}
              />
            </div>
            <span className="text-[10px] text-white font-bold shrink-0">{item.attentionScore}/100</span>
          </div>

          <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 shrink-0 ${
            item.attentionScore >= 80 
              ? 'bg-white text-black font-bold' 
              : item.attentionScore >= 50 
              ? 'bg-zinc-900 text-zinc-300 border border-zinc-700' 
              : 'text-zinc-400'
          }`}>
            {item.attentionScore >= 80 ? 'HIGH FOCUS' : item.attentionScore >= 50 ? 'ACTIVE FLOW' : 'MODERATE'}
          </span>
        </div>
      )}
    </div>
  );
}

export function SinceYouLeft({ digest, loading, activeLookback, onSelectLookback }: Props) {
  const LOOKBACK_OPTIONS = [
    { label: 'Auto (Session)', value: undefined },
    { label: '15m', value: 15 },
    { label: '1h', value: 60 },
    { label: '4h', value: 240 },
    { label: 'Today', value: 1440 },
  ];

  if (loading) {
    return (
      <div className="space-y-2.5 font-mono">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-900 rounded-none animate-pulse border border-zinc-800" />
        ))}
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="space-y-3 font-sans">
      <div className="pb-2 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              Since You Left
              <span className="text-[9px] px-1.5 py-0.2 rounded-none bg-zinc-900 text-zinc-300 border border-zinc-700">
                DIGEST
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
              {digest.meaningfulCount} delta events in <strong className="text-zinc-200">{digest.watchlistName}</strong>
            </p>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {new Date(digest.since).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Time-Horizon Baseline Selector */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar font-mono">
          <span className="text-[10px] text-zinc-500 mr-1 shrink-0 uppercase tracking-wider">Lookback:</span>
          {LOOKBACK_OPTIONS.map((opt) => {
            const isSelected = activeLookback === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => onSelectLookback?.(opt.value)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-none border transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="space-y-2">
        {digest.items.map((item) => (
          <DigestCard key={item.symbol} item={item} />
        ))}
      </div>
      
      {digest.topMovers.length > 0 && (
        <div className="pt-3 border-t border-zinc-800">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">Top Watchlist Movers</h3>
          <div className="grid grid-cols-2 gap-1.5 font-mono">
            {digest.topMovers.slice(0, 4).map((item) => (
              <div key={item.symbol} className="p-2 rounded-none bg-black border border-zinc-800">
                <div className="text-[10px] font-bold text-zinc-300 mb-0.5">{item.symbol}</div>
                <div className={`text-xs font-bold ${item.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.percentChange >= 0 ? '+' : ''}{item.percentChange.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
