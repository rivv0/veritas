'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { searchSymbols } from '@/lib/api';
import { searchLocalStocks, StockItem } from '@/lib/stockDirectory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string) => void;
  existingSymbols: string[];
}

export function AddSymbolModal({ isOpen, onClose, onAdd, existingSymbols }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const activeReqIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const existingSymbolsSet = new Set(existingSymbols);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const defaultLocal = searchLocalStocks('').filter((r) => !existingSymbolsSet.has(r.symbol));
      setResults(defaultLocal);

      // Fetch remote defaults without wiping local
      searchSymbols('')
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setResults((prev) => {
              const map = new Map<string, StockItem>();
              prev.forEach((item) => map.set(item.symbol, item));
              res.data.forEach((item: StockItem) => {
                if (!existingSymbolsSet.has(item.symbol) && !map.has(item.symbol)) {
                  map.set(item.symbol, item);
                }
              });
              return Array.from(map.values()).slice(0, 15);
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Unified debounced search with race-condition prevention
  const handleQueryChange = (val: string) => {
    setQuery(val);
    const cleanQ = val.trim().toUpperCase();

    // 1. INSTANT 0ms Local Matching (Zero latency, never flickers or disappears)
    const localMatches = searchLocalStocks(cleanQ).filter(
      (r) => !existingSymbolsSet.has(r.symbol)
    );
    setResults(localMatches);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!cleanQ) {
      setLoading(false);
      return;
    }

    // 2. Debounced Remote Search (250ms) to augment with live Yahoo directory
    setLoading(true);
    const currentReqId = ++activeReqIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchSymbols(cleanQ);
        // Discard stale responses if user typed something else in the meantime
        if (currentReqId !== activeReqIdRef.current) return;

        if (res.success && Array.isArray(res.data)) {
          setResults((prev) => {
            const map = new Map<string, StockItem>();
            // Keep current local matches at the top
            prev.forEach((item) => map.set(item.symbol, item));
            // Add server results
            res.data.forEach((item: StockItem) => {
              if (!existingSymbolsSet.has(item.symbol)) {
                map.set(item.symbol, item);
              }
            });
            return Array.from(map.values()).slice(0, 15);
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (currentReqId === activeReqIdRef.current) {
          setLoading(false);
        }
      }
    }, 250);
  };

  const cleanQuery = query.trim().toUpperCase();
  const hasExactInResults = results.some((r) => r.symbol === cleanQuery);
  const canDirectAdd = cleanQuery.length >= 1 && !existingSymbolsSet.has(cleanQuery);

  const submitAdd = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    onAdd(clean);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md bg-[#09090b] border border-zinc-700 rounded-none p-5 shadow-2xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Add Asset to List
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">Query real-time NSE, BSE, or Global assets</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (results.length > 0) {
                  submitAdd(results[0].symbol);
                } else if (canDirectAdd) {
                  submitAdd(cleanQuery);
                }
              }
            }}
            placeholder="Search RELIANCE, TATAMOTORS, ZOMATO, NVDA, AAPL..."
            className="w-full pl-9 pr-9 py-2 bg-black border border-zinc-700 rounded-none text-white placeholder-zinc-600 focus:outline-none focus:border-white text-xs font-mono transition-colors"
            autoFocus
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" size={14} />
          ) : query ? (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Section Label */}
        <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1">
            {cleanQuery.length > 0 ? (
              <span>Matching Assets ({results.length})</span>
            ) : (
              <>
                <Sparkles size={11} className="text-zinc-400" />
                <span>Curated Market Assets</span>
              </>
            )}
          </div>
          {loading && <span className="text-[9px] text-zinc-500">Searching directory...</span>}
        </div>

        {/* Search Results List */}
        <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1 divide-y divide-zinc-900 font-mono">
          {/* Quick Direct Add Option if user typed a custom ticker not in results */}
          {canDirectAdd && !hasExactInResults && (
            <button
              onClick={() => submitAdd(cleanQuery)}
              className="w-full flex items-center justify-between p-2.5 bg-zinc-950 hover:bg-zinc-900 transition-colors border border-dashed border-zinc-700 text-left rounded-none mb-1 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono tracking-tight">
                    + Add "{cleanQuery}"
                  </span>
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-none">
                    CUSTOM TICKER
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                  Directly track ticker across market data streamer
                </div>
              </div>
              <div className="p-1 rounded-none bg-emerald-900 text-emerald-200 group-hover:bg-emerald-400 group-hover:text-black transition-colors">
                <Plus size={13} />
              </div>
            </button>
          )}

          {results.map((result) => (
            <button
              key={result.symbol}
              onClick={() => submitAdd(result.symbol)}
              className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-950 transition-colors border border-transparent hover:border-zinc-800 group text-left rounded-none"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">{result.symbol}</span>
                  {result.sector && (
                    <span className="text-[9px] px-1 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-none">
                      {result.sector}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                  {result.name} ({result.exchange})
                </div>
              </div>
              <div className="p-1 rounded-none bg-zinc-900 text-zinc-400 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-800 group-hover:border-white">
                <Plus size={13} />
              </div>
            </button>
          ))}

          {!loading && results.length === 0 && !canDirectAdd && (
            <div className="text-xs text-zinc-500 py-6 text-center">
              No matching assets found. Enter ticker directly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
