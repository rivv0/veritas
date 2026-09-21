'use client';

import React, { useEffect, useState } from 'react';
import type { TrajectoryData } from '@/lib/types';

interface Props {
  symbol: string;
}

export function TrajectoryStrip({ symbol }: Props) {
  const [data, setData] = useState<TrajectoryData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/v1/market/trajectory?symbol=${symbol}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  if (!data) return null;

  return (
    <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-400">
      <span className="text-zinc-500 uppercase">Trajectory:</span>
      <span
        className={`px-1 py-0.2 border ${
          data.p30d > 0
            ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/30'
            : data.p30d < 0
            ? 'border-red-900/60 text-red-400 bg-red-950/30'
            : 'border-zinc-800 text-zinc-400 bg-zinc-900'
        }`}
        title="30-Day Return"
      >
        30D {data.p30d > 0 ? '+' : ''}
        {data.p30d.toFixed(1)}%
      </span>

      <span
        className={`px-1 py-0.2 border ${
          data.p90d > 0
            ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/30'
            : data.p90d < 0
            ? 'border-red-900/60 text-red-400 bg-red-950/30'
            : 'border-zinc-800 text-zinc-400 bg-zinc-900'
        }`}
        title="90-Day Return"
      >
        90D {data.p90d > 0 ? '+' : ''}
        {data.p90d.toFixed(1)}%
      </span>

      <span
        className={`px-1 py-0.2 border hidden lg:inline-block ${
          data.p1y > 0
            ? 'border-emerald-900/60 text-emerald-400 bg-emerald-950/30'
            : data.p1y < 0
            ? 'border-red-900/60 text-red-400 bg-red-950/30'
            : 'border-zinc-800 text-zinc-400 bg-zinc-900'
        }`}
        title="1-Year Return"
      >
        1Y {data.p1y > 0 ? '+' : ''}
        {data.p1y.toFixed(1)}%
      </span>
    </div>
  );
}
