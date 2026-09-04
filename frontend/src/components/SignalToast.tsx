'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, BellOff } from 'lucide-react';
import type { WsSignal } from '@/lib/types';

interface Props {
  signals: WsSignal[];
}

export function SignalToast({ signals }: Props) {
  const [activeToast, setActiveToast] = useState<WsSignal | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMuted || signals.length === 0) return;

    const latest = signals[0];
    if (!latest) return;

    const signalTime = new Date(latest.timestamp).getTime();
    const now = Date.now();

    // Guard 1: Must be newer than the last processed signal
    if (signalTime <= lastProcessedTimeRef.current) return;

    // Guard 2: Enforce a minimum 30-second cooldown so toasts don't pop rapidly
    if (activeToast && now - lastProcessedTimeRef.current < 30000) {
      return;
    }

    // Only show high-conviction signals (severity >= 78)
    if (latest.severity < 78) return;

    lastProcessedTimeRef.current = signalTime;
    setActiveToast(latest);

    if (timerRef.current) clearTimeout(timerRef.current);
    // Keep compact notification visible for 6 seconds
    timerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [signals, isMuted, activeToast]);

  if (!activeToast || isMuted) return null;

  const metadata = activeToast.metadata || {};
  const keyStats = metadata.keyStats || [];
  const rationale = metadata.rationale || activeToast.description;

  // Primary highlight stat
  const primaryStat = keyStats.length > 0 
    ? `${keyStats[0].label}: ${keyStats[0].value}`
    : `Sev: ${activeToast.severity}/100`;

  const secondaryStat = keyStats.length > 1
    ? `${keyStats[1].label}: ${keyStats[1].value}`
    : '';

  const cleanSignalName = (activeToast.signalType || 'SIGNAL').replace(/_/g, ' ');

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 fade-in duration-200 font-sans">
      <div className="bg-[#09090b] border border-zinc-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.9)] p-3 text-zinc-100 rounded-none space-y-1.5">
        {/* Top compact row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 bg-emerald-400 shrink-0" />
            <span className="font-mono font-bold text-xs tracking-tight text-white uppercase">
              {activeToast.symbol}
            </span>
            <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-300 uppercase tracking-wide shrink-0">
              {cleanSignalName}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 truncate">
              {primaryStat}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMuted(true)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors"
              title="Mute notifications"
            >
              <BellOff size={13} />
            </button>
            <button
              onClick={() => setActiveToast(null)}
              className="text-zinc-500 hover:text-white p-0.5 transition-colors"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Bottom compact statistics line */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-1.5 gap-2">
          <span className="truncate text-zinc-300">
            {secondaryStat ? `${secondaryStat} • ` : ''}{rationale}
          </span>
          <span className="shrink-0 text-zinc-400">
            {activeToast.severity}/100
          </span>
        </div>
      </div>
    </div>
  );
}
