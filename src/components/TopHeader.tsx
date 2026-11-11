import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Menu,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
  Receipt,
  ArrowDownRight,
  TrendingUp,
  ArrowRightLeft,
  RefreshCw,
  LogOut,
  Sparkles,
  Smartphone,
  Layers,
  WifiOff,
  FileSpreadsheet,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { isUserAdmin } from '../lib/admin';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
}) => {
  const { user, logout, isFirebase } = useAuth();
  const {
    activeTab,
    setActiveTab,
    isOnline,
    isSyncing,
    pendingSyncCount,
    triggerManualSync,
    isPrivacyMode,
    togglePrivacyMode,
    theme,
    toggleTheme,
    refreshData,
    isLoading,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsAddAccountOpen,
    setEditingTransaction,
    setEditingAccount,
    setIsGoogleSheetSetupOpen,
    isAppsScriptConnected,
    syncAppsScriptNow,
    isAppsScriptSyncing,
    isSheetsConnected,
    syncGoogleSheetsNow,
    isSheetsSyncing,
    spreadsheetId,
    setIsMobileAppModalOpen,
    setIsHoldingTypesModalOpen,
  } = useFinance();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isSyncingActive = isLoading || isAppsScriptSyncing || isSheetsSyncing;

  const handleMenuSync = async () => {
    try {
      if (isAppsScriptConnected) {
        await syncAppsScriptNow();
      } else if (isSheetsConnected) {
        await syncGoogleSheetsNow();
      } else {
        await refreshData();
      }
      setIsUserMenuOpen(false);
    } catch (err: any) {
      console.warn('Sync failed:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageMeta: Record<string, { title: string; subtitle: string; tag: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Net Worth & Wealth Overview',
      tag: 'Overview',
    },
    expenses: {
      title: 'Transactions',
      subtitle: 'Expense, Income & Transfer Logs',
      tag: 'Cash Flow',
    },
    budgeting: {
      title: 'Budgeting & Spending Limits',
      subtitle: 'Monthly Category Ceilings & Live Runway Tracking',
      tag: 'Controls',
    },
    accounts: {
      title: 'Accounts & Wallets',
      subtitle: 'Bank Accounts, Cash & E-Wallets',
      tag: 'Liquidity',
    },
    investments: {
      title: 'Portfolio & Assets',
      subtitle: 'Crypto, Stocks, RDPU & Precious Metals',
      tag: 'Investments',
    },
    stats: {
      title: 'Analytics & Reports',
      subtitle: 'Cash Flow Distribution & Asset Allocation',
      tag: 'Insights',
    },
    admin: {
      title: 'Admin Console',
      subtitle: 'Manage Users, davinwijaya16@gmail.com Access & System Settings',
      tag: 'Management',
    },
  };

  const currentMeta = pageMeta[activeTab] || pageMeta.dashboard;

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#080a0f]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1a1f2c] h-13 flex items-center px-3 sm:px-5 lg:px-6 transition-colors">
      <div className="flex items-center justify-between w-full">
        {/* Left: Mobile Menu Trigger + Clean Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#121622] border border-slate-200 dark:border-[#1e2535] transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 flex items-center gap-2"
              >
                <h1 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                  {currentMeta.title}
                </h1>
                <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
                <span className="hidden md:inline-block text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {currentMeta.subtitle}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Action Suite: Theme + Privacy + Cloud + Quick Action + Profile */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1d2433] bg-white dark:bg-[#10141e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle Theme Mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Privacy Shield Toggle */}
          <button
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? 'Privacy Mode Active: All sensitive currency values blurred with CSS filter. Click to reveal.' : 'Privacy Mode Off: Click to blur sensitive currency values.'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isPrivacyMode
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-white dark:bg-[#10141e] border-slate-200 dark:border-[#1d2433] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-[#2a3449]'
            }`}
            aria-label="Toggle Privacy Mode"
          >
            {isPrivacyMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Privacy ON</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Privacy</span>
              </>
            )}
          </button>

          {/* Google Sheets Backend Storage Button */}
          <button
            onClick={() => setIsGoogleSheetSetupOpen(true)}
            title={
              isAppsScriptConnected
                ? 'Connected to Google Sheets via Apps Script'
                : isSheetsConnected
                ? `Connected to Sheet ID: ${spreadsheetId}`
                : 'Connect Google Sheets via Apps Script'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isAppsScriptConnected || isSheetsConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'bg-slate-100 dark:bg-[#10141e] border-slate-200 dark:border-[#1d2433] text-slate-700 dark:text-zinc-300 hover:border-emerald-500/50'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isAppsScriptConnected || isSheetsConnected ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {isAppsScriptConnected || isSheetsConnected ? 'Google Sheet' : 'Connect Sheet'}
            </span>
          </button>

          {/* User Profile Avatar Popover */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#121622] border border-slate-200/70 dark:border-[#1e2535] transition-all cursor-pointer"
              title="User Profile Menu"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-[10px] font-mono shadow-sm">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'WT'}
              </div>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 p-2 bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-[#1e2638] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
                {/* User Header Profile Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111622] border border-slate-200/60 dark:border-[#1c2436] mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm shadow-emerald-500/20">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : 'WT'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {user?.name || 'User Account'}
                        </p>
                        {isUserAdmin(user) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                        {user?.email || 'user@wealthtrack.app'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Menu Options */}
                <div className="space-y-0.5">
                  {/* Google Sheet Sync Settings */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsGoogleSheetSetupOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#141b29] rounded-xl cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium">Google Sheets</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                        isAppsScriptConnected || isSheetsConnected
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {isAppsScriptConnected || isSheetsConnected ? 'Connected' : 'Connect'}
                    </span>
                  </button>

                  {/* Manual Data Sync */}
                  <button
                    onClick={handleMenuSync}
                    disabled={isSyncingActive}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#141b29] rounded-xl cursor-pointer transition-colors disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2.5">
                      <RefreshCw
                        className={`w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0 ${
                          isSyncingActive ? 'animate-spin text-emerald-500' : ''
                        }`}
                      />
                      <span className="font-medium">Sync Data Now</span>
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                      {isSyncingActive ? 'Syncing...' : 'Cloud & Sheet'}
                    </span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-[#1a2233] my-1" />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
