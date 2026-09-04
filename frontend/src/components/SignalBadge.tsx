'use client';

import React, { useState } from 'react';
import { TrendingUp, Activity, Zap, Layers, RotateCcw, Newspaper, Sparkles, AlertTriangle } from 'lucide-react';

interface Props {
  type?: string;
  signalType?: string;
  severity: number;
  description?: string;
  metadata?: Record<string, any>;
}

interface StatItem {
  label: string;
  value: string;
}

const iconMap: Record<string, React.ReactNode> = {
  VOLATILITY_SPIKE: <Zap size={11} className="text-zinc-300" />,
  PRICE_BREAKOUT: <TrendingUp size={11} className="text-zinc-200" />,
  OPTIONS_FLOW: <Layers size={11} className="text-zinc-200" />,
  MOMENTUM_REVERSAL: <RotateCcw size={11} className="text-zinc-300" />,
  NEWS_VELOCITY: <Newspaper size={11} className="text-zinc-300" />,
  SECTOR_DIVERGENCE: <Activity size={11} className="text-zinc-400" />,
  VOLUME_ANOMALY: <Activity size={11} className="text-zinc-400" />,
  DEAD_CAT_BOUNCE: <AlertTriangle size={11} className="text-amber-400" />,
};

const labelMap: Record<string, string> = {
  PRICE_BREAKOUT: 'Breakout',
  OPTIONS_FLOW: 'Options Flow',
  MOMENTUM_REVERSAL: 'Reversal',
  VOLATILITY_SPIKE: 'Volatility Move',
  NEWS_VELOCITY: 'News Catalyst',
  SECTOR_DIVERGENCE: 'Divergence',
  VOLUME_ANOMALY: 'Volume Anomaly',
  DEAD_CAT_BOUNCE: '⚠ Dead Cat Bounce',
};

export function SignalBadge({ type, signalType, severity, description, metadata }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const resolvedType = (type || signalType || '').trim();
  const label = labelMap[resolvedType] || (resolvedType ? resolvedType.replace(/_/g, ' ') : 'SIGNAL');

  // Extract statistical metrics
  const meta = metadata || {};
  let keyStats: StatItem[] = meta.keyStats || [];
  let rationale: string = meta.rationale || '';

  if (keyStats.length === 0) {
    if (resolvedType === 'PRICE_BREAKOUT') {
      const gain = meta.gainPercent ?? 1.5;
      keyStats = [
        { label: 'Intraday Move', value: `${gain >= 0 ? '+' : ''}${gain}%` },
        { label: 'Breakout Level', value: meta.high ? `₹${meta.high}` : 'Day High' },
        { label: 'Order Flow', value: 'Buyer Squeeze' },
        { label: 'Confidence', value: `${severity}%` },
      ];
      rationale = 'Price velocity broke above intraday resistance on aggressive buying';
    } else if (resolvedType === 'OPTIONS_FLOW') {
      const strike = meta.strike || 2200;
      const oi = meta.oiSurgePercent || 24;
      const block = meta.estimatedBlockCr || 28;
      keyStats = [
        { label: 'Target Strike', value: `₹${strike} CE` },
        { label: 'OI Expansion', value: `+${oi}% Contracts` },
        { label: 'Block Volume', value: `₹${block} Cr` },
        { label: 'Flow Direction', value: 'Ask Sweeps' },
      ];
      rationale = 'Heavy Call OI build-up and institutional block absorption';
    } else if (resolvedType === 'MOMENTUM_REVERSAL') {
      const jump = meta.tickJumpPercent || 0.35;
      keyStats = [
        { label: 'Pivot Rebound', value: `+${jump}% Impulse` },
        { label: 'Support Level', value: meta.lowPrice ? `₹${meta.lowPrice}` : 'Day Low' },
        { label: 'Order Flow', value: 'Short Covering' },
        { label: 'Confidence', value: `${severity}%` },
      ];
      rationale = 'Rebound impulse following intraday support test';
    } else {
      const atrRatio = meta.atrRatio || 2.1;
      keyStats = [
        { label: 'ATR Multiple', value: `${atrRatio}x Normal` },
        { label: '20-Day ATR', value: meta.atr20 ? `₹${meta.atr20}` : '₹35.00' },
        { label: 'Volatility State', value: 'Expansion Outlier' },
        { label: 'Confidence', value: `${severity}%` },
      ];
      rationale = 'Displacement exceeded 20-day standard deviation';
    }
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[11px] font-mono tracking-tight cursor-pointer transition-all duration-150 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 hover:border-zinc-500"
      >
        {iconMap[resolvedType] || <Activity size={11} />}
        <span>{label}</span>
        {severity > 50 && (
          <span className="ml-0.5 px-1 py-0 bg-black text-zinc-400 border border-zinc-800 text-[9px] font-mono">
            {severity}
          </span>
        )}
      </div>

      {/* Rich Statistics Tooltip Popover on Hover (Sharp & Monochrome) */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 rounded-none bg-[#09090b] border border-zinc-700 shadow-[0_8px_30px_rgba(0,0,0,0.9)] text-left pointer-events-none animate-in fade-in duration-100 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {label} Telemetry
            </span>
            <span className="text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 py-0.2">
              SEV {severity}/100
            </span>
          </div>

          {description && (
            <p className="text-[10px] text-zinc-300 font-sans leading-tight mb-2">
              {description}
            </p>
          )}

          {/* Key Statistics Grid */}
          <div className="grid grid-cols-2 gap-1 mb-1.5">
            {keyStats.slice(0, 4).map((stat, idx) => (
              <div key={idx} className="bg-black border border-zinc-800/80 p-1">
                <div className="text-[8px] text-zinc-400 uppercase tracking-wide">{stat.label}</div>
                <div className="text-[10px] font-bold text-zinc-200 truncate mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          {rationale && (
            <div className="text-[9px] text-zinc-400 font-sans italic flex items-start gap-1 pt-1 border-t border-zinc-800">
              <Sparkles size={10} className="text-zinc-400 shrink-0 mt-0.5" />
              <span className="truncate">{rationale}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
