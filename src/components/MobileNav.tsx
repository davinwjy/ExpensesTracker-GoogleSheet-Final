import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  PieChart,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  ArrowDownRight,
  Target,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MobileNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setEditingTransaction,
    isMobileQuickMenuOpen: isQuickMenuOpen,
    setIsMobileQuickMenuOpen: setIsQuickMenuOpen,
  } = useFinance();

  const leftNavTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses' as const, label: 'Transaction', icon: Receipt },
  ];

  const rightNavTabs = [
    { id: 'investments' as const, label: 'Portfolio', icon: TrendingUp },
    { id: 'accounts' as const, label: 'Accounts', icon: WalletCards },
  ];

  return (
    <>
      <AnimatePresence>
        {/* Backdrop */}
        {isQuickMenuOpen && (
          <motion.div
            key="quick-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsQuickMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}

        {/* Streamlined Quick Action Sheet */}
        {isQuickMenuOpen && (
          <motion.div
            key="quick-menu-sheet"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-20 inset-x-4 z-50 p-4 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-2xl shadow-2xl space-y-2.5 max-w-sm mx-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1b212e]">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Quick Actions</span>
              <button
                onClick={() => setIsQuickMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setEditingTransaction(null);
                  setTransactionInitialType('expense');
                  setIsAddExpenseOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121622] dark:hover:bg-[#171d2c] border border-slate-200/80 dark:border-[#1e2638] text-slate-900 dark:text-zinc-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Record Expense</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Deduct from bank or cash</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setEditingTransaction(null);
                  setTransactionInitialType('income');
                  setIsAddExpenseOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121622] dark:hover:bg-[#171d2c] border border-slate-200/80 dark:border-[#1e2638] text-slate-900 dark:text-zinc-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Record Income</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Salary, bonus, freelance deposit</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setTransferInitialMode('bank_to_investment');
                  setIsTransferOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121622] dark:hover:bg-[#171d2c] border border-slate-200/80 dark:border-[#1e2638] text-slate-900 dark:text-zinc-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Bank to Investment</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Directly fund stocks, crypto, USD</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setTransferInitialMode('account_to_account');
                  setIsTransferOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121622] dark:hover:bg-[#171d2c] border border-slate-200/80 dark:border-[#1e2638] text-slate-900 dark:text-zinc-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Account Transfer</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Transfer between accounts</p>
                </div>
              </button>
            </div>

            {/* 1-Tap Workspace Shortcuts for Budgeting & Analytics */}
            <div className="pt-2 border-t border-slate-200 dark:border-[#1b212e] grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setActiveTab('budgeting');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  activeTab === 'budgeting'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#121622] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#1e2638] hover:bg-slate-100'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Budgeting</span>
              </button>

              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setActiveTab('stats');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#121622] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#1e2638] hover:bg-slate-100'
                }`}
              >
                <PieChart className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Analytics</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Glassmorphic Bottom Dock (Visible on Mobile & Tablet < 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-2.5 inset-x-3 sm:inset-x-6 z-30 max-w-md mx-auto rounded-2xl bg-white/95 dark:bg-[#0d111a]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-[#1f293d] shadow-[0_12px_32px_-4px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_40px_-4px_rgba(0,0,0,0.7)] px-2 py-1.5 transition-all select-none"
      >
        <div className="grid grid-cols-5 items-center w-full">
          {leftNavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isQuickMenuOpen) setIsQuickMenuOpen(false);
                  setActiveTab(tab.id);
                }}
                className="group relative w-full min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer active:scale-95 transition-all duration-150 focus:outline-none"
              >
                {/* Active Soft Capsule Background */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-500/5 border border-emerald-500/25 dark:border-emerald-400/25 pointer-events-none"
                  />
                )}

                <div className="relative z-10 flex items-center justify-center w-7 h-6">
                  <Icon
                    className={`w-[19px] h-[19px] shrink-0 transition-all duration-150 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.4] -translate-y-0.5'
                        : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 stroke-[1.9]'
                    }`}
                  />
                </div>

                <span
                  className={`relative z-10 text-[10px] tracking-tight leading-none mt-0.5 truncate max-w-full transition-colors duration-150 ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'text-slate-500 dark:text-zinc-500 font-medium group-hover:text-slate-800 dark:group-hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Active Bottom Dot Indicator */}
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-bottom-dot"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className="relative z-10 mt-1 w-4 h-0.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  />
                )}
              </button>
            );
          })}

          {/* Elevated Floating Center Action Orb */}
          <div className="flex flex-col items-center justify-center w-full h-full">
            <button
              type="button"
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              aria-label="Quick Actions"
              aria-expanded={isQuickMenuOpen}
              className={`relative -mt-6 flex items-center justify-center w-12 h-12 rounded-full ring-4 ring-slate-50 dark:ring-[#08090c] transition-all duration-200 active:scale-90 cursor-pointer focus:outline-none ${
                isQuickMenuOpen
                  ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-950 shadow-xl'
                  : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white dark:text-slate-950 shadow-[0_8px_20px_-2px_rgba(16,185,129,0.55)] hover:brightness-105'
              }`}
            >
              <Plus
                className={`w-5 h-5 stroke-[2.8] transition-transform duration-200 ${
                  isQuickMenuOpen ? 'rotate-45' : 'rotate-0'
                }`}
              />
            </button>
            <span className="text-[9px] font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
              {isQuickMenuOpen ? 'Close' : 'Action'}
            </span>
          </div>

          {rightNavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isQuickMenuOpen) setIsQuickMenuOpen(false);
                  setActiveTab(tab.id);
                }}
                className="group relative w-full min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl cursor-pointer active:scale-95 transition-all duration-150 focus:outline-none"
              >
                {/* Active Soft Capsule Background */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 dark:from-emerald-400/20 dark:to-emerald-500/5 border border-emerald-500/25 dark:border-emerald-400/25 pointer-events-none"
                  />
                )}

                <div className="relative z-10 flex items-center justify-center w-7 h-6">
                  <Icon
                    className={`w-[19px] h-[19px] shrink-0 transition-all duration-150 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.4] -translate-y-0.5'
                        : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300 stroke-[1.9]'
                    }`}
                  />
                </div>

                <span
                  className={`relative z-10 text-[10px] tracking-tight leading-none mt-0.5 truncate max-w-full transition-colors duration-150 ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'text-slate-500 dark:text-zinc-500 font-medium group-hover:text-slate-800 dark:group-hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Active Bottom Dot Indicator */}
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-bottom-dot"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className="relative z-10 mt-1 w-4 h-0.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
