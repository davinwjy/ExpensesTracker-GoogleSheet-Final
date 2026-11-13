import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Check,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatMasked, formatDate, CATEGORY_COLORS } from '../lib/formatters';
import { BudgetProgress } from '../types';

export const BudgetingView: React.FC = () => {
  const {
    budgets,
    transactions,
    isPrivacyMode,
    setIsBudgetModalOpen,
    setEditingBudget,
    setEditingTransaction,
    saveBudget,
    deleteBudget,
    saveBudgetsToSheet,
    loadBudgetsFromSheet,
    isBudgetSyncing,
    isAppsScriptConnected,
    isSheetsConnected,
    setIsGoogleSheetSetupOpen,
    applySmartBudgetsFromLastMonth,
    getBudgetProgressForMonth,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    showNotification,
  } = useFinance();

  // Month navigation: default to current month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterStatus, setFilterStatus] = useState<'all' | 'danger' | 'warning' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSmartCompareOpen, setIsSmartCompareOpen] = useState<boolean>(false);
  const [isApplyingSmart, setIsApplyingSmart] = useState<boolean>(false);
  const [justSavedToSheet, setJustSavedToSheet] = useState<boolean>(false);

  const isSheetConnected = isAppsScriptConnected || isSheetsConnected;

  // Retrieve latest budget targets from connected Google Sheet upon page/view load
  useEffect(() => {
    if (isSheetConnected) {
      loadBudgetsFromSheet();
    }
  }, [isSheetConnected, loadBudgetsFromSheet]);

  // Compute budget & MoM telemetry
  const {
    items,
    unbudgetedItems,
    prevMonthCategories,
    prevMonthStr,
    totalBudgeted,
    totalSpent,
    totalPrevMonthSpent,
    totalMomDeltaAmount,
    totalMomDeltaPercent,
    totalRemaining,
    overallPercent,
    isOverBudget,
    overBudgetCount,
  } = getBudgetProgressForMonth(selectedMonth);

  // Month formatting helpers
  const monthDisplay = useMemo(() => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  const prevMonthDisplay = useMemo(() => {
    try {
      const [year, month] = prevMonthStr.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return prevMonthStr;
    }
  }, [prevMonthStr]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleResetCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  const warningCount = useMemo(() => items.filter((i) => i.status === 'warning').length, [items]);
  const safeCount = useMemo(() => items.filter((i) => i.status === 'safe').length, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterStatus, searchQuery]);

  // Get transactions for expanded category
  const getCategoryTransactions = (catName: string) => {
    return transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.category === catName &&
        tx.date &&
        tx.date.startsWith(selectedMonth)
    );
  };

  const handleEditBudget = (item: BudgetProgress) => {
    const found = budgets.find((b) => b.id === item.budgetId);
    if (found) {
      setEditingBudget(found);
    } else {
      setEditingBudget({
        id: '',
        userId: '',
        category: item.category,
        monthlyLimit: item.monthlyLimit,
        createdAt: '',
        updatedAt: '',
      });
    }
    setIsBudgetModalOpen(true);
  };

  const handleQuickAddUnbudgeted = async (
    categoryName: string,
    limitAmount: number = 2000000,
    existingBudgetId?: string
  ) => {
    await saveBudget(categoryName, limitAmount, selectedMonth, existingBudgetId);
    showNotification({
      type: 'success',
      title: 'Smart Budget Limit Set',
      message: `${categoryName}: limit set to ${formatIdr(limitAmount)} for ${monthDisplay}`,
      amount: limitAmount,
      category: categoryName,
    });
  };

  const handleApplySmartPreset = async (multiplier: number, label: string) => {
    if (isApplyingSmart || prevMonthCategories.length === 0) return;
    setIsApplyingSmart(true);
    try {
      const { updatedCount, totalNewLimit } = await applySmartBudgetsFromLastMonth(
        selectedMonth,
        multiplier
      );
      if (updatedCount > 0) {
        setJustSavedToSheet(true);
        setTimeout(() => setJustSavedToSheet(false), 3000);
        showNotification({
          type: 'success',
          title: `Smart Budget Saved (${label})`,
          message: `Updated & saved ${updatedCount} category limits for ${monthDisplay} (Total: ${formatIdr(totalNewLimit)})`,
          amount: totalNewLimit,
        });
      }
    } finally {
      setIsApplyingSmart(false);
    }
  };

  const handleSaveBudgetsToSheet = async () => {
    if (isBudgetSyncing) return;
    if (!isSheetConnected) {
      await saveBudgetsToSheet();
      setIsGoogleSheetSetupOpen(true);
      showNotification({
        type: 'info',
        title: 'Connect Google Sheet',
        message: 'Budgets saved locally. Connect your Google Sheet to sync across devices.',
      });
      return;
    }

    try {
      const { savedCount } = await saveBudgetsToSheet();
      setJustSavedToSheet(true);
      setTimeout(() => setJustSavedToSheet(false), 3000);
      showNotification({
        type: 'success',
        title: 'Budgets Saved to Google Sheet',
        message: `Successfully pushed ${savedCount} budget target${savedCount === 1 ? '' : 's'} to your connected Google Sheet.`,
        amount: totalBudgeted,
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        title: 'Failed to Save Budgets',
        message: err?.message || 'Could not sync budget targets to Google Sheet.',
      });
    }
  };

  const handleDeleteBudget = async (id: string, categoryName: string) => {
    if (!window.confirm(`Delete budget limit for ${categoryName}?`)) return;
    try {
      await deleteBudget(id);
      showNotification({
        type: 'info',
        title: 'Budget Limit Removed',
        message: `Limit for ${categoryName} has been removed`,
      });
    } catch (err: any) {
      console.error('Failed to delete budget:', err);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-12 min-w-0">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Budgeting & Spending Limits
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Compare monthly spending against {prevMonthDisplay} and set smart category ceilings.
          </p>
        </div>

        {/* Month Navigation & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#21293a] rounded-lg p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2030] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-0.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 min-w-[125px] text-center whitespace-nowrap">
              {monthDisplay}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2030] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              onClick={handleResetCurrentMonth}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-600 dark:text-zinc-300 text-xs font-medium border border-slate-200 dark:border-[#21293a] cursor-pointer transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              Current Month
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveBudgetsToSheet}
            disabled={isBudgetSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm disabled:opacity-60 ${
              justSavedToSheet
                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/35'
                : 'bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-[#21293a]'
            }`}
            title="Push all current budget targets to your connected Google Sheet"
          >
            {isBudgetSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            ) : justSavedToSheet ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>
              {isBudgetSyncing
                ? 'Syncing...'
                : justSavedToSheet
                ? 'Saved to Sheet'
                : 'Save to Sheet'}
            </span>
          </button>

          <button
            onClick={() => {
              setEditingBudget(null);
              setIsBudgetModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Limit</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW CARD (With Mobile Overflow Protection & MoM Comparison) */}
      <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0">
        {/* OVERALL MACRO CONSUMPTION BAR */}
        <div className="space-y-2.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mb-0.5">
                Spent This Month ({monthDisplay})
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <strong className="text-lg sm:text-xl text-slate-900 dark:text-zinc-100 font-bold tabular-nums whitespace-nowrap">
                  {formatMasked(totalSpent, 'IDR', isPrivacyMode)}
                </strong>
                <span className="text-xs text-slate-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                  / {formatMasked(totalBudgeted, 'IDR', isPrivacyMode)} limit
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              {totalPrevMonthSpent > 0 && (
                <span
                  className={`text-xs font-medium tabular-nums whitespace-nowrap ${
                    totalMomDeltaAmount <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                >
                  {totalMomDeltaAmount > 0 ? '+' : ''}
                  {totalMomDeltaPercent !== null ? `${totalMomDeltaPercent.toFixed(1)}%` : ''} vs {prevMonthDisplay}
                </span>
              )}

              <span
                className={`inline-block text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                  totalBudgeted === 0
                    ? 'text-slate-500 dark:text-zinc-400'
                    : isOverBudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : overallPercent >= 75
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {totalBudgeted > 0 ? `${overallPercent.toFixed(1)}% Used` : '0.0% Used'}
              </span>
            </div>
          </div>

          {/* Master visual indicator bar */}
          <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#141a27] border border-slate-200/80 dark:border-[#212a40] overflow-hidden">
            <div
              style={{ width: `${Math.min(100, overallPercent)}%` }}
              className={`h-full transition-all duration-300 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : overallPercent >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
          </div>

          {/* Mobile-safe stacked status & Total Limit footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-zinc-400 pt-0.5">
            <span
              className={`font-medium tabular-nums break-words ${
                totalBudgeted === 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : isOverBudget
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              } ${isPrivacyMode ? 'privacy-blur' : ''}`}
            >
              {totalBudgeted === 0
                ? totalSpent > 0
                  ? `${formatIdr(totalSpent)} spent without a budget limit set`
                  : 'No monthly budget limit set yet'
                : isOverBudget
                ? `Over budget by ${formatIdr(totalSpent - totalBudgeted)}`
                : `${formatIdr(totalRemaining)} remaining buffer`}
            </span>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
              {totalPrevMonthSpent > 0 && (
                <>
                  <span className="text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {prevMonthDisplay}:{' '}
                    <strong className={`font-semibold text-slate-600 dark:text-zinc-300 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(totalPrevMonthSpent, 'IDR', isPrivacyMode)}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-zinc-700">·</span>
                </>
              )}
              <span className="whitespace-nowrap">
                Total Limit:{' '}
                <strong className={`font-semibold text-slate-700 dark:text-zinc-300 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                  {formatMasked(totalBudgeted, 'IDR', isPrivacyMode)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Macro Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-[#161d2b]">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230] min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium block truncate">
              Monthly Ceiling
            </span>
            <p className={`text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-200 tabular-nums break-words mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalBudgeted, 'IDR', isPrivacyMode)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230] min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium block truncate">
              Spent ({monthDisplay.split(' ')[0]})
            </span>
            <p className={`text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums break-words mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalSpent, 'IDR', isPrivacyMode)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230] min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium block truncate">
              Last Month ({prevMonthDisplay.split(' ')[0]})
            </span>
            <p className={`text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 tabular-nums break-words mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalPrevMonthSpent, 'IDR', isPrivacyMode)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230] min-w-0">
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium block truncate">
              {totalPrevMonthSpent > 0 ? 'vs Last Month' : 'Remaining Buffer'}
            </span>
            {totalPrevMonthSpent > 0 ? (
              <p
                className={`text-xs sm:text-sm font-semibold tabular-nums break-words mt-0.5 ${
                  totalMomDeltaAmount <= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                } ${isPrivacyMode ? 'privacy-blur' : ''}`}
              >
                {totalMomDeltaAmount > 0 ? '+' : ''}
                {formatIdr(totalMomDeltaAmount)}
              </p>
            ) : (
              <p
                className={`text-xs sm:text-sm font-semibold tabular-nums break-words mt-0.5 ${
                  isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                } ${isPrivacyMode ? 'privacy-blur' : ''}`}
              >
                {isOverBudget
                  ? `-${formatIdr(totalSpent - totalBudgeted)}`
                  : formatMasked(totalRemaining, 'IDR', isPrivacyMode)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SMART MONTHLY BUDGET ASSISTANT (Compare & Auto-Set from Last Month's Expenses) */}
      {prevMonthCategories.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm space-y-3.5 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Smart Monthly Budget from {prevMonthDisplay} Expenses
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {totalPrevMonthSpent > 0
                  ? `You spent ${formatMasked(totalPrevMonthSpent, 'IDR', isPrivacyMode)} across ${prevMonthCategories.filter((c) => c.prevMonthSpent > 0).length} categories in ${prevMonthDisplay}. Generate ${monthDisplay} limits in one click:`
                  : `Generate smart category limits based on your recorded expense history:`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isApplyingSmart}
                onClick={() => handleApplySmartPreset(0.9, 'Saver -10%')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-slate-700 dark:text-zinc-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-[#21293a] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                Saver Target (-10%)
              </button>

              <button
                type="button"
                disabled={isApplyingSmart}
                onClick={() => handleApplySmartPreset(1.0, 'Match 100%')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                Match Last Month (100%)
              </button>

              <button
                type="button"
                disabled={isApplyingSmart}
                onClick={() => handleApplySmartPreset(1.1, 'Buffered +10%')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-700 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-[#21293a] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                Buffered (+10%)
              </button>

              <button
                type="button"
                onClick={() => setIsSmartCompareOpen((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161c29] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{isSmartCompareOpen ? 'Hide Comparison' : 'Compare Categories'}</span>
                {isSmartCompareOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable Category-by-Category Last Month vs Current Month Comparison */}
          {isSmartCompareOpen && (
            <div className="pt-3 border-t border-slate-100 dark:border-[#182030] space-y-2 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {prevMonthCategories.map((row) => {
                  const delta = row.currentSpent - row.prevMonthSpent;
                  const isAlreadyMatched =
                    row.currentLimit > 0 && row.currentLimit === row.suggestedSmartLimit;

                  return (
                    <div
                      key={row.category}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: CATEGORY_COLORS[row.category] || '#10b981',
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                            {row.category}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
                          <span>
                            {prevMonthDisplay}:{' '}
                            <strong className="text-slate-700 dark:text-zinc-200">
                              {formatMasked(row.prevMonthSpent, 'IDR', isPrivacyMode)}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Now:{' '}
                            <strong className="text-slate-700 dark:text-zinc-200">
                              {formatMasked(row.currentSpent, 'IDR', isPrivacyMode)}
                            </strong>
                          </span>
                          {row.prevMonthSpent > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={
                                  delta <= 0
                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                    : 'text-rose-600 dark:text-rose-400 font-medium'
                                }
                              >
                                {delta > 0 ? '+' : ''}
                                {formatIdr(delta)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums">
                          Limit:{' '}
                          <strong className="text-slate-700 dark:text-zinc-300">
                            {row.currentLimit > 0 ? formatIdr(row.currentLimit) : 'Not set'}
                          </strong>
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleQuickAddUnbudgeted(
                              row.category,
                              row.suggestedSmartLimit,
                              row.budgetId
                            )
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                            isAlreadyMatched
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-white dark:bg-[#131722] hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#222e44]'
                          }`}
                        >
                          {isAlreadyMatched ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Set ({formatIdr(row.suggestedSmartLimit)})</span>
                            </>
                          ) : (
                            <span>Set {formatIdr(row.suggestedSmartLimit)}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. FILTER & SEARCH STRIP */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `All (${items.length})` },
              { id: 'safe', label: `On Track (${safeCount})` },
              { id: 'warning', label: `Warning (${warningCount})` },
              { id: 'danger', label: `Over Limit (${overBudgetCount})` },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filterStatus === s.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-500/15 dark:text-emerald-400 border border-transparent dark:border-emerald-500/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#161c29]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. CATEGORY BUDGET CARDS GRID */}
      {filteredItems.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3 shadow-sm">
          <Target className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            {items.length === 0
              ? 'No Category Budgets Configured for ' + monthDisplay
              : 'No Budgets Match the Current Filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            {items.length === 0
              ? prevMonthCategories.length > 0
                ? `Auto-populate your ${monthDisplay} budget limits directly from your ${prevMonthDisplay} expenses or set a manual category limit.`
                : 'Set monthly spending limits for categories to monitor runway consumption and receive over-limit alerts.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
          {items.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {prevMonthCategories.length > 0 && (
                <button
                  onClick={() => handleApplySmartPreset(1.0, 'Match 100%')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Set from {prevMonthDisplay} Expenses</span>
                </button>
              )}
              <button
                onClick={() => {
                  setEditingBudget(null);
                  setIsBudgetModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2233] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#222e44] font-medium text-xs transition-colors cursor-pointer"
              >
                Set Custom Limit
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedCategory === item.category;
            const catTransactions = isExpanded ? getCategoryTransactions(item.category) : [];
            const prevSpent = item.prevMonthSpent || 0;
            const momDelta = item.momDeltaAmount ?? item.actualSpent - prevSpent;
            const momPct = item.momDeltaPercent;

            return (
              <div
                key={item.category}
                className={`p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border transition-all space-y-3.5 shadow-sm min-w-0 ${
                  item.status === 'danger'
                    ? 'border-rose-300 dark:border-rose-500/40'
                    : item.status === 'warning'
                    ? 'border-amber-300 dark:border-amber-500/40'
                    : 'border-slate-200 dark:border-[#1b212e] hover:border-slate-300 dark:hover:border-[#273248]'
                }`}
              >
                {/* Card Header: Category & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[item.category] ||
                          (item.status === 'danger'
                            ? '#f43f5e'
                            : item.status === 'warning'
                            ? '#f59e0b'
                            : '#10b981'),
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                        {item.category}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400 dark:text-zinc-500">
                        <span>{item.transactionCount} tx this month</span>
                        {prevSpent > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={`tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                              {prevMonthDisplay}: {formatMasked(prevSpent, 'IDR', isPrivacyMode)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-semibold tabular-nums whitespace-nowrap ${
                        item.status === 'danger'
                          ? 'text-rose-600 dark:text-rose-400'
                          : item.status === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.percentUsed.toFixed(0)}% used
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#151a26] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                      className={`h-full transition-all duration-300 ${
                        item.status === 'danger'
                          ? 'bg-rose-500'
                          : item.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className={`text-slate-700 dark:text-zinc-300 font-medium tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(item.actualSpent, 'IDR', isPrivacyMode)}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 tabular-nums">
                      of <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(item.monthlyLimit, 'IDR', isPrivacyMode)}</span> limit
                    </span>
                  </div>
                </div>

                {/* Runway Buffer & Last Month Comparison Line */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#161c29] space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-zinc-400">
                      {item.remaining < 0 ? 'Over limit by:' : 'Remaining:'}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        item.remaining < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                    >
                      {item.remaining < 0
                        ? formatIdr(Math.abs(item.remaining))
                        : formatIdr(item.remaining)}
                    </span>
                  </div>

                  {prevSpent > 0 && (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-400 dark:text-zinc-500">
                        vs {prevMonthDisplay} ({formatMasked(prevSpent, 'IDR', isPrivacyMode)}):
                      </span>
                      <span
                        className={`font-medium tabular-nums flex items-center gap-1 ${
                          momDelta <= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                      >
                        {momDelta <= 0 ? (
                          <TrendingDown className="w-3 h-3 shrink-0" />
                        ) : (
                          <TrendingUp className="w-3 h-3 shrink-0" />
                        )}
                        <span>
                          {momDelta > 0 ? '+' : ''}
                          {formatIdr(momDelta)}
                          {momPct !== null && momPct !== undefined
                            ? ` (${momPct > 0 ? '+' : ''}${momPct.toFixed(0)}%)`
                            : ''}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions & Drilldown Trigger */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handleEditBudget(item)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 bg-slate-100 dark:bg-[#141a27] hover:bg-slate-200 dark:hover:bg-[#1a2336] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Edit Limit
                    </button>

                    {prevSpent > 0 &&
                      item.suggestedSmartLimit &&
                      item.suggestedSmartLimit !== item.monthlyLimit && (
                        <button
                          onClick={() =>
                            handleQuickAddUnbudgeted(
                              item.category,
                              item.suggestedSmartLimit!,
                              item.budgetId
                            )
                          }
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer whitespace-nowrap"
                          title={`Match ${prevMonthDisplay} spend (${formatIdr(item.suggestedSmartLimit)})`}
                        >
                          Use {prevMonthDisplay.split(' ')[0]} ({formatIdr(item.suggestedSmartLimit)})
                        </button>
                      )}

                    <button
                      onClick={() => {
                        setEditingTransaction(null);
                        setTransactionInitialType('expense');
                        setIsAddExpenseOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + Expense
                    </button>

                    {item.budgetId && (
                      <button
                        onClick={() => item.budgetId && handleDeleteBudget(item.budgetId, item.category)}
                        className="px-2 py-1 rounded-md text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer whitespace-nowrap"
                        title="Delete budget"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : item.category)
                    }
                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    <span>{isExpanded ? 'Hide Tx' : 'Transactions'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expanded Transactions Drilldown */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#182030] space-y-2 animate-in fade-in">
                    <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      {item.category} Transactions ({monthDisplay}):
                    </div>
                    {catTransactions.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-1">
                        No transactions recorded for this category in {monthDisplay}.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {catTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/60 dark:border-[#1b2230] text-xs"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0 tabular-nums">
                                {formatDate(tx.date)}
                              </span>
                              <span className="truncate text-slate-800 dark:text-zinc-300 font-medium">
                                {tx.notes || tx.category}
                              </span>
                            </div>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0 ml-2 tabular-nums">
                              -{formatIdr(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. UNBUDGETED SPENDING CATEGORIES SECTION */}
      {unbudgetedItems.length > 0 && (
        <div className="mt-6 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                  Unbudgeted Spending Detected ({unbudgetedItems.length} Categories)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  These categories have outflow in {monthDisplay} but no spending limit assigned yet.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {unbudgetedItems.map((unb) => (
              <div
                key={unb.category}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#192233] flex items-center justify-between gap-2 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate">
                    {unb.category}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
                    Now:{' '}
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {formatIdr(unb.actualSpent)}
                    </span>{' '}
                    ({unb.transactionCount} tx)
                  </p>
                  {unb.prevMonthSpent > 0 && (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums">
                      {prevMonthDisplay}: {formatIdr(unb.prevMonthSpent)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    handleQuickAddUnbudgeted(unb.category, unb.suggestedSmartLimit)
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-emerald-50 dark:hover:bg-emerald-500/15 border border-slate-200 dark:border-[#222e44] text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                  title={`Set smart limit to ${formatIdr(unb.suggestedSmartLimit)}`}
                >
                  Set {formatIdr(unb.suggestedSmartLimit)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
