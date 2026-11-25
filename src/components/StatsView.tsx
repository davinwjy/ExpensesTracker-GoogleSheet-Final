import React, { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  Receipt,
  SlidersHorizontal,
  Layers,
  Building,
  Landmark,
  Coins,
  Globe,
  Wallet,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatUsd, formatMasked, CATEGORY_COLORS, isMasterCategory } from '../lib/formatters';
import { IncomeInvestmentTracker } from './Analytics/IncomeInvestmentTracker';

export const StatsView: React.FC = () => {
  const {
    stats,
    accounts,
    investments,
    expenseCategories,
    incomeCategories,
    isPrivacyMode,
    usdIdrRate,
    rateSource,
    rateLastUpdated,
    isRateAutoUpdate,
    setIsRateAutoUpdate,
    isRateFetching,
    fetchLatestRate,
    updateRate,
  } = useFinance();

  const [rateInput, setRateInput] = useState(usdIdrRate.toString());
  const [rateSaved, setRateSaved] = useState(false);
  const [fetchToast, setFetchToast] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    setRateInput(usdIdrRate.toString());
  }, [usdIdrRate]);

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(rateInput);
    if (!isNaN(val) && val > 0) {
      await updateRate(val, 'Manual Custom');
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2000);
    }
  };

  const handleFetchNow = async () => {
    const res = await fetchLatestRate();
    if (res.success && res.rate) {
      setFetchToast(`Live Google rate: Rp ${Math.round(res.rate).toLocaleString('id-ID')}`);
      setTimeout(() => setFetchToast(null), 3500);
    } else {
      setFetchToast('Failed to fetch from Google');
      setTimeout(() => setFetchToast(null), 3500);
    }
  };

  const formatLastUpdated = (iso?: string | null) => {
    if (!iso) return 'Not synced yet';
    try {
      const date = new Date(iso);
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' (' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ')'
      );
    } catch {
      return iso;
    }
  };

  const netWorth = stats?.totalNetWorthIdr || 0;
  const liquidCash = stats?.totalLiquidCashIdr || 0;
  const totalInvestment = stats?.totalInvestmentValueIdr || 0;
  const rawExpenseByCategory = stats?.expenseByCategory || {};
  const rawIncomeByCategory = stats?.incomeByCategory || {};
  const masterExpenseEntries = Object.entries(rawExpenseByCategory)
    .filter(([category, amount]) => amount > 0 && isMasterCategory(category, expenseCategories))
    .sort((a, b) => b[1] - a[1]);
  const masterIncomeEntries = Object.entries(rawIncomeByCategory)
    .filter(([category, amount]) => amount > 0 && isMasterCategory(category, incomeCategories))
    .sort((a, b) => b[1] - a[1]);
  const chartExpenseTotal = masterExpenseEntries.reduce((sum, [, amount]) => sum + amount, 0);
  const chartIncomeTotal = masterIncomeEntries.reduce((sum, [, amount]) => sum + amount, 0);
  const expenseByAccount = stats?.expenseByAccount || {};
  const monthlyExpenses = stats?.monthlyExpenses || 0;
  const categoryAllocations = stats?.categoryAllocations || {};

  // Asset allocation percentages
  const cashPercent = netWorth > 0 ? (liquidCash / netWorth) * 100 : 0;
  const sahamPercent = netWorth > 0 ? ((categoryAllocations['Saham']?.idrValue || 0) / netWorth) * 100 : 0;
  const rdpuPercent = netWorth > 0 ? ((categoryAllocations['RDPU']?.idrValue || 0) / netWorth) * 100 : 0;
  const btcPercent = netWorth > 0 ? ((categoryAllocations['Bitcoin']?.idrValue || 0) / netWorth) * 100 : 0;
  const etfPercent = netWorth > 0 ? ((categoryAllocations['ETF USA']?.idrValue || 0) / netWorth) * 100 : 0;
  const usdPercent = netWorth > 0 ? ((categoryAllocations['USD']?.idrValue || 0) / netWorth) * 100 : 0;

  return (
    <div className="space-y-3 sm:space-y-3.5 animate-in fade-in pb-12 min-w-0">
      {/* Header */}
      <div className="min-w-0">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Analytics & Reports
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Asset allocation, cashflow timelines, and FX conversion rates
        </p>
      </div>

      {/* MONTH-BY-MONTH & YEAR-BY-YEAR INCOME VS INVESTMENT TRACKER */}
      <IncomeInvestmentTracker />

      {/* ASSET ALLOCATION MATRIX */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] space-y-2.5 shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm truncate">
              Asset Allocation
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tabular-nums whitespace-nowrap shrink-0">
            Total: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(netWorth, 'IDR', isPrivacyMode)}</span>
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#131d35] overflow-hidden flex border border-slate-200 dark:border-[#1e2946]">
          <div style={{ width: `${cashPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cash & Banks: ${cashPercent.toFixed(1)}%`} />
          <div style={{ width: `${sahamPercent}%` }} className="bg-blue-600 h-full transition-all" title={`Saham: ${sahamPercent.toFixed(1)}%`} />
          <div style={{ width: `${rdpuPercent}%` }} className="bg-teal-500 h-full transition-all" title={`RDPU: ${rdpuPercent.toFixed(1)}%`} />
          <div style={{ width: `${btcPercent}%` }} className="bg-amber-500 h-full transition-all" title={`Bitcoin: ${btcPercent.toFixed(1)}%`} />
          <div style={{ width: `${etfPercent}%` }} className="bg-indigo-500 h-full transition-all" title={`ETF USA: ${etfPercent.toFixed(1)}%`} />
          <div style={{ width: `${usdPercent}%` }} className="bg-emerald-500 h-full transition-all" title={`USD Cash: ${usdPercent.toFixed(1)}%`} />
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                <span className="truncate">CASH</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{cashPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(liquidCash, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span className="truncate">STOCKS</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{sahamPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Saham']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="truncate">RDPU</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{rdpuPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['RDPU']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">BITCOIN</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{btcPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Bitcoin']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">ETF USA</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{etfPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['ETF USA']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] min-w-0">
            <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">USD</span>
              </span>
              <span className="text-slate-900 dark:text-zinc-100 tabular-nums shrink-0">{usdPercent.toFixed(1)}%</span>
            </div>
            <p className={`text-[11px] font-semibold text-slate-700 dark:text-zinc-300 tabular-nums truncate mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['USD']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: MONTHLY EXPENSE CATEGORIES & FUNDING SOURCE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
        {/* Category Breakdown (Toggleable between Expense & Income) */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] space-y-2.5 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#18223a]">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm">
              {categoryTab === 'expense' ? 'Expense Distribution' : 'Income Sources'}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 bg-slate-100 dark:bg-[#080d1a] rounded-lg border border-slate-200 dark:border-[#1e2946] text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setCategoryTab('expense')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    categoryTab === 'expense'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('income')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    categoryTab === 'income'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Income
                </button>
              </div>

              <span
                className={`text-xs font-bold font-mono tabular-nums ${
                  categoryTab === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatIdr(
                  categoryTab === 'expense' ? chartExpenseTotal : chartIncomeTotal
                )}
              </span>
            </div>
          </div>

          {categoryTab === 'expense' ? (
            masterExpenseEntries.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-500 py-4 text-center">No expenses recorded this month.</p>
            ) : (
              <div className="space-y-2">
                {masterExpenseEntries.map(([category, amount]) => {
                  const pct = chartExpenseTotal > 0 ? (amount / chartExpenseTotal) * 100 : 0;
                  const color = CATEGORY_COLORS[category] || '#1d64e8';

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900 dark:text-zinc-200">{category}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                            {formatIdr(amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#121622] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            masterIncomeEntries.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-500 py-4 text-center">No income recorded this month.</p>
            ) : (
              <div className="space-y-2">
                {masterIncomeEntries.map(([category, amount]) => {
                  const pct = chartIncomeTotal > 0 ? (amount / chartIncomeTotal) * 100 : 0;
                  const color = CATEGORY_COLORS[category] || '#10b981';

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900 dark:text-zinc-200">{category}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                            {formatIdr(amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#121622] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Funding Source Breakdown */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] space-y-2.5 shadow-sm">
          <div className="pb-2 border-b border-slate-100 dark:border-[#18223a] flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm">
              Spending by Account
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">This month</span>
          </div>

          {Object.keys(expenseByAccount).length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-500 py-4 text-center">No expenses recorded this month.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(expenseByAccount)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([accId, item]) => {
                  const pct = monthlyExpenses > 0 ? (item.amount / monthlyExpenses) * 100 : 0;

                  return (
                    <div key={accId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-900 dark:text-zinc-200">
                          {item.name} <span className="text-[10px] text-slate-400 dark:text-zinc-500">· {item.type}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                            {formatIdr(item.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#131d35] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM & EXCHANGE RATE SETTINGS */}
      <div className="max-w-xl">
        {/* USD / IDR Exchange Rate Setting */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">USD / IDR Exchange Rate</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>{rateSource || 'Google Finance'}</span>
            </div>
          </div>

          {/* Rate Highlight Card */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">Benchmark Rate</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
                    Rp {Math.round(usdIdrRate).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">/ USD</span>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleFetchNow}
                disabled={isRateFetching}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131d35] hover:bg-slate-100 dark:hover:bg-[#1a2645] border border-slate-200 dark:border-[#243252] text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isRateFetching ? 'animate-spin' : ''}`} />
                <span>{isRateFetching ? 'Syncing...' : 'Sync Rate'}</span>
              </button>
            </div>

            {/* Status & Timestamp */}
            <div className="pt-1.5 border-t border-slate-200 dark:border-[#18223a] flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-zinc-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                <span>Updated: <strong className="text-slate-700 dark:text-zinc-400 font-mono">{formatLastUpdated(rateLastUpdated)}</strong></span>
              </div>
              {fetchToast && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                  ✓ {fetchToast}
                </span>
              )}
            </div>
          </div>

          {/* Auto-Update Every 12 Hours Toggle */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span className="truncate">Auto 12h spot sync</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRateAutoUpdate(!isRateAutoUpdate)}
              role="switch"
              aria-checked={isRateAutoUpdate}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 focus:outline-none ${
                isRateAutoUpdate ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-[#1e2946]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-150 ${
                  isRateAutoUpdate ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Manual Rate Override Form */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
              <span>Manual Rate Override</span>
            </div>
            <form onSubmit={handleUpdateRate} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-zinc-500 font-mono">1 USD = Rp</span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080d1a] border border-slate-200 dark:border-[#1e2946] rounded-lg pl-24 pr-3 py-2 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-100 dark:bg-[#131d35] hover:bg-slate-200 dark:hover:bg-[#1a2645] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#243252] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                {rateSaved ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> : null}
                <span>{rateSaved ? 'Saved' : 'Save Rate'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
