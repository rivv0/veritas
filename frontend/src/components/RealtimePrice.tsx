'use client';

import { useEffect, useState, useRef } from 'react';
import type { WsTick } from '@/lib/types';

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
  const change = tick ? ((price - (tick.close || price)) / (tick.close || price)) * 100 : fallbackChange;

  useEffect(() => {
    if (tick && tick.ltp !== prevPrice.current) {
      setFlash(tick.ltp > prevPrice.current ? 'green' : 'red');
      const timer = setTimeout(() => setFlash(null), 800);
      prevPrice.current = tick.ltp;
      return () => clearTimeout(timer);
    }
  }, [tick]);

  const isUp = change >= 0;
  const flashClass = flash === 'green' ? 'animate-flash-green' : flash === 'red' ? 'animate-flash-red' : '';

  return (
    <div className={`text-right p-1 rounded-none transition-colors ${flashClass} font-mono`}>
      <div className="text-xs font-bold text-white tabular-nums tracking-tight">
        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-[10px] font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{change.toFixed(2)}%
      </div>
    </div>
  );
}
