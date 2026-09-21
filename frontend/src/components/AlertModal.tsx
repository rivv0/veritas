'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, Power, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { fetchAlerts, createAlert, toggleAlert, deleteAlert } from '@/lib/api';
import type { Alert, AlertCondition } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  availableSymbols?: string[];
  currentPrice?: number;
}

export function AlertModal({
  isOpen,
  onClose,
  defaultSymbol = 'GROWW',
  availableSymbols = [],
  currentPrice,
}: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [condition, setCondition] = useState<AlertCondition>('ABOVE');
  const [threshold, setThreshold] = useState<string>(
    currentPrice ? String(Number((currentPrice * 1.02).toFixed(2))) : '100'
  );

  // Composite market condition state
  const [useMarketFilter, setUseMarketFilter] = useState(false);
  const [marketIndex, setMarketIndex] = useState<'SPX' | 'NIFTY' | 'IT' | 'BANK'>('NIFTY');
  const [marketCondition, setMarketCondition] = useState<'GREEN' | 'RED' | 'ABOVE' | 'BELOW'>('GREEN');
  const [marketValue, setMarketValue] = useState<string>('0');

  useEffect(() => {
    if (defaultSymbol) {
      setSymbol(defaultSymbol);
    }
    if (currentPrice) {
      setThreshold(String(Number((currentPrice * 1.02).toFixed(2))));
    }
  }, [defaultSymbol, currentPrice]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts();
      if (res.success && Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid threshold value');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        symbol: symbol.toUpperCase(),
        condition,
        threshold: val,
      };

      if (useMarketFilter) {
        payload.marketFilter = {
          index: marketIndex,
          condition: marketCondition,
          value: marketCondition === 'ABOVE' || marketCondition === 'BELOW' ? parseFloat(marketValue) || 0 : undefined,
        };
      }

      const res = await createAlert(payload);
      if (res.success && res.data) {
        setAlerts((prev) => [res.data, ...prev]);
        // Reset or adjust threshold for convenience
        setThreshold(currentPrice ? String(Number((currentPrice * 1.05).toFixed(2))) : '');
        setUseMarketFilter(false);
      } else {
        setError(res.error || 'Failed to create alert');
      }
    } catch (err: any) {
      setError(err.message || 'Network error creating alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await toggleAlert(id);
      if (res.success && res.data) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteAlert(id);
      if (res.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const curr = getCurrencySymbol(symbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="bg-[#09090b] border border-zinc-700 w-full max-w-xl shadow-[0_12px_50px_rgba(0,0,0,0.95)] rounded-none overflow-hidden text-zinc-100 divide-y divide-zinc-800">
        
        {/* Modal Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-white" />
            <h2 className="font-mono font-bold text-sm text-white tracking-wider uppercase">
              Price & Market-Condition Alerts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 transition-colors focus:outline-none"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create Alert Form */}
        <form onSubmit={handleCreate} className="p-4 space-y-3 font-mono">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
            Configure New Alert Rule
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Symbol Selection */}
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase mb-1">Asset</label>
              {availableSymbols.length > 0 ? (
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white rounded-none focus:border-zinc-500 focus:outline-none cursor-pointer"
                >
                  {availableSymbols.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white rounded-none focus:border-zinc-500 focus:outline-none"
                  placeholder="e.g. RELIANCE.NS"
                />
              )}
            </div>

            {/* Condition Type */}
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AlertCondition)}
                className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white rounded-none focus:border-zinc-500 focus:outline-none cursor-pointer"
              >
                <option value="ABOVE">Crosses Above (&gt;=)</option>
                <option value="BELOW">Crosses Below (&lt;=)</option>
                <option value="PCT_CHANGE_UP">+% Day Move (&gt;=)</option>
                <option value="PCT_CHANGE_DOWN">-% Day Drop (&lt;=)</option>
              </select>
            </div>

            {/* Threshold Input */}
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                {condition.startsWith('PCT') ? 'Target %' : `Threshold (${curr})`}
              </label>
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white rounded-none focus:border-zinc-500 focus:outline-none"
                placeholder={condition.startsWith('PCT') ? '2.5' : '150.00'}
              />
            </div>
          </div>

          {/* Optional Composite Market Condition Checkbox */}
          <div className="pt-2 border-t border-zinc-900">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={useMarketFilter}
                onChange={(e) => setUseMarketFilter(e.target.checked)}
                className="w-3.5 h-3.5 bg-zinc-950 border-zinc-700 rounded-none accent-white cursor-pointer"
              />
              <span className="text-[11px] font-medium">
                Add Composite Market Condition (e.g. &quot;{symbol} hits target <strong className="text-white">AND</strong> SPX/NIFTY is green&quot;)
              </span>
            </label>

            {useMarketFilter && (
              <div className="mt-2.5 p-2.5 bg-zinc-950 border border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-in fade-in duration-100">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">Market Benchmark</label>
                  <select
                    value={marketIndex}
                    onChange={(e) => setMarketIndex(e.target.value as any)}
                    className="w-full bg-black border border-zinc-700 px-2 py-1 text-xs text-zinc-200 rounded-none focus:outline-none"
                  >
                    <option value="NIFTY">NIFTY 50</option>
                    <option value="SPX">S&P 500 (SPX)</option>
                    <option value="IT">NIFTY IT</option>
                    <option value="BANK">NIFTY BANK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">Index State</label>
                  <select
                    value={marketCondition}
                    onChange={(e) => setMarketCondition(e.target.value as any)}
                    className="w-full bg-black border border-zinc-700 px-2 py-1 text-xs text-zinc-200 rounded-none focus:outline-none"
                  >
                    <option value="GREEN">Index is Green (&gt; 0%)</option>
                    <option value="RED">Index is Red (&lt; 0%)</option>
                    <option value="ABOVE">Index Above Value</option>
                    <option value="BELOW">Index Below Value</option>
                  </select>
                </div>

                {(marketCondition === 'ABOVE' || marketCondition === 'BELOW') && (
                  <div>
                    <label className="block text-[9px] text-zinc-500 uppercase mb-1">Index Level</label>
                    <input
                      type="number"
                      value={marketValue}
                      onChange={(e) => setMarketValue(e.target.value)}
                      className="w-full bg-black border border-zinc-700 px-2 py-1 text-xs text-zinc-200 rounded-none focus:outline-none"
                      placeholder="e.g. 24500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/80 px-2.5 py-1.5 flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>{submitting ? 'ARMING...' : 'ARM ALERT RULE'}</span>
            </button>
          </div>
        </form>

        {/* Existing Alerts List */}
        <div className="p-4 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
            <span>Configured Alert Rules ({alerts.length})</span>
            {loading && <span className="text-[10px] text-zinc-500 animate-pulse">Syncing...</span>}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 no-scrollbar divide-y divide-zinc-900">
            {alerts.length === 0 && !loading && (
              <div className="py-6 text-center text-zinc-600 text-xs">
                No alert rules configured. Create one above to monitor price targets.
              </div>
            )}

            {alerts.map((alert) => {
              const isTriggered = Boolean(alert.triggeredAt);
              const symbolCurr = getCurrencySymbol(alert.symbol);

              return (
                <div
                  key={alert.id}
                  className={`pt-2 pb-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                    !alert.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white tracking-tight">{alert.symbol}</span>
                      <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 uppercase">
                        {alert.condition === 'ABOVE'
                          ? `≥ ${symbolCurr}${alert.threshold}`
                          : alert.condition === 'BELOW'
                          ? `≤ ${symbolCurr}${alert.threshold}`
                          : alert.condition === 'PCT_CHANGE_UP'
                          ? `+${alert.threshold}%`
                          : `-${alert.threshold}%`}
                      </span>

                      {alert.marketFilter && (
                        <span className="px-1.5 py-0.2 bg-blue-950/60 border border-blue-800/80 text-[9px] text-blue-300 uppercase">
                          + {alert.marketFilter.index} {alert.marketFilter.condition}
                        </span>
                      )}

                      {isTriggered && (
                        <span className="px-1 py-0.2 bg-amber-950 border border-amber-800 text-[9px] text-amber-400 uppercase">
                          TRIGGERED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggle(alert.id)}
                      className={`p-1 border transition-colors ${
                        alert.isActive
                          ? 'border-emerald-800 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70'
                          : 'border-zinc-800 text-zinc-600 bg-zinc-950 hover:text-zinc-400'
                      }`}
                      title={alert.isActive ? 'Pause alert' : 'Activate alert'}
                    >
                      <Power size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-1 border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800 bg-zinc-950 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
