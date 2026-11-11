import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { APPS_SCRIPT_TEMPLATE_CODE } from '../lib/appsScriptService';

export const GoogleSheetConnectBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { appsScriptUrl, setIsGoogleSheetSetupOpen, showNotification } = useFinance();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check user-specific dismissal preference
  useEffect(() => {
    if (!user?.id) return;
    try {
      const dismissed = localStorage.getItem(`wealthtrack_hide_gsheet_banner_${user.id}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  // If already connected, or not logged in, or explicitly dismissed, do not render
  if (!isAuthenticated || appsScriptUrl || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (user?.id) {
      try {
        localStorage.setItem(`wealthtrack_hide_gsheet_banner_${user.id}`, 'true');
      } catch {
        // ignore
      }
    }
  };

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
      setIsCopied(true);
      showNotification({
        title: 'Kode Apps Script Disalin!',
        message: 'Silakan paste di menu Extensions -> Apps Script pada Google Sheet Anda.',
        type: 'success',
      });
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleOpenSetupModal = () => {
    setIsGoogleSheetSetupOpen(true);
  };

  return (
    <div className="relative mb-5 overflow-hidden rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-[#0d1017] dark:to-[#0d1017] p-4 sm:p-5 shadow-xs transition-all duration-300">
      {/* Background Subtle Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />

      {/* Main Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <FileSpreadsheet className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Google Sheet Belum Terhubung ke Akun Anda</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                  Cloud Binding
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Hubungkan Google Apps Script untuk mencadangkan seluruh data transaksi & investasi secara otomatis. Link akan langsung terikat ke akun <strong className="text-slate-900 dark:text-zinc-200">{user?.email}</strong> di semua perangkat.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:text-slate-300 dark:border-slate-700/60 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <span>{isExpanded ? 'Tutup Panduan' : 'Lihat Langkah Cepat'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleOpenSetupModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>Hubungkan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            title="Sembunyikan banner"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable Step-by-Step Walkthrough */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 pb-1">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>3 Langkah Mudah Menghubungkan Google Sheet:</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">Hanya perlu 1x setup</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 space-y-2 flex flex-col justify-between shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Salin Script</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                  Buka Google Sheet Anda &rarr; Klik menu <b>Extensions</b> &rarr; <b>Apps Script</b> &rarr; Tempel kode ini.
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/30 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{isCopied ? 'Kode Script Tersalin!' : 'Salin Kode Apps Script'}</span>
              </button>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  2
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Deploy Web App</span>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-zinc-400 space-y-1 leading-normal list-disc list-inside">
                <li>Klik <b>Deploy &rarr; New deployment</b></li>
                <li>Pilih tipe: <b>Web app</b></li>
                <li>Execute as: <b>Me</b></li>
                <li>Who has access: <b className="text-emerald-700 dark:text-emerald-400">Anyone</b></li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 space-y-2 flex flex-col justify-between shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    3
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Bind ke Akun</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                  Salin Web App URL dan tempel ke dialog koneksi. URL otomatis terikat ke akun cloud Anda selamanya.
                </p>
              </div>

              <button
                onClick={handleOpenSetupModal}
                className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Masukkan URL &rarr;</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Koneksi aman langsung antar browser/APK dan Google Sheet pribadi Anda tanpa server pihak ketiga.</span>
          </div>
        </div>
      )}
    </div>
  );
};
