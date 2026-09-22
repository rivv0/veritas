'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { User, LogOut, ShieldAlert, ChevronDown, Sparkles } from 'lucide-react';

export function UserProfileMenu() {
  const { user, openAuthModal, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRevokeAll = async () => {
    if (!confirm('This will invalidate all active sessions across all your browsers and devices. Continue?')) {
      return;
    }
    setRevoking(true);
    try {
      await api.revokeAllSessions();
      await logout();
      alert('All active sessions have been revoked. Please sign in again.');
    } catch (e: any) {
      alert(e.message || 'Failed to revoke sessions');
    } finally {
      setRevoking(false);
      setDropdownOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-medium text-amber-300">Guest Mode</span>
        </div>
        <button
          onClick={() => openAuthModal('login')}
          className="px-3.5 py-1.5 bg-[#172033] hover:bg-[#1e2a42] border border-gray-700/60 hover:border-emerald-500/50 text-xs font-semibold text-white rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
        >
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sign In</span>
        </button>
        <button
          onClick={() => openAuthModal('signup')}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 rounded-lg transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Register</span>
        </button>
      </div>
    );
  }

  // Generate 2 initials from user name
  const initials = user.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TR';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2.5 p-1 sm:pr-3 bg-[#111724] hover:bg-[#182030] border border-gray-800 hover:border-gray-700 rounded-full transition-all cursor-pointer"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-black font-bold text-xs flex items-center justify-center shadow-md">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-white leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium leading-none mt-0.5">
            PRO TRADER
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#121824] border border-gray-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2.5 border-b border-gray-800/80">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              {user.role} Tier Active
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={handleRevokeAll}
              disabled={revoking}
              className="w-full px-4 py-2 text-left text-xs text-amber-300 hover:bg-amber-500/10 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Revoke All Other Sessions</span>
            </button>

            <button
              onClick={async () => {
                setDropdownOpen(false);
                await logout();
              }}
              className="w-full px-4 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
