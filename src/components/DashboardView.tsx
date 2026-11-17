import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Plus,
  ArrowDownRight,
  CreditCard,
  Lock,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  formatIdr,
  formatUsd,
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
    isPrivacyMode,
    togglePrivacyMode,
    usdIdrRate,
    setActiveTab,
    setIsAddExpenseOpen,
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

  const [activeBudgetSlice, setActiveBudgetSlice] = useState<string | null>(null);

  const budgetSummary = useMemo(() => {
    return getBudgetProgressForMonth(currentMonthStr);
  }, [getBudgetProgressForMonth, currentMonthStr]);

  const budgetCategorySlices = useMemo(() => {
    const FALLBACK_PALETTE = ['#3b82f6', '#10b981', '#f97316', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6'];
    const raw: Array<{ category: string; amount: number; limit: number; hasBudget: boolean }> = [];

    budgetSummary.items.forEach((item) => {
      if (item.actualSpent > 0) {
        raw.push({
          category: item.category,
          amount: item.actualSpent,
          limit: item.monthlyLimit,
          hasBudget: true,
        });
      }
    });

    budgetSummary.unbudgetedItems.forEach((item) => {
      if (item.actualSpent > 0) {
        raw.push({
          category: item.category,
          amount: item.actualSpent,
          limit: 0,
          hasBudget: false,
        });
      }
    });

    raw.sort((a, b) => b.amount - a.amount);

    const totalSpent = raw.reduce((sum, r) => sum + r.amount, 0);
    if (totalSpent <= 0) return [];

    // Group tail categories beyond top 5 into "Other Categories" so pie chart stays clean
    let grouped = raw;
    if (raw.length > 6) {
      const top = raw.slice(0, 5);
      const rest = raw.slice(5);
      const restAmount = rest.reduce((s, r) => s + r.amount, 0);
      const restLimit = rest.reduce((s, r) => s + r.limit, 0);
      grouped = [
        ...top,
        {
          category: `Other (${rest.length})`,
          amount: restAmount,
          limit: restLimit,
          hasBudget: rest.some((r) => r.hasBudget),
        },
      ];
    }

    let cumulativePercent = 0;
    return grouped.map((entry, idx) => {
      const percent = (entry.amount / totalSpent) * 100;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      const color =
        CATEGORY_COLORS[entry.category] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
      return {
        ...entry,
        percent,
        startPercent,
        color,
      };
    });
  }, [budgetSummary]);

  return (
    <div className="space-y-4 animate-in fade-in pb-10 min-w-0">
      {/* GOOGLE APPS SCRIPT CONNECT BANNER (WITH 3-STEP GUIDE) */}
      <GoogleSheetConnectBanner />

      {/* NET WORTH OVERVIEW */}
      <div className="relative bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-[#161b26] dark:via-[#12151d] dark:to-[#101218] border border-indigo-200/90 dark:border-[#2a3347] rounded-xl p-4 sm:p-5 shadow-sm overflow-hidden">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
            <span>Net Worth</span>
            <button
              onClick={togglePrivacyMode}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#131d35] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-400 pt-0.5">
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
            <div className="pt-1.5 space-y-1 max-w-md">
              {(() => {
                const totalAssetsNominal = liquidCashIdr + investmentValueIdr;
                const liquidRatio =
                  totalAssetsNominal > 0 ? Math.round((liquidCashIdr / totalAssetsNominal) * 100) : 50;
                const investedRatio = 100 - liquidRatio;
                return (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 gap-2">
                      <span>Cash {liquidRatio}%</span>
                      <span>Investments {investedRatio}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#1c212e] overflow-hidden flex">
                      <div
                        style={{ width: `${liquidRatio}%` }}
                        className="h-full bg-sky-500 transition-all duration-300"
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

          {/* Compact 3-Column Monthly Summary Strip */}
          <div className="mt-3 pt-2.5 border-t border-indigo-200/70 dark:border-[#242b3c] grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-[#242b3c]">
            {/* Monthly Expenses */}
            <div className="pr-2 sm:pr-4 min-w-0">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400 mb-0.5 min-w-0">
                <Receipt className="w-3 h-3 text-rose-500/80 shrink-0 hidden sm:inline" />
                <span className="sm:hidden truncate">Expenses</span>
                <span className="hidden sm:inline truncate">Monthly Expenses</span>
              </div>
              <p className={`text-[11px] sm:text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                {formatIdr(monthlyExpenses)}
              </p>
            </div>

            {/* Monthly Inflow */}
            <div className="px-2 sm:px-4 min-w-0">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400 mb-0.5 min-w-0">
                <ArrowDownRight className="w-3 h-3 text-emerald-500 shrink-0 hidden sm:inline" />
                <span className="sm:hidden truncate">Inflow</span>
                <span className="hidden sm:inline truncate">Monthly Inflow</span>
              </div>
              <p className={`text-[11px] sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                {formatIdr(monthlyIncomes)}
              </p>
            </div>

            {/* Invested This Month */}
            <div className="pl-2 sm:pl-4 min-w-0">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400 mb-0.5 min-w-0">
                <TrendingUp className="w-3 h-3 text-blue-500 shrink-0 hidden sm:inline" />
                <span className="sm:hidden truncate">Invested</span>
                <span className="hidden sm:inline truncate">Invested This Month</span>
              </div>
              <p className={`text-[11px] sm:text-base font-bold text-indigo-600 dark:text-blue-400 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                {formatIdr(monthlyTransfersToInv)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BUDGET USED PIE CHART BY CATEGORY */}
      {(() => {
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const selectedSlice = budgetCategorySlices.find((s) => s.category === activeBudgetSlice) || null;

        const statusTextClass =
          budgetSummary.totalBudgeted === 0
            ? 'text-slate-500 dark:text-zinc-400'
            : budgetSummary.isOverBudget
            ? 'text-rose-600 dark:text-rose-400'
            : budgetSummary.overallPercent >= 75
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-indigo-600 dark:text-indigo-400';

        return (
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm space-y-3">
            {/* Top Header Row */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#1b2540]">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Budget Used
                </h3>
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  · {currentMonthDisplay}
                </span>
                <span className={`text-xs font-medium ${statusTextClass}`}>
                  ·{' '}
                  {budgetSummary.totalBudgeted === 0
                    ? 'No limit set'
                    : budgetSummary.isOverBudget
                    ? 'Over Limit'
                    : budgetSummary.overallPercent >= 75
                    ? 'Approaching Limit'
                    : 'On Track'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingBudget(null);
                    setIsBudgetModalOpen(true);
                  }}
                  className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#11192e] hover:bg-slate-200 dark:hover:bg-[#17223d] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Set Limit</span>
                </button>
                <button
                  onClick={() => setActiveTab('budgeting')}
                  className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                >
                  Details →
                </button>
              </div>
            </div>

            {/* Pie Chart + Category Breakdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Interactive Category Pie / Donut Chart */}
              <div className="flex items-center gap-4 sm:block shrink-0">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {budgetCategorySlices.length === 0 ? (
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        strokeWidth="14"
                        className="stroke-slate-100 dark:stroke-[#1c212e]"
                      />
                    ) : (
                      budgetCategorySlices.map((slice) => {
                        const isMultiple = budgetCategorySlices.length > 1;
                        const gap = isMultiple ? 2 : 0;
                        const rawLen = (slice.percent / 100) * circumference;
                        const dashLen = Math.max(1.5, rawLen - gap);
                        const rotationDeg = -90 + (slice.startPercent / 100) * 360;
                        const isDimmed =
                          activeBudgetSlice !== null && activeBudgetSlice !== slice.category;
                        const isFocused = activeBudgetSlice === slice.category;

                        return (
                          <circle
                            key={slice.category}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth={isFocused ? 16 : 14}
                            strokeDasharray={`${dashLen} ${circumference}`}
                            transform={`rotate(${rotationDeg} 50 50)`}
                            onMouseEnter={() => setActiveBudgetSlice(slice.category)}
                            onMouseLeave={() => setActiveBudgetSlice(null)}
                            onClick={() =>
                              setActiveBudgetSlice((prev) =>
                                prev === slice.category ? null : slice.category
                              )
                            }
                            className={`cursor-pointer transition-all duration-200 ${
                              isDimmed ? 'opacity-30' : 'opacity-100'
                            }`}
                          />
                        );
                      })
                    )}
                  </svg>

                  {/* Center Readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 tabular-nums leading-none">
                      {selectedSlice
                        ? `${selectedSlice.percent.toFixed(0)}%`
                        : budgetSummary.totalBudgeted > 0
                        ? `${budgetSummary.overallPercent.toFixed(0)}%`
                        : budgetCategorySlices.length > 0
                        ? '100%'
                        : '0%'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 mt-1 leading-tight truncate max-w-[74px]">
                      {selectedSlice
                        ? selectedSlice.category
                        : budgetSummary.totalBudgeted > 0
                        ? 'used'
                        : 'spent'}
                    </span>
                  </div>
                </div>

                {/* Mobile inline headline next to pie chart */}
                <div className="sm:hidden min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className={`text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatIdr(budgetSummary.totalSpent)}
                    </span>
                    {budgetSummary.totalBudgeted > 0 && (
                      <span className={`text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        / {formatIdr(budgetSummary.totalBudgeted)}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                    {budgetSummary.totalBudgeted === 0
                      ? 'Spending across categories'
                      : budgetSummary.isOverBudget
                      ? `Over by ${formatIdr(budgetSummary.totalSpent - budgetSummary.totalBudgeted)}`
                      : `${formatIdr(budgetSummary.totalRemaining)} remaining`}
                  </p>
                </div>
              </div>

              {/* Right Side: Totals + Category Legend */}
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="hidden sm:flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatIdr(budgetSummary.totalSpent)}
                    </span>
                    {budgetSummary.totalBudgeted > 0 && (
                      <span className={`text-xs text-slate-500 dark:text-zinc-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        / {formatIdr(budgetSummary.totalBudgeted)} limit
                      </span>
                    )}
                  </div>
                  <span className={`text-xs text-slate-500 dark:text-zinc-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                    {budgetSummary.totalBudgeted === 0
                      ? 'No limit set'
                      : budgetSummary.isOverBudget
                      ? `Over by ${formatIdr(budgetSummary.totalSpent - budgetSummary.totalBudgeted)}`
                      : `${formatIdr(budgetSummary.totalRemaining)} left`}
                  </span>
                </div>

                {budgetCategorySlices.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-500">
                    No category spending recorded this month.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {budgetCategorySlices.map((slice) => {
                      const isActive = activeBudgetSlice === slice.category;
                      const isDimmed = activeBudgetSlice !== null && !isActive;

                      return (
                        <button
                          key={slice.category}
                          type="button"
                          onMouseEnter={() => setActiveBudgetSlice(slice.category)}
                          onMouseLeave={() => setActiveBudgetSlice(null)}
                          onClick={() =>
                            setActiveBudgetSlice((prev) =>
                              prev === slice.category ? null : slice.category
                            )
                          }
                          className={`flex items-center justify-between gap-2 py-1 px-1.5 -mx-1.5 rounded-md text-left transition-all cursor-pointer min-w-0 ${
                            isActive
                              ? 'bg-slate-100 dark:bg-[#171b26]'
                              : 'hover:bg-slate-50 dark:hover:bg-[#141822]'
                          } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-zinc-200 truncate">
                              {slice.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] tabular-nums">
                            <span className="text-slate-400 dark:text-zinc-500">
                              {slice.percent.toFixed(0)}%
                            </span>
                            <span className={`font-semibold text-slate-800 dark:text-zinc-200 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                              {formatIdr(slice.amount)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* RECENT TRANSACTIONS (FULL-WIDTH ULTRA-COMPACT SUMMARY ROWS) */}
      <div className="rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm overflow-hidden min-w-0">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-[#1b2540]">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
              Recent Transactions
            </h3>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-zinc-500 truncate">
              · Latest entries
            </span>
          </div>
          <button
            onClick={() => setActiveTab('expenses')}
            className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            View All →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-7 px-4 text-center space-y-2.5">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              No recent entries recorded yet.
            </p>
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#161f38]">
            {recentTransactions.map((tx) => {
              const sourceAcc = accounts.find((a) => a.id === tx.accountId);
              const destAcc = accounts.find((a) => a.id === tx.toAccountId);
              const targetInv = investments.find((i) => i.id === tx.toInvestmentId);
              const lockStatus = isTransactionLocked(tx, accounts);
              const isEditable =
                !lockStatus.locked &&
                (tx.type === 'expense' || tx.type === 'income' || tx.type === 'cc_debt');

              const rowTitle =
                tx.type === 'bank_to_investment'
                  ? `Funded ${targetInv?.name || 'Investment'}`
                  : tx.type === 'transfer'
                  ? `Transfer to ${destAcc?.name || 'Cash'}`
                  : tx.category || 'General';

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (isEditable) {
                      setEditingTransaction(tx);
                      setIsAddExpenseOpen(true);
                    }
                  }}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-2 transition-colors duration-150 min-w-0 ${
                    isEditable
                      ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0f1629]'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0 ${
                        lockStatus.isBillPayment
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : lockStatus.isAdminFee
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          : tx.type === 'cc_debt'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : tx.type === 'expense'
                          ? 'bg-slate-200/70 dark:bg-[#142646] text-slate-600 dark:text-zinc-300'
                          : tx.type === 'income'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'bank_to_investment'
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {lockStatus.isBillPayment ? (
                        <CreditCard className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : lockStatus.isAdminFee ? (
                        <Receipt className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : tx.type === 'cc_debt' ? (
                        <CreditCard className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : tx.type === 'expense' ? (
                        <Receipt className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : tx.type === 'income' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : tx.type === 'bank_to_investment' ? (
                        <TrendingUp className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      ) : (
                        <ArrowRightLeft className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 shrink-0 sm:max-w-[240px]">
                        <span className="text-[13px] sm:text-xs font-medium text-slate-900 dark:text-zinc-200 truncate">
                          {rowTitle}
                        </span>
                        {lockStatus.locked && (
                          <span
                            className="text-slate-400 dark:text-zinc-500 shrink-0"
                            title={lockStatus.reason}
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-zinc-400 min-w-0 truncate">
                        <span className="hidden sm:inline text-slate-300 dark:text-zinc-700" aria-hidden="true">
                          ·
                        </span>
                        <span className="truncate sm:max-w-[160px]">
                          {sourceAcc?.name || 'Bank'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="whitespace-nowrap shrink-0">
                          {formatDate(tx.date)}
                        </span>
                        {tx.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="italic text-slate-500 dark:text-zinc-400 truncate">
                              {tx.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 shrink-0 pl-1 text-right">
                    {tx.type === 'bank_to_investment' && tx.amountUsd && (
                      <span className={`order-2 sm:order-1 text-[10px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        +{formatUsd(tx.amountUsd)}
                      </span>
                    )}
                    <span
                      className={`order-1 sm:order-2 text-[13px] sm:text-xs font-mono tabular-nums font-semibold whitespace-nowrap ${
                        tx.type === 'cc_debt'
                          ? 'text-amber-600 dark:text-amber-400'
                          : tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'bank_to_investment'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-blue-600 dark:text-blue-400'
                      } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                    >
                      {tx.type === 'cc_debt' || tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                      {formatIdr(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
