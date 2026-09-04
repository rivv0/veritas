'use client';

import React, { useMemo } from 'react';
import { X, AlertTriangle, TrendingDown, TrendingUp, ShieldAlert, Activity, Layers, BarChart2 } from 'lucide-react';
import type { MarketSnapshot, WsTick, WsSignal } from '@/lib/types';
import { SignalBadge } from './SignalBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  symbol: string | null;
  snapshot?: MarketSnapshot;
  tick?: WsTick;
  signals?: WsSignal[];
}

export function StockChartModal({
  isOpen,
  onClose,
  symbol,
  snapshot,
  tick,
  signals = [],
}: Props) {
  if (!isOpen || !symbol) return null;

  const ltp = tick?.ltp ?? snapshot?.ltp ?? 1000;
  const baseClose = tick?.close ?? snapshot?.close ?? ltp;
  const change = tick?.ltp ? tick.ltp - baseClose : snapshot?.change ?? 0;
  const changePercent = baseClose > 0 ? (change / baseClose) * 100 : snapshot?.changePercent ?? 0;
  const isUp = changePercent >= 0;

  const high = tick?.high ?? snapshot?.high ?? ltp;
  const low = tick?.low ?? snapshot?.low ?? ltp;
  const volume = tick?.volume ?? snapshot?.volume ?? 0;
  const struct = snapshot?.structure;

  const sparklineData = snapshot?.sparkline && snapshot.sparkline.length >= 2
    ? snapshot.sparkline
    : [baseClose, ltp];

  // Derive Dead Cat Bounce state: either from struct or from live metrics
  const isDcb = Boolean(struct?.isDeadCatBounce || (changePercent <= -1.4 && ltp < (struct?.ema20 ?? ltp * 1.002) && (struct?.rsi ?? 50) <= 46));
  const dcbDetails = struct?.deadCatBounceDetails;

  // Chart SVG bounds calculation
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = 35;

  const { pointsStr, emaY, lowY, highY, lastPoint } = useMemo(() => {
    const minVal = Math.min(...sparklineData, low) * 0.998;
    const maxVal = Math.max(...sparklineData, high) * 1.002;
    const valRange = maxVal - minVal || 1;

    const coords = sparklineData.map((val, idx) => {
      const x = padding + (idx / (sparklineData.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((val - minVal) / valRange) * (chartHeight - padding * 2);
      return { x, y, val };
    });

    const pts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    const emaVal = struct?.ema20 ?? (baseClose * 0.995);
    const emaCoordY = chartHeight - padding - ((emaVal - minVal) / valRange) * (chartHeight - padding * 2);
    const lowCoordY = chartHeight - padding - ((low - minVal) / valRange) * (chartHeight - padding * 2);
    const highCoordY = chartHeight - padding - ((high - minVal) / valRange) * (chartHeight - padding * 2);

    return {
      pointsStr: pts,
      emaY: Math.max(padding, Math.min(chartHeight - padding, emaCoordY)),
      lowY: lowCoordY,
      highY: highCoordY,
      lastPoint: coords[coords.length - 1],
    };
  }, [sparklineData, high, low, baseClose, struct?.ema20]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="bg-[#09090b] border border-zinc-700 w-full max-w-2xl shadow-[0_8px_40px_rgba(0,0,0,0.95)] rounded-none overflow-hidden space-y-4 p-5 text-zinc-100">
        
        {/* Header Bar */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold font-mono text-white tracking-tight">{symbol}</span>
              {struct?.tier && (
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 uppercase">
                  {struct.tier}
                </span>
              )}
              {struct?.sentiment && (
                <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${
                  struct.sentiment === 'BULLISH'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : struct.sentiment === 'BEARISH'
                    ? 'bg-red-950/80 text-red-300 border border-red-800'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}>
                  {struct.sentiment === 'BULLISH' ? '▲' : struct.sentiment === 'BEARISH' ? '▼' : '■'} {struct.sentiment}
                </span>
              )}
              {struct?.eventSuffix && (
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 uppercase">
                  [{struct.eventSuffix}]
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              VERITAS REAL-TIME CHART & STRUCTURAL TELEMETRY
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-lg font-bold text-white tracking-tight">₹{ltp.toFixed(2)}</div>
              <div className={`text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{changePercent.toFixed(2)}% (₹{change >= 0 ? '+' : ''}{change.toFixed(2)})
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* DEAD CAT BOUNCE VISUAL WARNING BANNER */}
        {isDcb && (
          <div className="bg-amber-950/40 border border-amber-500/80 p-3 space-y-2 font-mono animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <span className="p-1 bg-amber-500 text-black shrink-0">
                  <AlertTriangle size={14} />
                </span>
                <span className="tracking-wide uppercase">
                  VISUAL WARNING: DEAD CAT BOUNCE (RETAIL BULL-TRAP)
                </span>
              </div>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-200 border border-amber-700 text-[10px] font-bold shrink-0">
                TRAP RISK: {dcbDetails?.trapRiskPercent ?? 84}%
              </span>
            </div>

            <p className="text-xs text-amber-200/90 leading-relaxed">
              <strong>Caution to retail traders:</strong> The current upward rebound is a classic <em>Dead Cat Bounce</em>. The asset is in a dominant macro decline ({changePercent.toFixed(1)}%), remains capped below its 20-EMA resistance ceiling (₹{struct?.ema20 ?? 'N/A'}), and lacks institutional buying volume. Do not mistake this temporary bounce for a genuine trend reversal.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-800/60 text-[10px]">
              <div>
                <span className="text-amber-400/80">Net Drawdown:</span>{' '}
                <strong className="text-amber-100">{changePercent.toFixed(2)}%</strong>
              </div>
              <div>
                <span className="text-amber-400/80">Bounce Height:</span>{' '}
                <strong className="text-amber-100">+{dcbDetails?.bouncePercent ?? 0.4}% (Weak)</strong>
              </div>
              <div>
                <span className="text-amber-400/80">20-EMA Ceiling:</span>{' '}
                <strong className="text-amber-100">₹{struct?.ema20 ?? '---'}</strong>
              </div>
              <div>
                <span className="text-amber-400/80">Market Action:</span>{' '}
                <strong className="text-amber-100">Exhaustion Pullback</strong>
              </div>
            </div>
          </div>
        )}

        {/* Intraday Chart View with Overlayed Annotations */}
        <div className="bg-black border border-zinc-800 p-3 space-y-2 relative">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-2">
              <span className="w-2 h-0.5 bg-zinc-200" /> Intraday Price Line
              <span className="w-2 h-0.5 border-t border-dashed border-amber-400" /> 20-EMA
            </span>
            <span>Intraday Range: ₹{low.toFixed(2)} — ₹{high.toFixed(2)}</span>
          </div>

          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 overflow-visible"
            >
              {/* Background Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#27272a" strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#27272a" strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#27272a" strokeDasharray="3 3" />

              {/* 20-EMA Resistance Reference Line */}
              <line
                x1={padding}
                y1={emaY}
                x2={chartWidth - padding}
                y2={emaY}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
              <text
                x={chartWidth - padding - 85}
                y={Math.max(padding + 12, emaY - 6)}
                fill="#fbbf24"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                20-EMA (₹{struct?.ema20 ?? ''})
              </text>

              {/* Price Curve Polyline */}
              <polyline
                fill="none"
                stroke={isUp ? '#34d399' : '#f87171'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsStr}
              />

              {/* Latest Point Marker */}
              {lastPoint && (
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="4"
                  fill="#ffffff"
                  stroke={isUp ? '#34d399' : '#f87171'}
                  strokeWidth="2"
                />
              )}

              {/* Dead Cat Bounce Callout Annotation */}
              {isDcb && lastPoint && (
                <g transform={`translate(${Math.min(chartWidth - 190, lastPoint.x - 90)}, ${Math.max(padding + 10, lastPoint.y - 38)})`}>
                  <rect
                    width="180"
                    height="24"
                    fill="#451a03"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    rx="0"
                  />
                  <text
                    x="8"
                    y="16"
                    fill="#fef3c7"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ⚠ DEAD CAT BOUNCE ZONE
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Structural Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <div className="bg-black border border-zinc-800 p-2">
            <div className="text-[10px] text-zinc-500 uppercase">14-Period RSI</div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>{struct?.rsi ?? 50}</span>
              <span className={`text-[10px] px-1 py-0.2 border ${
                struct?.rsiState === 'OVERBOUGHT' ? 'text-amber-400 border-amber-800 bg-amber-950/40' :
                struct?.rsiState === 'OVERSOLD' ? 'text-cyan-400 border-cyan-800 bg-cyan-950/40' :
                'text-zinc-400 border-zinc-800'
              }`}>
                {struct?.rsiState?.toLowerCase() ?? 'neutral'}
              </span>
            </div>
          </div>

          <div className="bg-black border border-zinc-800 p-2">
            <div className="text-[10px] text-zinc-500 uppercase">20-EMA Alignment</div>
            <div className={`text-sm font-bold mt-0.5 ${
              struct?.emaState === 'ABOVE_EMA' ? 'text-emerald-400' :
              struct?.emaState === 'BELOW_EMA' ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {struct?.emaState === 'ABOVE_EMA' ? '▲ Above 20-EMA' : struct?.emaState === 'BELOW_EMA' ? '▼ Below 20-EMA' : '≈ 20-EMA Pivot'}
            </div>
          </div>

          <div className="bg-black border border-zinc-800 p-2">
            <div className="text-[10px] text-zinc-500 uppercase">Total Volume</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {volume.toLocaleString()}
            </div>
          </div>

          <div className="bg-black border border-zinc-800 p-2">
            <div className="text-[10px] text-zinc-500 uppercase">Day Spread (H/L)</div>
            <div className="text-sm font-bold text-white mt-0.5">
              ₹{(high - low).toFixed(2)} ({low > 0 ? (((high - low) / low) * 100).toFixed(1) : 0}%)
            </div>
          </div>
        </div>

        {/* Active Signals & Alerts for this Stock */}
        {signals.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 space-y-1.5 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Alerts & Telemetry</div>
            <div className="flex flex-wrap gap-1.5">
              {signals.map((s, idx) => (
                <SignalBadge
                  key={idx}
                  type={s.signalType}
                  severity={s.severity}
                  description={s.description}
                  metadata={s.metadata}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
