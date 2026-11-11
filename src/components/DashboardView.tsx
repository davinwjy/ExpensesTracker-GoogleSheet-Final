import React, { useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Plus,
  ArrowDownRight,
  Target,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Lock,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  formatIdr,
  formatUsd,
  formatMasked,
  formatDate,
  CATEGORY_COLORS,
  sortTransactionsNewestFirst,
  isTransactionLocked,
} from '../lib/formatters';
import { GoogleSheetConnectBanner } from './GoogleSheetConnectBanner';

export const DashboardView: React.FC = () => {
  const {
    stats,
    accounts,
    transactions,
    investments,
    budgets,
    isPrivacyMode,
    togglePrivacyMode,
    usdIdrRate,
    setActiveTab,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsAddAccountOpen,
    setEditingTransaction,
    setIsBudgetModalOpen,
    setEditingBudget,
    getBudgetProgressForMonth,
  } = useFinance();

  const netWorthIdr = stats?.totalNetWorthIdr || 0;
  const netWorthUsd = usdIdrRate > 0 ? netWorthIdr / usdIdrRate : 0;
  const liquidCashIdr = stats?.totalLiquidCashIdr || 0;
  const investmentValueIdr = stats?.totalInvestmentValueIdr || 0;
  const unrealizedPnlIdr = stats?.unrealizedPnlIdr || 0;
  const pnlPercent = stats?.unrealizedPnlPercentage || 0;

  const monthlyExpenses = stats?.monthlyExpenses || 0;
  const monthlyIncomes = stats?.monthlyIncomes || 0;
  const monthlyTransfersToInv = stats?.monthlyTransfersToInv || 0;

  const recentTransactions = useMemo(() => {
    return sortTransactionsNewestFirst(transactions).slice(0, 7);
  }, [transactions]);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthDisplay = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, []);

  const budgetSummary = useMemo(() => {
    return getBudgetProgressForMonth(currentMonthStr);
  }, [getBudgetProgressForMonth, currentMonthStr]);

  return (
    <div className="space-y-4 animate-in fade-in pb-10 min-w-0">
      {/* Privacy banner notice if active */}
      {isPrivacyMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300 font-mono">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <EyeOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">
              <strong>PRIVACY SHIELD ACTIVE:</strong> All currency figures are masked for screen-sharing.
            </span>
          </div>
          <button
            onClick={togglePrivacyMode}
            className="text-amber-600 dark:text-amber-400 hover:underline font-semibold text-xs cursor-pointer self-end sm:self-auto shrink-0"
          >
            Reveal Values
          </button>
        </div>
      )}

      {/* GOOGLE APPS SCRIPT CONNECT BANNER (WITH 3-STEP GUIDE) */}
      <GoogleSheetConnectBanner />

      {/* NET WORTH OVERVIEW */}
      <div className="relative bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <span>Net Worth</span>
              <button
                onClick={togglePrivacyMode}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title={isPrivacyMode ? 'Reveal values' : 'Hide values'}
              >
                {isPrivacyMode ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Big Net Worth Nominal */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
              <h2 className={`text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                {formatIdr(netWorthIdr)}
              </h2>
              <span className={`text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                ≈ {formatUsd(netWorthUsd)}
              </span>
            </div>

            {/* Metric Ledger Line */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-400 pt-1">
              <span>
                Liquid Cash:{' '}
                <strong className={`text-slate-900 dark:text-zinc-200 tabular-nums font-semibold ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                  {formatIdr(liquidCashIdr)}
                </strong>
              </span>
              <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline" aria-hidden="true">·</span>
              <span>
                Investments:{' '}
                <strong className={`text-slate-900 dark:text-zinc-200 tabular-nums font-semibold ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                  {formatIdr(investmentValueIdr)}
                </strong>
              </span>
              <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline" aria-hidden="true">·</span>
              <span
                className={`font-semibold tabular-nums ${
                  unrealizedPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {unrealizedPnlIdr >= 0 ? '+' : ''}
                {pnlPercent.toFixed(1)}% ROI
              </span>
            </div>

            {/* Visual Allocation Weight Bar */}
            {netWorthIdr > 0 && (
              <div className="pt-2 space-y-1.5 max-w-md">
                {(() => {
                  const totalAssetsNominal = liquidCashIdr + investmentValueIdr;
                  const liquidRatio =
                    totalAssetsNominal > 0 ? Math.round((liquidCashIdr / totalAssetsNominal) * 100) : 50;
                  const investedRatio = 100 - liquidRatio;
                  return (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 gap-2">
                        <span>Cash {liquidRatio}%</span>
                        <span>Investments {investedRatio}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#151a26] overflow-hidden flex">
                        <div
                          style={{ width: `${liquidRatio}%` }}
                          className="h-full bg-emerald-500 transition-all duration-300"
                        />
                        <div
                          style={{ width: `${investedRatio}%` }}
                          className="h-full bg-indigo-500 transition-all duration-300"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Quick Action Buttons - 2x2 grid on mobile, flex row on larger viewports */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 lg:pt-0 w-full lg:w-auto shrink-0">
            <button
              onClick={() => {
                setEditingTransaction(null);
                setTransactionInitialType('expense');
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Add Expense</span>
            </button>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setTransactionInitialType('income');
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Add Income</span>
            </button>

            <button
              onClick={() => {
                setTransferInitialMode('bank_to_investment');
                setIsTransferOpen(true);
              }}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Invest</span>
            </button>

            <button
              onClick={() => {
                setTransferInitialMode('account_to_account');
                setIsTransferOpen(true);
              }}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Transfer</span>
            </button>
          </div>
        </div>
      </div>

      {/* MONTHLY TELEMETRY LEDGER (3 COMPACT CARDS) */}
      {/* MONTHLY SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Expenses this month */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm min-w-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 gap-2">
            <span className="truncate">Monthly Expenses</span>
            <Receipt className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          <p className={`text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatIdr(monthlyExpenses)}
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Deducted from bank & cash wallets</p>
        </div>

        {/* Incomes this month */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm min-w-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 gap-2">
            <span className="truncate">Monthly Inflow</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <p className={`text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatIdr(monthlyIncomes)}
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Salary, dividends & deposits</p>
        </div>

        {/* Invested this month */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm min-w-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 gap-2">
            <span className="truncate">Invested This Month</span>
            <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <p className={`text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatIdr(monthlyTransfersToInv)}
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Directly funded from bank accounts</p>
        </div>
      </div>

      {/* MONTHLY BUDGET TRACKER & RUNWAY */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1b212e] gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Budget Progress · {currentMonthDisplay}
                </h3>
                <span className="text-xs text-slate-400 dark:text-zinc-500" aria-hidden="true">·</span>
                <span
                  className={`text-xs font-medium ${
                    budgetSummary.isOverBudget
                      ? 'text-rose-600 dark:text-rose-400'
                      : budgetSummary.overallPercent >= 75
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {budgetSummary.isOverBudget
                    ? `${budgetSummary.overBudgetCount} Over Limit`
                    : budgetSummary.overallPercent >= 75
                    ? 'Approaching Limit'
                    : 'On Track'}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Category spending consumption vs planned monthly ceiling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingBudget(null);
                setIsBudgetModalOpen(true);
              }}
              className="text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2030] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Limit</span>
            </button>
            <button
              onClick={() => setActiveTab('budgeting')}
              className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:underline cursor-pointer"
            >
              View All Budgets →
            </button>
          </div>
        </div>

        {/* Macro Gauge Banner */}
        <div className="bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1c2333] rounded-lg p-3.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-zinc-400 text-[11px] whitespace-nowrap">MONTHLY SPENT:</span>
              <strong className={`text-slate-900 dark:text-zinc-100 font-bold tabular-nums whitespace-nowrap ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                {formatIdr(budgetSummary.totalSpent)}
              </strong>
              <span className={`text-slate-500 dark:text-zinc-400 tabular-nums whitespace-nowrap ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                / {formatIdr(budgetSummary.totalBudgeted)}
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px]">
              <span
                className={`font-bold tabular-nums ${
                  budgetSummary.totalBudgeted === 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : budgetSummary.isOverBudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                } ${isPrivacyMode ? 'privacy-blur' : ''}`}
              >
                {budgetSummary.totalBudgeted === 0
                  ? 'No limit set'
                  : budgetSummary.isOverBudget
                  ? `Over Budget by ${formatIdr(budgetSummary.totalSpent - budgetSummary.totalBudgeted)}`
                  : `${formatIdr(budgetSummary.totalRemaining)} remaining`}
              </span>
              <span className="text-slate-300 dark:text-zinc-500" aria-hidden="true">·</span>
              <span className="text-slate-700 dark:text-zinc-300 font-bold whitespace-nowrap shrink-0">
                {budgetSummary.overallPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Visual indicator progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#151a26] overflow-hidden relative border border-slate-300/60 dark:border-[#222b3e]">
            <div
              style={{ width: `${Math.min(100, budgetSummary.overallPercent)}%` }}
              className={`h-full transition-all duration-300 ${
                budgetSummary.isOverBudget
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : budgetSummary.overallPercent >= 75
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              }`}
            />
          </div>
        </div>

        {/* Category Visual Indicators Grid */}
        {budgetSummary.items.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-slate-500 dark:text-zinc-500">
            No category spending limits configured yet. Click "+ SET LIMIT" to establish spending ceilings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {budgetSummary.items.slice(0, 6).map((item) => {
              const tagColor = CATEGORY_COLORS[item.category] || '#10b981';
              return (
                <div
                  key={item.category}
                  onClick={() => setActiveTab('budgeting')}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] hover:border-slate-300 dark:hover:border-[#2a3449] transition-all cursor-pointer space-y-2 group min-w-0"
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tagColor }}
                      />
                      <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate group-hover:text-slate-950 dark:group-hover:text-white">
                        {item.category}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        item.status === 'danger'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                          : item.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                      }`}
                    >
                      {item.percentUsed.toFixed(0)}%
                    </span>
                  </div>

                  {/* Visual Indicator Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#151a26] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                      className={`h-full transition-all duration-300 ${
                        item.status === 'danger'
                          ? 'bg-rose-500'
                          : item.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                    <span className={`tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatIdr(item.actualSpent)}
                    </span>
                    <span className={`text-slate-400 dark:text-zinc-500 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      / {formatIdr(item.monthlyLimit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {budgetSummary.items.length > 6 && (
          <div className="text-center pt-1">
            <button
              onClick={() => setActiveTab('budgeting')}
              className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              + {budgetSummary.items.length - 6} more category budgets in Budgeting module →
            </button>
          </div>
        )}
      </div>

      {/* DUAL WORKSPACE: LIQUIDITY ACCOUNTS & RECENT LEDGER ENTRIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 min-w-0">
        {/* BANK & CASH ACCOUNTS */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1b212e]">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Accounts & Wallets
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Cash balance across banks and cash wallets
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAddAccountOpen(true)}
                className="text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2030] text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-[#21293a] cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200/70 dark:border-[#1d2332] hover:border-slate-300 dark:hover:border-[#2b354a] transition-all min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color || '#3b82f6' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 dark:text-zinc-100 text-xs truncate">{acc.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 capitalize">
                        {acc.type.replace('_', ' ')}
                      </span>
                    </div>
                    {acc.accountNumber && (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">{acc.accountNumber}</p>
                    )}
                  </div>
                </div>

                <div className="pl-4 sm:pl-0 sm:text-right shrink-0">
                  {acc.type === 'credit_card' || acc.type === 'paylater' ? (
                    <div>
                      <span className={`text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatIdr(Math.max(0, (acc.creditLimit || 0) - acc.balance))}
                      </span>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums">
                        Remaining Limit (Used:{' '}
                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                          {formatIdr(acc.balance)}
                        </span>)
                      </p>
                    </div>
                  ) : (
                    <span className={`text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatIdr(acc.balance)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-[#1b212e]">
            <span>Total Liquid Cash:</span>
            <span className={`font-semibold text-slate-900 dark:text-zinc-100 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatIdr(liquidCashIdr)}
            </span>
          </div>
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1b212e]">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500">Expenses, inflows, and investment fundings</p>
            </div>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:underline cursor-pointer shrink-0"
            >
              View All →
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No recent entries recorded yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentTransactions.map((tx) => {
                const sourceAcc = accounts.find((a) => a.id === tx.accountId);
                const destAcc = accounts.find((a) => a.id === tx.toAccountId);
                const targetInv = investments.find((i) => i.id === tx.toInvestmentId);
                const lockStatus = isTransactionLocked(tx, accounts);

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      if (!lockStatus.locked && (tx.type === 'expense' || tx.type === 'income' || tx.type === 'cc_debt')) {
                        setEditingTransaction(tx);
                        setIsAddExpenseOpen(true);
                      }
                    }}
                    className={`flex items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] hover:border-slate-300 dark:hover:border-[#2b354a] transition-all min-w-0 ${
                      lockStatus.locked ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                          lockStatus.isBillPayment
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : lockStatus.isAdminFee
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                            : tx.type === 'cc_debt'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : tx.type === 'expense'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : tx.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : tx.type === 'bank_to_investment'
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {lockStatus.isBillPayment ? (
                          <CreditCard className="w-3.5 h-3.5" />
                        ) : lockStatus.isAdminFee ? (
                          <Receipt className="w-3.5 h-3.5" />
                        ) : tx.type === 'cc_debt' ? (
                          <CreditCard className="w-3.5 h-3.5" />
                        ) : tx.type === 'expense' ? (
                          <Receipt className="w-3.5 h-3.5" />
                        ) : tx.type === 'income' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : tx.type === 'bank_to_investment' ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate">
                            {tx.type === 'bank_to_investment'
                              ? `Funded ${targetInv?.name || 'Investment'}`
                              : tx.type === 'transfer'
                              ? `Transfer to ${destAcc?.name || 'Cash'}`
                              : tx.category || 'General'}
                          </p>
                          {lockStatus.locked && (
                            <span
                              className="text-[9px] text-slate-400 dark:text-zinc-500 flex items-center"
                              title={lockStatus.reason}
                            >
                              <Lock className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-x-1.5 gap-y-0.5 flex-wrap">
                          <span className="truncate max-w-[120px] sm:max-w-none">{sourceAcc?.name || 'Bank'}</span>
                          <span>·</span>
                          <span className="whitespace-nowrap">{formatDate(tx.date)}</span>
                          {tx.notes && (
                            <>
                              <span>·</span>
                              <span className="italic text-slate-600 dark:text-zinc-400 truncate max-w-[130px] sm:max-w-[160px]">
                                "{tx.notes}"
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-1">
                      <span
                        className={`text-xs font-mono tabular-nums font-bold whitespace-nowrap ${
                          tx.type === 'cc_debt'
                            ? 'text-amber-600 dark:text-amber-400'
                            : tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'bank_to_investment'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {tx.type === 'cc_debt' || tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                        {formatIdr(tx.amount)}
                      </span>
                      {tx.type === 'bank_to_investment' && tx.amountUsd && (
                        <p className="text-[9px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
                          +{formatUsd(tx.amountUsd)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
