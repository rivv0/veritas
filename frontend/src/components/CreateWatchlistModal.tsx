'use client';

import { useState } from 'react';
import { Layers, X, Plus, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, initialSymbols?: string[]) => void;
}

const POPULAR_SYMBOLS = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'TATAMOTORS',
  'SBIN',
  'BHARTIARTL',
  'ZOMATO',
  'NVDA',
  'AAPL',
];

export function CreateWatchlistModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['RELIANCE', 'TCS']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(name.trim(), selectedSymbols);
      setName('');
      setSelectedSymbols(['RELIANCE', 'TCS']);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md bg-[#09090b] border border-zinc-700 rounded-none p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white text-black rounded-none font-mono">
              <Layers size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Create Watchlist
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">Build a customized asset portfolio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Watchlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CORE VALUE, ALPHA TECH..."
              className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-none text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white font-mono transition-colors"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Select Starting Assets (Optional)
            </label>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
              {POPULAR_SYMBOLS.map((sym) => {
                const isSelected = selectedSymbols.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymbol(sym)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-mono font-medium border transition-colors ${
                      isSelected
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {isSelected ? <Check size={11} className="text-black" /> : <Plus size={11} />}
                    <span>{sym}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-none text-xs font-mono text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-1.5 rounded-none text-xs font-mono font-bold bg-white hover:bg-zinc-200 text-black border border-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE LIST'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
