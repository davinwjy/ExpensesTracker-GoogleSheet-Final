import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, ExternalLink, Code2, Send } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { APPS_SCRIPT_TEMPLATE_CODE, getStoredAppsScriptUrl, isEmailExplicitlyDisconnected } from '../../lib/appsScriptService';

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

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        if (isEmailExplicitlyDisconnected(user?.email)) {
          setInputUrl('');
          return;
        }

        if (appsScriptUrl) {
          setInputUrl(appsScriptUrl);
        } else if (user?.email) {
          const prefilled = getStoredAppsScriptUrl(user.email);
          setInputUrl(prefilled || '');
        } else {
          setInputUrl('');
        }
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, appsScriptUrl, user?.email]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE_CODE);
      setIsCopied(true);
      showNotification({
        title: 'Apps Script Code Copied',
        message: 'Paste it into Extensions -> Apps Script in your Google Sheet.',
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
        text: 'Please enter a valid Google Apps Script Web App URL (starting with https://script.google.com/macros/s/...)',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      await setAppsScriptUrl(trimmed);
      setStatusMessage({
        type: 'success',
        text: `Google Apps Script connected and linked to ${user?.email || 'your account'}! Data is synced automatically.`,
      });
      showNotification({
        title: 'Google Sheet Linked to Account',
        message: `Web App URL has been saved to cloud account ${user?.email || ''}.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Apps Script setup error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to connect to Apps Script URL. Make sure "Who has access" is set to "Anyone".',
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
        text: 'Google Apps Script connection has been disconnected from this account.',
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
        text: 'Data successfully synced from Google Sheet!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to perform manual sync.',
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
        text: `Migration Complete! ${counts.expenses} Transactions, ${counts.accounts} Accounts, ${counts.investments} Investments, and ${counts.budgets} Budgets pushed to Google Sheet.`,
      });
    } catch (err: any) {
      console.error('Push data error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to push data to Google Sheet. Make sure your Apps Script Web App is connected.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-[#12151d] border border-slate-200 dark:border-[#262c3a] rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-[#202532] bg-slate-50/80 dark:bg-[#0e1118]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Google Sheet Connection via Apps Script</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Save all inputs, updates & deletions directly to Google Sheets without complex OAuth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1c212e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Connection Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isAppsScriptConnected 
              ? 'bg-slate-50 border-slate-200 dark:bg-[#171b26] dark:border-[#2b3242]'
              : 'bg-amber-50/80 border-amber-200 dark:bg-[#171b26] dark:border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {isAppsScriptConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                  {isAppsScriptConnected ? 'Google Apps Script Connected & Active' : 'Apps Script Not Connected'}
                </p>
                <p className="text-slate-600 dark:text-zinc-400 font-mono break-all text-[11px] sm:text-xs">
                  {isAppsScriptConnected
                    ? `Web App URL: ${appsScriptUrl.slice(0, 42)}...`
                    : 'Follow the 3 simple steps below to connect your Google Sheet via Apps Script.'}
                </p>
                {isAppsScriptConnected && user?.email && (
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium pt-0.5 flex items-center gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    <span>Linked to account: <strong className="text-slate-900 dark:text-zinc-100">{user.email}</strong> (automatically synced)</span>
                  </p>
                )}
              </div>
            </div>

            {isAppsScriptConnected && (
              <button
                onClick={handleDisconnect}
                className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                Disconnect
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
                : 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-300 font-medium'
            }`}>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Copy Apps Script Code */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#202532]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
                <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold shrink-0">1</span>
                <span>Copy Google Apps Script Code</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#1c212e] dark:hover:bg-[#232939] dark:text-zinc-200 dark:border-[#2b3242] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                <span>{isCopied ? 'Copied!' : 'Copy Script Code'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Open your Google Sheet &rarr; Click <b>Extensions</b> &rarr; <b>Apps Script</b> &rarr; Delete any existing code and <b>Paste this code</b>.
            </p>
          </div>

          {/* Step 2: Deployment Instructions */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#202532] text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-zinc-100 text-sm mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold shrink-0">2</span>
              <span>Deploy as Web App</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-zinc-400 pl-1">
              <li>Click <b>Deploy &rarr; New deployment</b> in Apps Script.</li>
              <li>Select deployment type: <b>Web app</b>.</li>
              <li>Set <i>Execute as</i>: <b>Me</b>, and <i>Who has access</i>: <b className="text-indigo-600 dark:text-indigo-400">Anyone</b>.</li>
              <li>Click <b>Deploy</b> and copy the <b>Web App URL</b>.</li>
            </ol>
          </div>

          {/* Step 3: Input Web App URL */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#202532]">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
              <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center font-bold shrink-0">3</span>
              <span>Enter Web App URL</span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#090b10] border border-slate-300 dark:border-[#262c3a] rounded-xl text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono shadow-xs"
              />

              {user?.email?.toLowerCase() === 'davinwijaya16@gmail.com' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-300 font-medium pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Account davinwijaya16@gmail.com is linked to auto pre-filled Web App URL configuration.</span>
                </div>
              )}

              <button
                onClick={handleSaveAndTest}
                disabled={isTesting || !inputUrl.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testing Apps Script Connection...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Connect & Test Google Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Migration / Push Firebase Data to Google Sheet */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-[#202532] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Push Firebase / Local Data to Google Sheet</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">Auto Export</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">
              Transfer or copy all existing transactions, accounts, investments & budgets from Firebase / local storage to your newly connected Google Sheet.
            </p>
            <button
              onClick={handlePushFirebaseData}
              disabled={isPushing || (!isAppsScriptConnected && !inputUrl.trim())}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-slate-300 dark:bg-[#1c212e] dark:hover:bg-[#232939] dark:border-[#2b3242] dark:text-indigo-400 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>Pushing Firebase Data to Google Sheet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Push All Firebase Data to Google Sheet</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Sync Trigger */}
          {isAppsScriptConnected && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#202532]">
              <span className="text-xs text-slate-500 dark:text-zinc-400">Apps Script Connection Active</span>
              <button
                onClick={handleManualSync}
                disabled={isAppsScriptSyncing}
                className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-[#1c212e] dark:hover:bg-[#232939] dark:text-zinc-200 dark:border-[#2b3242] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAppsScriptSyncing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span>Sync Data Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
