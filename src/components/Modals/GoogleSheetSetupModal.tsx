import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, ExternalLink, Code2, Send } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { APPS_SCRIPT_TEMPLATE_CODE } from '../../lib/appsScriptService';

interface GoogleSheetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetSetupModal: React.FC<GoogleSheetSetupModalProps> = ({ isOpen, onClose }) => {
  const {
    appsScriptUrl,
    setAppsScriptUrl,
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
    }
  }, [appsScriptUrl]);

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
        text: 'Koneksi Google Apps Script berhasil! Tab Expenses, Accounts, Investments, dan Budgets telah diverifikasi.',
      });
      showNotification({
        title: 'Google Sheet Apps Script Terhubung',
        message: 'Data finansial Anda siap disimpan langsung ke Google Sheet.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Koneksi Google Sheet via Apps Script</h3>
              <p className="text-xs text-slate-400">Simpan semua input, update & delete langsung ke Google Sheet tanpa OAuth complex</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Connection Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isAppsScriptConnected 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            {isAppsScriptConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-semibold text-sm">
                {isAppsScriptConnected ? 'Google Apps Script Terhubung & Aktif' : 'Apps Script Belum Dihubungkan'}
              </p>
              <p className="text-slate-300">
                {isAppsScriptConnected
                  ? `Web App URL: ${appsScriptUrl.slice(0, 38)}...`
                  : 'Ikuti 3 langkah mudah di bawah ini untuk menghubungkan Google Sheet Anda dengan Apps Script.'}
              </p>
            </div>
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            }`}>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Copy Apps Script Code */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
                <span>Salin Kode Google Apps Script</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin!' : 'Copy Script Code'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Buka Google Sheet Anda &rarr; Klik menu <b>Extensions</b> &rarr; <b>Apps Script</b> &rarr; Hapus kode lama dan <b>Paste kode ini</b>.
            </p>
          </div>

          {/* Step 2: Deployment Instructions */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>Deploy Sebagai Web App</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
              <li>Klik tombol <b>Deploy &rarr; New deployment</b> di Apps Script.</li>
              <li>Pilih jenis deployment: <b>Web app</b>.</li>
              <li>Set <i>Execute as</i>: <b>Me</b>, dan <i>Who has access</i>: <b className="text-emerald-400">Anyone</b>.</li>
              <li>Klik <b>Deploy</b> lalu Salin <b>Web App URL</b>.</li>
            </ol>
          </div>

          {/* Step 3: Input Web App URL */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
              <span>Masukkan Web App URL</span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />

              <button
                onClick={handleSaveAndTest}
                disabled={isTesting || !inputUrl.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Push Data Firebase / Lokal ke Google Sheet</span>
              <span className="text-[10px] text-emerald-400 font-mono">Ekspor Otomatis</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pindahkan atau salin semua data transaksi, akun, investasi & budget yang ada di Firebase / penyimpanan lokal ke Google Sheet yang baru dihubungkan.
            </p>
            <button
              onClick={handlePushFirebaseData}
              disabled={isPushing || (!isAppsScriptConnected && !inputUrl.trim())}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Mendorong Data Firebase ke Google Sheet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Push Semua Data Firebase ke Google Sheet</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Sync Trigger */}
          {isAppsScriptConnected && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Koneksi Apps Script Aktif</span>
              <button
                onClick={handleManualSync}
                disabled={isAppsScriptSyncing}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAppsScriptSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Sync Data Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
