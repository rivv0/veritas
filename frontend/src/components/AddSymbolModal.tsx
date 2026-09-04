'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, X, Sparkles } from 'lucide-react';
import { searchSymbols } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string) => void;
  existingSymbols: string[];
}

export function AddSymbolModal({ isOpen, onClose, onAdd, existingSymbols }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ symbol: string; name: string; exchange: string; sector?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      searchSymbols('')
        .then((res) => {
          if (res.success) {
            setResults(res.data.filter((r: any) => !existingSymbols.includes(r.symbol)));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, existingSymbols.join(',')]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setLoading(true);
    try {
      const res = await searchSymbols(q);
      if (res.success) {
        setResults(res.data.filter((r: any) => !existingSymbols.includes(r.symbol)));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md bg-[#09090b] border border-zinc-700 rounded-none p-5 shadow-2xl space-y-3.5">
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
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search RELIANCE, TATAMOTORS, ZOMATO, NVDA..."
            className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-700 rounded-none text-white placeholder-zinc-600 focus:outline-none focus:border-white text-xs font-mono transition-colors"
            autoFocus
          />
        </div>

        <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
          {query.length > 0 ? 'Search Results' : (
            <>
              <Sparkles size={11} className="text-zinc-400" />
              <span>Trending Market Assets</span>
            </>
          )}
        </div>
        
        <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 divide-y divide-zinc-900 font-mono">
          {loading && <div className="text-xs text-zinc-500 py-6 text-center">Searching directory...</div>}
          {results.map((result) => (
            <button
              key={result.symbol}
              onClick={() => {
                onAdd(result.symbol);
                onClose();
                setQuery('');
              }}
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
                <div className="text-[10px] text-zinc-400 font-sans mt-0.5">{result.name} ({result.exchange})</div>
              </div>
              <div className="p-1 rounded-none bg-zinc-900 text-zinc-400 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-800 group-hover:border-white">
                <Plus size={13} />
              </div>
            </button>
          ))}
          {!loading && results.length === 0 && (
            <div className="text-xs text-zinc-500 py-6 text-center">
              No matching assets found. Enter ticker directly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
