'use client';

import { useEffect, useState, useRef } from 'react';
import type { WsTick } from '@/lib/types';
import { formatPrice } from '@/lib/formatters';

interface Props {
  symbol: string;
  tick?: WsTick;
  fallbackPrice: number;
  fallbackChange: number;
}

export function RealtimePrice({ symbol, tick, fallbackPrice, fallbackChange }: Props) {
  const [flash, setFlash] = useState<'green' | 'red' | null>(null);
  const prevPrice = useRef(fallbackPrice);

  const price = tick?.ltp ?? fallbackPrice;
  const change =
    tick?.changePercent !== undefined
      ? tick.changePercent
      : tick?.close && tick.close !== price
      ? ((price - tick.close) / tick.close) * 100
      : fallbackChange;

  useEffect(() => {
    if (tick && tick.ltp !== prevPrice.current) {
      setFlash(tick.ltp > prevPrice.current ? 'green' : 'red');
      const timer = setTimeout(() => setFlash(null), 800);
      prevPrice.current = tick.ltp;
      return () => clearTimeout(timer);
    }
  }, [tick]);

  const isUp = change > 0.001;
  const isDown = change < -0.001;
  const colorClass = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-zinc-400';
  const flashClass = flash === 'green' ? 'animate-flash-green' : flash === 'red' ? 'animate-flash-red' : '';

  return (
    <div className={`text-right p-1 rounded-none transition-colors ${flashClass} font-mono`}>
      <div className="text-xs font-bold text-white tabular-nums tracking-tight">
        {formatPrice(price, symbol)}
      </div>
      <div className={`text-[10px] font-bold tabular-nums ${colorClass}`}>
        {isUp ? '+' : ''}{change.toFixed(2)}%
      </div>
    </div>
  );
}
