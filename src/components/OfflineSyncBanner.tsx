import React, { useState } from 'react';
import { WifiOff, RefreshCw, CloudUpload, ShieldAlert, Lock } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingSyncCount, triggerManualSync, showNotification } = useFinance();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
      if (browserOnline) {
        await fetch(window.location.origin + '/manifest.json', {
          method: 'HEAD',
          cache: 'no-store',
        });
        window.dispatchEvent(new Event('online'));
        return;
      }
      showNotification({
        title: 'Still Offline',
        message: 'No active internet connection detected. Please check your Wi-Fi or mobile data.',
        type: 'warning',
        durationMs: 3000,
      });
    } catch {
      showNotification({
        title: 'Still Offline',
        message: 'Unable to reach network. CRUD operations remain locked until connection returns.',
        type: 'warning',
        durationMs: 3000,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Full-screen blocking overlay when device is offline
  if (!isOnline) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-lock-title"
        aria-describedby="offline-lock-desc"
        className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-2xl overflow-hidden font-mono text-slate-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Strip */}
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span
                id="offline-lock-title"
                className="text-xs font-bold uppercase tracking-wider"
              >
                DEVICE OFFLINE · CRUD LOCKED
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
              <Lock className="w-3 h-3" />
              <span>PROTECTED</span>
            </span>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-sans">
                  Internet Connection Required
                </h4>
                <p
                  id="offline-lock-desc"
                  className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-sans"
                >
                  Your device is currently offline. To prevent data conflicts with Firebase Cloud and Google Sheets, all create, edit, and delete operations are temporarily locked.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1b212e] space-y-1.5 text-[11px]">
              <div className="font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                Locked Modules While Offline:
              </div>
              <div className="text-slate-500 dark:text-zinc-400 font-sans">
                Transactions · Accounts & Wallets · Transfers · Investments · Budgets · Categories
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-sans">
                Unlocks automatically when back online
              </span>
              <button
                type="button"
                onClick={handleCheckConnection}
                disabled={isChecking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'CHECKING...' : 'RETRY CONNECTION'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If online and nothing syncing or pending, hide banner
  if (!isSyncing && pendingSyncCount === 0) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sticky top-13 z-15 w-full transition-all duration-200"
    >
      {isSyncing ? (
        <div className="bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            <span className="font-semibold text-emerald-300">
              Syncing financial data to Firebase...
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Cloud Sync Active</span>
        </div>
      ) : pendingSyncCount > 0 ? (
        <div className="bg-cyan-950/90 border-b border-cyan-500/30 text-cyan-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <CloudUpload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-cyan-300">{pendingSyncCount} offline changes</strong> ready to sync to Firebase.
            </span>
          </div>
          <button
            onClick={() => triggerManualSync()}
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-semibold cursor-pointer transition-colors"
          >
            Sync Now
          </button>
        </div>
      ) : null}
    </aside>
  );
};

