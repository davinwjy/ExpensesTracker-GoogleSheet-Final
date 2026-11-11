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
    { id: 'expenses' as const, label: 'Transactions', icon: Receipt },
  ];

  const rightNavTabs = [
    { id: 'budgeting' as const, label: 'Budgeting', icon: Target },
    { id: 'investments' as const, label: 'Portfolio', icon: TrendingUp },
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

            {/* 1-Tap Workspace Shortcuts for Analytics & Accounts */}
            <div className="pt-2 border-t border-slate-200 dark:border-[#1b212e] grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setIsQuickMenuOpen(false);
                  setActiveTab('accounts');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  activeTab === 'accounts'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-[#121622] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#1e2638] hover:bg-slate-100'
                }`}
              >
                <WalletCards className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Accounts</span>
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

      {/* Sleek Bottom Navigation Bar (Visible on Mobile & Tablet < 1024px) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#080a0f]/95 backdrop-blur-lg border-t border-slate-200 dark:border-[#1a1f2c] px-2 py-1.5 transition-colors">
        <div className="grid grid-cols-5 items-center w-full max-w-lg mx-auto">
          {leftNavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 pointer-events-none"
                  />
                )}
                <Icon className="relative z-10 w-4 h-4 shrink-0" />
                <span className="relative z-10 text-[10px] font-medium mt-0.5 truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Clean Center Action Button - Exactly Centered in Column 3 */}
          <div className="flex items-center justify-center w-full h-full">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer"
              aria-label="New Action"
            >
              <Plus className={`w-4 h-4 stroke-[2.8] transition-transform duration-150 ${isQuickMenuOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {rightNavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 pointer-events-none"
                  />
                )}
                <Icon className="relative z-10 w-4 h-4 shrink-0" />
                <span className="relative z-10 text-[10px] font-medium mt-0.5 truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
