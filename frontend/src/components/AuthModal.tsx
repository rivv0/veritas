'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api, getDeviceId, clearDeviceId } from '@/lib/api';
import { X, Loader2 } from 'lucide-react';

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (authModalMode === 'forgot') {
      setMode('forgot');
    } else if (authModalMode === 'signup') {
      setMode('signup');
    } else {
      setMode('login');
    }
    setError(null);
    setSuccess(null);
    setGeneratedCode(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Name is required');
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
        clearDeviceId();
        setAuth(res.user, res.accessToken);
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.resetCode) {
        setGeneratedCode(res.resetCode);
        setResetCode(res.resetCode);
      } else {
        setGeneratedCode(null);
        setResetCode('');
      }
      setSuccess(res.message || 'Verification code sent if account exists.');
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!resetCode.trim()) {
      setError('Verification code is required');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one letter and one number');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: email.trim(),
        token: resetCode.trim(),
        newPassword,
      });
      setSuccess(res.message || 'Password reset successful. Please sign in.');
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
      setGeneratedCode(null);
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm bg-black border border-zinc-800 p-6 text-white max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">
            Terminal Access
          </div>
          <h2 className="text-lg font-mono font-semibold tracking-tight text-white uppercase">
            {mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Register'
              : mode === 'forgot'
              ? 'Reset Password'
              : 'New Password'}
          </h2>
        </div>

        {/* Mode Switcher Tabs */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex border-b border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'text-white border-b-2 border-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'text-white border-b-2 border-white font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-2.5 bg-zinc-950 border border-red-900/60 text-red-400 text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2.5 bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs font-mono leading-relaxed">
            {success}
          </div>
        )}

        {/* Generated Demo Code */}
        {generatedCode && mode === 'reset' && (
          <div className="mb-4 p-3 bg-zinc-950 border border-zinc-700 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400">
              <span>Verification Code (Demo)</span>
              <button
                type="button"
                onClick={() => handleCopyCode(generatedCode)}
                className="text-white hover:underline uppercase cursor-pointer"
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="text-xl font-mono font-bold tracking-widest text-white">
              {generatedCode}
            </div>
          </div>
        )}

        {/* Login & Signup Form */}
        {(mode === 'login' || mode === 'signup') && (
          <form onSubmit={handleLoginOrSignup} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Trader Name"
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 text-xs font-mono uppercase tracking-wider font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 text-xs font-mono uppercase tracking-wider font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending</span>
                </>
              ) : (
                <span>Send Code</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className="w-full py-1 text-xs font-mono text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white font-mono tracking-widest placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat New Password"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 text-xs font-mono uppercase tracking-wider font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className="w-full py-1 text-xs font-mono text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
