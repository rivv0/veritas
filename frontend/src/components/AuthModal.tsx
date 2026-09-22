'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api, getDeviceId, clearDeviceId } from '@/lib/api';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync internal mode with store mode when modal opens
  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must contain at least one letter and one number');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setAuth(res.user, res.accessToken);
        closeAuthModal();
      } else {
        const guestDeviceId = getDeviceId();
        const res = await api.signup({
          email,
          password,
          name: name.trim(),
          guestDeviceId,
        });
        clearDeviceId(); // Guest watchlists & alerts have migrated
        setAuth(res.user, res.accessToken);
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#121824] border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glowing ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              VERITAS Terminal
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Create Trader Account'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login'
              ? 'Sign in to access your synchronized watchlists, alerts, and market signals.'
              : 'Save custom watchlists, configure high-frequency alerts, and sync across devices.'}
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#0d121c] rounded-xl mb-6 border border-gray-800/60">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2 text-xs font-medium rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-[#1b2333] text-white shadow-sm font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`py-2 text-xs font-medium rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#1b2333] text-white shadow-sm font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Guest migration prompt for signups */}
        {mode === 'signup' && (
          <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-emerald-300">
              Your guest watchlists and telemetry settings will be automatically migrated to this account.
            </p>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start space-x-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Hunter"
                  className="w-full bg-[#0b0f17] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@groww.in"
                className="w-full bg-[#0b0f17] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters with numbers"
                className="w-full bg-[#0b0f17] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#0b0f17] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Terminal' : 'Create Trader Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-gray-500">
          Protected by VERITAS End-to-End Cryptographic Session Tokens.
        </div>
      </div>
    </div>
  );
}
