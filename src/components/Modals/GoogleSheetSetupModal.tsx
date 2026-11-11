import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, ExternalLink, Code2, Send } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { APPS_SCRIPT_TEMPLATE_CODE, getStoredAppsScriptUrl } from '../../lib/appsScriptService';

interface GoogleSheetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetSetupModal: React.FC<GoogleSheetSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    appsScriptUrl,
    setAppsScriptUrl,
    disconnectAppsScript,
    isAppsScriptConnected,
    syncAppsScriptNow,
    isAppsScriptSyncing,
    pushAllDataToGoogleSheet,
    showNotification,
  } = useFinance();

  const [inputUrl, setInputUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (appsScriptUrl) {
      setInputUrl(appsScriptUrl);
    } else if (user?.email) {
      const prefilled = getStoredAppsScriptUrl(user.email);
      if (prefilled) {
        setInputUrl(prefilled);
      }
    }
  }, [appsScriptUrl, user?.email]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
      setIsCopied(true);
      showNotification({
        title: 'Kode Apps Script Disalin',
        message: 'Silakan paste di Extensions -> Apps Script pada Google Sheet Anda.',
        type: 'success',
      });
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleSaveAndTest = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed || !trimmed.startsWith('https://script.google.com')) {
      setStatusMessage({
        type: 'error',
        text: 'Masukkan URL Google Apps Script Web App yang valid (diawali https://script.google.com/macros/s/...)',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      await setAppsScriptUrl(trimmed);
      setStatusMessage({
        type: 'success',
        text: `Koneksi Google Apps Script berhasil dan terikat ke akun ${user?.email || 'Anda'}! Data tersinkron otomatis.`,
      });
      showNotification({
        title: 'Google Sheet Terikat ke Akun',
        message: `URL Web App berhasil disimpan ke akun cloud ${user?.email || ''}.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Apps Script setup error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal terhubung dengan Apps Script URL. Pastikan pilihan "Who has access" diset ke "Anyone".',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAppsScript();
      setInputUrl('');
      setStatusMessage({
        type: 'info',
        text: 'Koneksi Google Apps Script telah diputus dari akun ini.',
      });
    } catch {
      // ignore
    }
  };

  const handleManualSync = async () => {
    try {
      await syncAppsScriptNow();
      setStatusMessage({
        type: 'success',
        text: 'Data berhasil disinkronkan dari Google Sheet!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal melakukan sinkronisasi manual.',
      });
    }
  };

  const handlePushFirebaseData = async () => {
    setIsPushing(true);
    setStatusMessage(null);
    try {
      const res = await pushAllDataToGoogleSheet();
      const counts = res.pushedCount;
      setStatusMessage({
        type: 'success',
        text: `Migrasi Berhasil! ${counts.expenses} Transaksi, ${counts.accounts} Akun, ${counts.investments} Investasi, dan ${counts.budgets} Budget berhasil di-push ke Google Sheet.`,
      });
    } catch (err: any) {
      console.error('Push data error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal memindahkan data ke Google Sheet. Pastikan Apps Script Web App sudah dihubungkan.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50/80 dark:bg-[#080a0f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Koneksi Google Sheet via Apps Script</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Simpan semua input, update & delete langsung ke Google Sheet tanpa OAuth complex</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Connection Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isAppsScriptConnected 
              ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-50/90 border-amber-300 dark:bg-amber-950/40 dark:border-amber-500/30 text-amber-950 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {isAppsScriptConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                  {isAppsScriptConnected ? 'Google Apps Script Terhubung & Aktif' : 'Apps Script Belum Dihubungkan'}
                </p>
                <p className="text-slate-700 dark:text-zinc-300 font-mono break-all text-[11px] sm:text-xs">
                  {isAppsScriptConnected
                    ? `Web App URL: ${appsScriptUrl.slice(0, 42)}...`
                    : 'Ikuti 3 langkah mudah di bawah ini untuk menghubungkan Google Sheet Anda dengan Apps Script.'}
                </p>
                {isAppsScriptConnected && user?.email && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5 flex items-center gap-1">
                    <span>✓ Terikat ke akun: <strong>{user.email}</strong> (otomatis tersinkron antar perangkat)</span>
                  </p>
                )}
              </div>
            </div>

            {isAppsScriptConnected && (
              <button
                onClick={handleDisconnect}
                className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Putus Koneksi
              </button>
            )}
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-medium'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-300 font-medium'
                : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 text-blue-900 dark:text-blue-300 font-medium'
            }`}>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Copy Apps Script Code */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
                <span>Salin Kode Google Apps Script</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin!' : 'Copy Script Code'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Buka Google Sheet Anda &rarr; Klik menu <b>Extensions</b> &rarr; <b>Apps Script</b> &rarr; Hapus kode lama dan <b>Paste kode ini</b>.
            </p>
          </div>

          {/* Step 2: Deployment Instructions */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-zinc-100 text-sm mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>Deploy Sebagai Web App</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-zinc-400 pl-1">
              <li>Klik tombol <b>Deploy &rarr; New deployment</b> di Apps Script.</li>
              <li>Pilih jenis deployment: <b>Web app</b>.</li>
              <li>Set <i>Execute as</i>: <b>Me</b>, dan <i>Who has access</i>: <b className="text-emerald-700 dark:text-emerald-400">Anyone</b>.</li>
              <li>Klik <b>Deploy</b> lalu Salin <b>Web App URL</b>.</li>
            </ol>
          </div>

          {/* Step 3: Input Web App URL */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
              <span>Masukkan Web App URL</span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono shadow-xs"
              />

              {user?.email?.toLowerCase() === 'davinwijaya16@gmail.com' && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Akun davinwijaya16@gmail.com terhubung ke konfigurasi auto pre-fill Web App URL.</span>
                </div>
              )}

              <button
                onClick={handleSaveAndTest}
                disabled={isTesting || !inputUrl.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menguji Koneksi Apps Script...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Hubungkan & Tes Google Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Migration / Push Firebase Data to Google Sheet */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131722] border border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Push Data Firebase / Lokal ke Google Sheet</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">Ekspor Otomatis</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">
              Pindahkan atau salin semua data transaksi, akun, investasi & budget yang ada di Firebase / penyimpanan lokal ke Google Sheet yang baru dihubungkan.
            </p>
            <button
              onClick={handlePushFirebaseData}
              disabled={isPushing || (!isAppsScriptConnected && !inputUrl.trim())}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-500/40 dark:text-emerald-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Mendorong Data Firebase ke Google Sheet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Push Semua Data Firebase ke Google Sheet</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Sync Trigger */}
          {isAppsScriptConnected && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-zinc-400">Koneksi Apps Script Aktif</span>
              <button
                onClick={handleManualSync}
                disabled={isAppsScriptSyncing}
                className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAppsScriptSyncing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>Sync Data Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
