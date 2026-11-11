import React, { useEffect } from 'react';
import {
  CheckCircle2,
  X,
  ArrowDownRight,
  Receipt,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr } from '../lib/formatters';

export const GlobalNotificationPopup: React.FC = () => {
  const { notification, closeNotification } = useFinance();

  // Play identical soft completion chime sound on notification activation
  useEffect(() => {
    if (!notification) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // First tone (C5 - 523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Second tone (E5 - 659.25 Hz) slightly offset for a gentle arpeggio chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.14, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close();
        } catch {}
      }, 450);
    } catch {
      // Audio playback restrictions or unhandled context
    }

    // Auto-dismiss popup after 2.5 seconds (2500ms)
    const duration = notification.durationMs || 2500;
    const timer = setTimeout(() => {
      closeNotification();
    }, duration);

    return () => clearTimeout(timer);
  }, [notification, closeNotification]);

  if (!notification) return null;

  const isExpense = notification.txType === 'expense';
  const isIncome = notification.txType === 'income';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 pointer-events-auto max-w-[92vw] sm:max-w-md"
    >
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl backdrop-blur-md border text-xs font-medium tracking-tight transition-all ${
          isExpense
            ? 'bg-white/95 dark:bg-[#0d1017]/95 text-slate-800 dark:text-zinc-100 border-rose-500/40 shadow-rose-500/10'
            : isIncome
            ? 'bg-white/95 dark:bg-[#0d1017]/95 text-slate-800 dark:text-zinc-100 border-emerald-500/40 shadow-emerald-500/10'
            : notification.type === 'error'
            ? 'bg-white/95 dark:bg-[#0d1017]/95 text-slate-800 dark:text-zinc-100 border-rose-500/50 shadow-rose-500/10'
            : 'bg-white/95 dark:bg-[#0d1017]/95 text-slate-800 dark:text-zinc-100 border-emerald-500/30 shadow-emerald-500/10'
        }`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {isExpense ? (
            <Receipt className="w-4 h-4 text-rose-500" />
          ) : isIncome ? (
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          ) : notification.type === 'info' ? (
            <Info className="w-4 h-4 text-cyan-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>

        {/* Title + Amount inline text */}
        <div className="truncate flex items-center gap-1.5 max-w-[260px] sm:max-w-[340px]">
          <span className="font-semibold text-slate-900 dark:text-zinc-100 truncate">
            {notification.title}
          </span>
          {notification.accountName && (
            <span className="text-slate-500 dark:text-zinc-400 truncate text-[11px]">
              ({notification.accountName})
            </span>
          )}
          {notification.category && !notification.accountName && (
            <span className="text-slate-500 dark:text-zinc-400 truncate text-[11px]">
              ({notification.category})
            </span>
          )}
          {notification.amount !== undefined && (
            <span
              className={`font-mono font-bold tabular-nums shrink-0 text-[11px] px-1.5 py-0.2 rounded ${
                isExpense
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                  : isIncome
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800'
              }`}
            >
              {isExpense ? '-' : isIncome ? '+' : ''}
              {formatIdr(notification.amount)}
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={closeNotification}
          className="p-0.5 rounded-full text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer shrink-0 ml-0.5"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
