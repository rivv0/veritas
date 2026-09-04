'use client';

import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface Props {
  connected: boolean;
  stale: boolean;
}

export function StaleIndicator({ connected, stale }: Props) {
  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-black text-red-400 border border-red-500/30 uppercase">
        <WifiOff size={11} />
        Disconnected
      </span>
    );
  }
  if (stale) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-black text-amber-400 border border-amber-500/30 uppercase">
        <AlertTriangle size={11} />
        Stale
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-black text-emerald-400 border border-emerald-500/30 uppercase">
      <Wifi size={11} />
      Live Feed
    </span>
  );
}
