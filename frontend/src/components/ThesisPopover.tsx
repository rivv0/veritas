'use client';

import React, { useState } from 'react';
import { Target, Check, X, Edit3 } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/formatters';
import { updateWatchlistThesis } from '@/lib/api';

interface Props {
  watchlistId: string;
  symbol: string;
  currentPrice: number;
  initialThesis?: string;
  initialPrice?: number;
  onSave?: (thesis: string, price?: number) => void;
}

export function ThesisPopover({
  watchlistId,
  symbol,
  currentPrice,
  initialThesis = '',
  initialPrice,
  onSave,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [thesis, setThesis] = useState(initialThesis);
  const [entryPrice, setEntryPrice] = useState<string>(
    initialPrice ? String(initialPrice) : ''
  );
  const [saving, setSaving] = useState(false);

  const curr = getCurrencySymbol(symbol);
  const parsedPrice = parseFloat(entryPrice);
  const hasAnchor = !isNaN(parsedPrice) && parsedPrice > 0;

  // Calculate live return since entry
  const returnSincePercent = hasAnchor
    ? Number((((currentPrice - parsedPrice) / parsedPrice) * 100).toFixed(2))
    : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priceVal = hasAnchor ? parsedPrice : undefined;
      await updateWatchlistThesis(watchlistId, symbol, thesis, priceVal);
      onSave?.(thesis, priceVal);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save thesis:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block font-mono">
      {/* Anchor Trigger Pill */}
      {hasAnchor || initialThesis ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-none text-[10px] text-zinc-300 transition-colors"
          title={initialThesis || 'Click to edit entry thesis'}
        >
          <Target size={11} className="text-zinc-400 group-hover:text-white shrink-0" />
          {hasAnchor ? (
            <span>
              Anchor @ {curr}{parsedPrice.toFixed(2)}{' '}
              <span
                className={`font-bold ${
                  returnSincePercent > 0
                    ? 'text-emerald-400'
                    : returnSincePercent < 0
                    ? 'text-red-400'
                    : 'text-zinc-400'
                }`}
              >
                ({returnSincePercent > 0 ? '+' : ''}
                {returnSincePercent.toFixed(1)}%)
              </span>
            </span>
          ) : (
            <span className="truncate max-w-[120px]">{initialThesis}</span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white px-1.5 py-0.5 border border-dashed border-zinc-700 transition-opacity"
          title="Add entry-price anchor and thesis"
        >
          <Target size={10} /> +THESIS
        </button>
      )}

      {/* Popover Modal / Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-[#09090b] border border-zinc-700 p-3 shadow-2xl rounded-none text-zinc-200 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
            <span className="font-bold text-white tracking-wider flex items-center gap-1.5 uppercase text-[11px]">
              <Target size={12} className="text-emerald-400" />
              Thesis & Anchor · {symbol}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-2.5">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1 uppercase">
                Entry Price Anchor ({curr})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={`Current: ${curr}${currentPrice.toFixed(2)}`}
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-black border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono"
              />
              {hasAnchor && (
                <div className="mt-1 text-[10px]">
                  P&L since anchor:{' '}
                  <span
                    className={`font-bold ${
                      returnSincePercent > 0
                        ? 'text-emerald-400'
                        : returnSincePercent < 0
                        ? 'text-red-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {returnSincePercent > 0 ? '+' : ''}
                    {returnSincePercent.toFixed(2)}% ({curr}
                    {(currentPrice - parsedPrice).toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1 uppercase">
                Investment Thesis / Catalyst
              </label>
              <textarea
                rows={2}
                placeholder="Why are you watching/buying this? (e.g. Q3 turnaround margin breakout)"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                className="w-full bg-black border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-[10px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-bold text-[10px] transition-colors"
              >
                {saving ? 'Saving...' : 'Set Anchor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
