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
  LayoutDashboard,
  Target,
  WalletCards,
  PieChart,
  Shield,
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

  const pageMeta: Record<
    string,
    { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Net Worth & Wealth Overview',
      icon: LayoutDashboard,
    },
    expenses: {
      title: 'Transactions',
      subtitle: 'Expense, Income & Transfer Logs',
      icon: Receipt,
    },
    budgeting: {
      title: 'Budgeting',
      subtitle: 'Monthly Category Ceilings & Live Runway',
      icon: Target,
    },
    accounts: {
      title: 'Accounts & Wallets',
      subtitle: 'Bank Accounts, Cash & Credit Cards',
      icon: WalletCards,
    },
    investments: {
      title: 'Portfolio & Assets',
      subtitle: 'Crypto, Stocks, RDPU & ETFs',
      icon: TrendingUp,
    },
    stats: {
      title: 'Analytics & Reports',
      subtitle: 'Cash Flow & Asset Allocation',
      icon: PieChart,
    },
    admin: {
      title: 'Admin Console',
      subtitle: 'Users & System Configuration',
      icon: Shield,
    },
  };

  const currentMeta = pageMeta[activeTab] || pageMeta.dashboard;
  const PageIcon = currentMeta.icon;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#0b0f17]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-[#1c2436] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45)] flex items-center px-3 sm:px-5 lg:px-6 transition-colors select-none">
      <div className="flex items-center justify-between w-full gap-3">
        {/* Left: Mobile Menu Trigger + Page Icon Badge + Two-Line Contextual Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden flex items-center justify-center w-8 h-8 text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white rounded-lg bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] border border-slate-200/80 dark:border-[#222c40] active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 min-w-0"
            >
              {/* Active Page Icon Emblem */}
              <div className="hidden sm:flex w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-400/20 items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <PageIcon className="w-4 h-4 stroke-[2]" />
              </div>

              {/* Stacked Title & Subtitle */}
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                  {currentMeta.title}
                </h1>
                <p className="hidden sm:block text-[11px] text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
                  {currentMeta.subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Action Suite: Clean Uniform Fintech Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Google Sheets Sync Action Button */}
          <button
            type="button"
            onClick={() => setIsGoogleSheetSetupOpen(true)}
            title={
              isAppsScriptConnected
                ? 'Connected to Google Sheets via Apps Script'
                : isSheetsConnected
                ? `Connected to Sheet ID: ${spreadsheetId}`
                : 'Connect Google Sheets via Apps Script'
            }
            className={`h-8 px-2.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap border ${
              isAppsScriptConnected || isSheetsConnected
                ? 'bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-[#222c40]'
                : 'bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] text-slate-500 dark:text-zinc-400 border-slate-200/80 dark:border-[#222c40]'
            }`}
          >
            <span className="relative flex items-center justify-center">
              <FileSpreadsheet
                className={`w-3.5 h-3.5 shrink-0 ${
                  isAppsScriptConnected || isSheetsConnected
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-zinc-500'
                }`}
              />
              {(isAppsScriptConnected || isSheetsConnected) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-[#131926]" />
              )}
            </span>
            <span className="hidden sm:inline">
              {isAppsScriptConnected || isSheetsConnected ? 'Sheets' : 'Connect'}
            </span>
          </button>

          {/* Privacy Mode Icon Toggle */}
          <button
            type="button"
            onClick={togglePrivacyMode}
            title={
              isPrivacyMode
                ? 'Privacy Mode ON: Currency values are hidden. Click to show.'
                : 'Privacy Mode OFF: Click to hide currency values.'
            }
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer border ${
              isPrivacyMode
                ? 'bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-400/30'
                : 'bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border-slate-200/80 dark:border-[#222c40]'
            }`}
            aria-label="Toggle Privacy Mode"
          >
            {isPrivacyMode ? (
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          {/* Theme Switcher Icon Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] border border-slate-200/80 dark:border-[#222c40] active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle Theme Mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            )}
          </button>

          {/* Subtle Vertical Divider */}
          <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-[#1e2738] mx-0.5" />

          {/* User Profile Menu Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`h-8 flex items-center gap-1.5 pl-1 pr-2 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 dark:bg-[#131926] dark:hover:bg-[#1a2234] border transition-all active:scale-95 cursor-pointer ${
                isUserMenuOpen
                  ? 'border-emerald-500/50 ring-2 ring-emerald-500/15'
                  : 'border-slate-200/80 dark:border-[#222c40]'
              }`}
              title="User Profile Menu"
            >
              <div className="w-6 h-6 rounded-md bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold flex items-center justify-center text-[10px] font-mono">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'WT'}
              </div>
              <span className="hidden xl:inline-block text-xs font-medium text-slate-700 dark:text-zinc-200 max-w-[90px] truncate">
                {user?.name ? user.name.split(' ')[0] : 'Account'}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${
                  isUserMenuOpen ? 'rotate-180 text-emerald-500 dark:text-emerald-400' : ''
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
