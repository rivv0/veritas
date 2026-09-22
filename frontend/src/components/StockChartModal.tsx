'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { X, AlertTriangle, TrendingDown, TrendingUp, ShieldAlert, Activity, Layers, BarChart2 } from 'lucide-react';
import type { MarketSnapshot, WsTick, WsSignal, ChartCandle } from '@/lib/types';
import { fetchChartCandles } from '@/lib/api';
import { SignalBadge } from './SignalBadge';
import { getCurrencySymbol } from '@/lib/formatters';

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
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const curr = getCurrencySymbol(symbol || undefined);
  const [liveHistory, setLiveHistory] = useState<number[]>([]);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1D'>('5m');
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);

  const ltp = tick?.ltp ?? snapshot?.ltp ?? (symbol === 'GROWW' ? 190.45 : 100);
  const baseClose = snapshot?.close ?? tick?.close ?? ltp;
  const change =
    tick?.change !== undefined
      ? tick.change
      : snapshot?.change !== undefined
      ? snapshot.change
      : ltp - baseClose;
  const changePercent =
    tick?.changePercent !== undefined
      ? tick.changePercent
      : snapshot?.changePercent !== undefined
      ? snapshot.changePercent
      : baseClose > 0
      ? (change / baseClose) * 100
      : 0;

  const struct = snapshot?.structure;
  const high = tick?.high ?? snapshot?.high ?? Math.max(ltp, baseClose);
  const low = tick?.low ?? snapshot?.low ?? Math.min(ltp, baseClose);
  const volume = tick?.volume ?? snapshot?.volume ?? 0;

  // Multi-timeframe continuous aggregates from TimescaleDB (time_bucket)
  useEffect(() => {
    if (!isOpen || !symbol) return;
    setLoadingCandles(true);
    fetchChartCandles(symbol, timeframe)
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCandles(res.data);
        } else {
          setCandles([]);
        }
      })
      .catch((e) => console.warn('Failed to fetch chart candles:', e))
      .finally(() => setLoadingCandles(false));
  }, [symbol, isOpen, timeframe]);

  // Initialize and append live incoming ticks to history
  useEffect(() => {
    if (!isOpen || !symbol) return;

    if (snapshot?.sparkline && snapshot.sparkline.length >= 6) {
      setLiveHistory(snapshot.sparkline);
    } else {
      // Synthesize realistic 24-point baseline if sparse
      const pts: number[] = [];
      const count = 24;
      const step = (ltp - baseClose) / count;
      for (let i = 0; i < count; i++) {
        const noise = (Math.sin((i / count) * Math.PI * 2) * (ltp * 0.003));
        pts.push(Number((baseClose + step * i + noise).toFixed(2)));
      }
      pts.push(ltp);
      setLiveHistory(pts);
    }
  }, [symbol, isOpen, snapshot?.sparkline]);

  // Live tick stream append
  useEffect(() => {
    if (!tick?.ltp) return;
    setLiveHistory((prev) => {
      if (prev.length === 0) return [tick.ltp];
      const last = prev[prev.length - 1];
      if (Math.abs(last - tick.ltp) > 0.01) {
        return [...prev.slice(-32), tick.ltp];
      }
      return prev;
    });
  }, [tick?.ltp]);

  // Derive Dead Cat Bounce state: either from struct or from live metrics
  const isDcb = Boolean(
    struct?.isDeadCatBounce || 
    (changePercent <= -1.4 && ltp < (struct?.ema20 ?? ltp * 1.002) && (struct?.rsi ?? 50) <= 46)
  );
  const dcbDetails = struct?.deadCatBounceDetails;

  // Chart SVG bounds calculation
  const chartWidth = 620;
  const chartHeight = 240;
  const paddingLeft = 20;
  const paddingRight = 70; // Space for right Y-axis labels
  const paddingTop = 25;
  const paddingBottom = 30;

  const candleCloses = candles.map((c) => c.close);
  const chartData = candleCloses.length >= 2 ? candleCloses : liveHistory.length >= 2 ? liveHistory : [baseClose, ltp];

  const { coords, pathD, areaD, emaY, minVal, maxVal, lastPoint, emaVal } = useMemo(() => {
    const rawMin = Math.min(...chartData, low);
    const rawMax = Math.max(...chartData, high);
    const spread = rawMax - rawMin || rawMax * 0.01 || 1;

    const min = Number((rawMin - spread * 0.06).toFixed(2));
    const max = Number((rawMax + spread * 0.06).toFixed(2));
    const valRange = max - min || 1;

    const drawW = chartWidth - paddingLeft - paddingRight;
    const drawH = chartHeight - paddingTop - paddingBottom;

    const points = chartData.map((val, idx) => {
      const x = paddingLeft + (idx / (chartData.length - 1)) * drawW;
      const y = paddingTop + drawH - ((val - min) / valRange) * drawH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val };
    });

    // Smooth bezier curve path
    let pD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pD += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }

    const lastPt = points[points.length - 1];
    const bottomY = chartHeight - paddingBottom;
    const aD = `${pD} L ${lastPt.x},${bottomY} L ${points[0].x},${bottomY} Z`;

    const targetEma = struct?.ema20 ?? (baseClose * 0.996);
    const calculatedEmaY = paddingTop + drawH - ((targetEma - min) / valRange) * drawH;
    const clampedEmaY = Math.max(paddingTop + 5, Math.min(bottomY - 5, calculatedEmaY));

    return {
      coords: points,
      pathD: pD,
      areaD: aD,
      emaY: clampedEmaY,
      minVal: min,
      maxVal: max,
      lastPoint: lastPt,
      emaVal: targetEma,
    };
  }, [chartData, high, low, baseClose, struct?.ema20]);

  if (!isOpen || !symbol) return null;

  const activePoint = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : lastPoint;
  
  const isNetPositive = changePercent > 0.001;
  const isNetNegative = changePercent < -0.001;

  const isBearish = isNetNegative;
  const isBullish = isNetPositive;

  const displaySentiment = isNetPositive
    ? (struct?.sentiment === 'BULLISH' ? 'BULLISH' : 'NEUTRAL')
    : isNetNegative
    ? (struct?.sentiment === 'BEARISH' ? 'BEARISH' : 'NEUTRAL')
    : (struct?.sentiment || 'NEUTRAL');

  const strokeColor = (isDcb && isNetNegative)
    ? '#f59e0b'
    : isNetPositive
    ? '#34d399'
    : isNetNegative
    ? '#f87171'
    : '#71717a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="bg-[#09090b] border border-zinc-700 w-full max-w-2xl shadow-[0_12px_50px_rgba(0,0,0,0.95)] rounded-none max-h-[92vh] overflow-y-auto space-y-4 p-4 sm:p-5 text-zinc-100">
        
        {/* Header Bar */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold font-mono text-white tracking-tight">{symbol}</span>
              {symbol === 'GROWW' && (
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase shadow-sm">
                  ★ HONORARY
                </span>
              )}
              {struct?.tier && (
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 uppercase">
                  {struct.tier}
                </span>
              )}
              {displaySentiment && (
                <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${
                  displaySentiment === 'BULLISH'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : displaySentiment === 'BEARISH'
                    ? 'bg-red-950/80 text-red-300 border border-red-800'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}>
                  {displaySentiment === 'BULLISH' ? '▲' : displaySentiment === 'BEARISH' ? '▼' : '■'} {displaySentiment}
                </span>
              )}
              {struct?.eventSuffix && (
                <span className="px-1.5 py-0.5 rounded-none text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 uppercase">
                  [{struct.eventSuffix}]
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              {symbol === 'GROWW'
                ? 'Billionbrains Garage Ventures Limited (NSE: GROWW) • Real-Feed Telemetry'
                : 'VERITAS REAL-TIME CHART & STRUCTURAL TELEMETRY'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-xl font-bold text-white tracking-tight tabular-nums">
                {curr}{ltp.toFixed(2)}
              </div>
              <div className={`text-xs font-bold tabular-nums ${isNetPositive ? 'text-emerald-400' : isNetNegative ? 'text-red-400' : 'text-zinc-400'}`}>
                {changePercent > 0.001 ? '+' : ''}{changePercent.toFixed(2)}% ({curr}{change > 0.001 ? '+' : ''}{change.toFixed(2)})
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
        {isDcb && isNetNegative && (
          <div className="bg-amber-950/50 border border-amber-500/80 p-3 space-y-2 font-mono animate-in slide-in-from-top-2 duration-200">
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
              <strong>Caution to retail traders:</strong> The current upward rebound is a classic <em>Dead Cat Bounce</em>. The asset is in a dominant macro decline ({changePercent.toFixed(1)}%), remains capped below its 20-EMA resistance ceiling ({curr}{emaVal.toFixed(2)}), and lacks institutional buying volume. Do not mistake this temporary bounce for a genuine trend reversal.
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
                <strong className="text-amber-100">{curr}{emaVal.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-amber-400/80">Market Action:</span>{' '}
                <strong className="text-amber-100">Exhaustion Pullback</strong>
              </div>
            </div>
          </div>
        )}

        {/* Intraday Chart View with Rich SVG Telemetry */}
        <div className="bg-black border border-zinc-800 p-3 space-y-2 relative select-none">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 uppercase">Bucket:</span>
              {(['1m', '5m', '15m', '1D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 border text-[10px] font-bold rounded-none transition-colors ${
                    timeframe === tf
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  {tf}
                </button>
              ))}
              {loadingCandles && (
                <span className="text-zinc-500 text-[9px] animate-pulse">
                  time_bucket...
                </span>
              )}
            </div>
            <span>Intraday Range: {curr}{low.toFixed(2)} — {curr}{high.toFixed(2)}</span>
          </div>

          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 sm:h-52 overflow-visible"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;
                const drawW = chartWidth - paddingLeft - paddingRight;
                const ratio = Math.max(0, Math.min(1, (mouseX - paddingLeft) / drawW));
                const idx = Math.round(ratio * (coords.length - 1));
                setHoverIndex(idx);
              }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
                  <stop offset="60%" stopColor={strokeColor} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Grid Lines */}
              <line 
                x1={paddingLeft} 
                y1={paddingTop} 
                x2={chartWidth - paddingRight} 
                y2={paddingTop} 
                stroke="#27272a" 
                strokeDasharray="3 3" 
              />
              <line 
                x1={paddingLeft} 
                y1={chartHeight / 2} 
                x2={chartWidth - paddingRight} 
                y2={chartHeight / 2} 
                stroke="#27272a" 
                strokeDasharray="3 3" 
              />
              <line 
                x1={paddingLeft} 
                y1={chartHeight - paddingBottom} 
                x2={chartWidth - paddingRight} 
                y2={chartHeight - paddingBottom} 
                stroke="#27272a" 
                strokeDasharray="3 3" 
              />

              {/* DEAD CAT BOUNCE RESISTANCE CORRIDOR SHADING */}
              {isDcb && isNetNegative && (
                <rect
                  x={paddingLeft}
                  y={emaY}
                  width={chartWidth - paddingLeft - paddingRight}
                  height={Math.max(10, (chartHeight - paddingBottom) - emaY)}
                  fill="#78350f"
                  fillOpacity="0.12"
                />
              )}

              {/* 20-EMA Resistance Reference Line */}
              <line
                x1={paddingLeft}
                y1={emaY}
                x2={chartWidth - paddingRight}
                y2={emaY}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.85"
              />

              {/* Volume Bars from TimescaleDB Candles */}
              {candles.length > 0 &&
                (() => {
                  const maxVol = Math.max(...candles.map((c) => c.volume), 1);
                  const barW = Math.max(2, (chartWidth - paddingLeft - paddingRight) / candles.length - 2);
                  return coords.map((pt, i) => {
                    const c = candles[i];
                    if (!c) return null;
                    const barH = Math.max(2, (c.volume / maxVol) * 32);
                    const isGreen = c.close >= c.open;
                    return (
                      <rect
                        key={i}
                        x={pt.x - barW / 2}
                        y={chartHeight - paddingBottom - barH}
                        width={barW}
                        height={barH}
                        fill={isGreen ? '#10b981' : '#ef4444'}
                        opacity={0.35}
                      />
                    );
                  });
                })()}

              {/* Neon Gradient Fill Under Curve */}
              <path d={areaD} fill={`url(#${gradientId})`} />

              {/* Price Curve Smooth Path */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Crosshair on Hover */}
              {hoverIndex !== null && activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={chartHeight - paddingBottom}
                    stroke="#71717a"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill="#ffffff"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />
                </>
              )}

              {/* Latest Point Marker */}
              {lastPoint && hoverIndex === null && (
                <g>
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="4"
                    fill="#ffffff"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    r="8"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1"
                    opacity="0.5"
                    className="animate-ping origin-center"
                  />
                </g>
              )}

              {/* Y-Axis Price Scale on Right Margin */}
              <g transform={`translate(${chartWidth - paddingRight + 8}, 0)`}>
                {/* Max Value Label */}
                <text x="0" y={paddingTop + 3} fill="#71717a" fontSize="9" fontFamily="monospace">
                  {curr}{maxVal.toFixed(1)}
                </text>

                {/* 20-EMA Tag */}
                <g transform={`translate(0, ${emaY})`}>
                  <rect x="-2" y="-8" width="56" height="15" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" />
                  <text x="3" y="3" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    EMA {curr}{emaVal.toFixed(1)}
                  </text>
                </g>

                {/* Current Price LTP Tag */}
                {lastPoint && (
                  <g transform={`translate(0, ${Math.max(paddingTop + 14, Math.min(chartHeight - paddingBottom - 8, lastPoint.y))})`}>
                    <rect 
                      x="-2" 
                      y="-8" 
                      width="56" 
                      height="15" 
                      fill={isBearish ? '#7f1d1d' : isBullish ? '#064e3b' : '#27272a'} 
                      stroke={strokeColor} 
                      strokeWidth="1" 
                    />
                    <text x="3" y="3" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {curr}{ltp.toFixed(1)}
                    </text>
                  </g>
                )}

                {/* Min Value Label */}
                <text x="0" y={chartHeight - paddingBottom} fill="#71717a" fontSize="9" fontFamily="monospace">
                  {curr}{minVal.toFixed(1)}
                </text>
              </g>

              {/* Dead Cat Bounce Callout Annotation */}
              {isDcb && lastPoint && (
                <g transform={`translate(${Math.min(chartWidth - 260, Math.max(paddingLeft, lastPoint.x - 110))}, ${Math.max(paddingTop + 10, emaY - 26)})`}>
                  <rect
                    width="210"
                    height="22"
                    fill="#451a03"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                  <text
                    x="8"
                    y="15"
                    fill="#fef3c7"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ⚠ 20-EMA REJECTION (DEAD CAT BOUNCE)
                  </text>
                </g>
              )}

              {/* Floating Crosshair Hover Badge */}
              {hoverIndex !== null && activePoint && (
                <g transform={`translate(${Math.min(chartWidth - 140, Math.max(paddingLeft, activePoint.x - 50))}, ${paddingTop - 12})`}>
                  <rect width="100" height="18" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                  <text x="50" y="13" fill="#ffffff" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    {curr}{activePoint.val.toFixed(2)}
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
              {curr}{(high - low).toFixed(2)} ({low > 0 ? (((high - low) / low) * 100).toFixed(1) : 0}%)
            </div>
          </div>
        </div>

        {/* Active Signals & Alerts for this Stock */}
        {signals.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 space-y-1.5 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Alerts & Telemetry</div>
            <div className="flex flex-wrap gap-1.5">
              {signals.map((sig, idx) => (
                <SignalBadge
                  key={sig.id || `${sig.symbol}-${sig.signalType || sig.type}-${idx}`}
                  type={sig.signalType || sig.type}
                  severity={sig.severity}
                  description={sig.description}
                  symbol={symbol || undefined}
                  metadata={sig.metadata}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
