import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
  X,
  Share2,
  PlusSquare,
  ShieldCheck,
  Flame,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useAuth } from '../../context/AuthContext';
import { defaultFirebaseConfig } from '../../lib/defaultFirebaseConfig';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  useAuth();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isRefreshingUi, setIsRefreshingUi] = useState(false);

  const apkDownloadUrl = 'https://github.com/davinwjy/ExpensesTracker/releases';

  if (!isOpen) return null;

  const handlePwaInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => onClose(), 2000);
    }
  };

  const handleForceRefreshUi = async () => {
    setIsRefreshingUi(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // ignore errors
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#12151d] border-t sm:border border-slate-200 dark:border-[#262c3a] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#090b10]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-[#202532] bg-slate-50 dark:bg-[#0e1118] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">WEALTHTRACK MOBILE APP</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                  ANDROID & iOS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">Local Device Installation & Real-Time Replication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-[#1c212e] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-100 dark:bg-[#0e1118] border-b border-slate-200 dark:border-[#162c52] flex items-center justify-between gap-2 text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="truncate">
              <strong>REPLICATION STATUS:</strong> CONNECTED TO{' '}
              <span className="font-mono text-slate-800 dark:text-zinc-200">{defaultFirebaseConfig?.projectId || 'expenses-tracker-davin'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleForceRefreshUi}
            disabled={isRefreshingUi}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
            title="Clear cached UI and reload latest version"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshingUi ? 'animate-spin' : ''}`} />
            <span>Update UI</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {/* Tabs: PWA 1-Click vs Direct APK */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#090b10] border border-slate-200 dark:border-[#162c52] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pwa'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PWA DEPLOYMENT</span>
            </button>
            <button
              onClick={() => setActiveTab('apk')}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'apk'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Standalone APK File</span>
            </button>
          </div>

          {activeTab === 'pwa' ? (
            <div className="space-y-3.5">
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#162c52] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Direct 1-Click Installation</h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      The easiest path for Android & iPhone. Installed directly onto your home screen with full app icon support, fullscreen view, and instant live UI updates.
                    </p>
                  </div>
                </div>

                {/* Android / Desktop Prompt Button */}
                {isInstallable && (
                  <button
                    onClick={handlePwaInstall}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Install App to Home Screen</span>
                  </button>
                )}

                {installSuccess && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>App successfully installed on your device!</span>
                  </div>
                )}

                {/* Instructions for Android Chrome */}
                {!isInstallable && !isIOS && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#162c52] text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">How to install in Google Chrome (Android):</p>
                    <ol className="space-y-1 text-slate-600 dark:text-slate-400 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                      <li>Open this website in Google Chrome on your device.</li>
                      <li>Tap the three dots icon (<strong>⋮</strong>) in the top right corner.</li>
                      <li>Select <strong>"Add to Home Screen"</strong> (or <strong>"Install app"</strong>).</li>
                      <li>WealthTrack is now ready in your app drawer with real-time UI updates!</li>
                    </ol>
                  </div>
                )}

                {/* iOS Instructions */}
                {isIOS && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#162c52] text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">How to install in Safari (iPhone / iPad):</p>
                    <ol className="space-y-1 text-slate-600 dark:text-slate-400 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                      <li className="flex items-center gap-1">
                        <span>1. Tap the</span>
                        <Share2 className="w-3.5 h-3.5 text-sky-500 inline" />
                        <span><strong>Share</strong> button at the bottom of Safari.</span>
                      </li>
                      <li className="flex items-center gap-1">
                        <span>2. Scroll down and tap</span>
                        <PlusSquare className="w-3.5 h-3.5 text-indigo-500 inline" />
                        <span><strong>Add to Home Screen</strong>.</span>
                      </li>
                      <li>3. Tap <strong>Add</strong> in the top right corner.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#162c52] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Download Standalone APK File</h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Native Android package (.apk) automatically built from your repository whenever changes are pushed to GitHub.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-[#12151d] border border-slate-200 dark:border-[#202532] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">File Name:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">WealthTrack-Pro.apk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Package ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">com.wealthtrack.app</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Android Support:</span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">Android 8.0 up to Android 15</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Direct APK Download Button */}
                  <a
                    href={apkDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Standalone APK File</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>

                  {/* APK URL Section */}
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#12151d] border border-slate-200 dark:border-[#202532] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-zinc-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                        APK Direct Link:
                      </span>
                    </div>

                    <div className="p-2 rounded bg-white dark:bg-[#090b10] border border-slate-300 dark:border-[#162c52] text-[10px] font-mono text-indigo-600 dark:text-indigo-400 break-all select-all">
                      {apkDownloadUrl}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 border-t border-slate-200 dark:border-[#162c52]">
                      <span>GitHub Repository:</span>
                      <a
                        href="https://github.com/davinwjy/ExpensesTracker/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 underline inline-flex items-center gap-1"
                      >
                        <span>Releases Page</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Guarantee Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#162c52] flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[11px]">
              <strong>100% Automatic Sync:</strong> Ledger balances, transactions, and investments reflect instantly across all your devices.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#162c52] bg-slate-50 dark:bg-[#090b10] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleForceRefreshUi}
            disabled={isRefreshingUi}
            className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingUi ? 'animate-spin' : ''}`} />
            <span>Force Reload UI</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-200 hover:bg-slate-300 dark:bg-[#1c212e] dark:hover:bg-[#232939] rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
