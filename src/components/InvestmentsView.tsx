import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  TrendingUp,
  Edit2,
  Trash2,
  Building,
  Landmark,
  Coins,
  Globe,
  DollarSign,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMasked } from '../lib/formatters';
import { Investment } from '../types';

export const InvestmentsView: React.FC = () => {
  const {
    investments,
    stats,
    holdingTypes,
    isPrivacyMode,
    usdIdrRate,
    setIsAddInvestmentOpen,
    setEditingInvestment,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsHoldingTypesModalOpen,
    deleteInvestment,
    showNotification,
  } = useFinance();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<Investment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryAllocations = stats?.categoryAllocations || {};

  const filteredInvestments = investments.filter((inv) => {
    if (activeCategoryFilter === 'all') return true;
    return inv.category === activeCategoryFilter;
  });

  // Calculate totals
  let totalInvestedIdr = 0;
  let totalValueIdr = 0;
  let totalValueUsd = 0;

  investments.forEach((inv) => {
    if (inv.currency === 'USD') {
      const valUsd = inv.currentValue || 0;
      totalValueUsd += valUsd;
      totalValueIdr += valUsd * usdIdrRate;
      totalInvestedIdr += (inv.amountInvested || 0) * usdIdrRate;
    } else {
      const valIdr = inv.currentValue || 0;
      totalValueIdr += valIdr;
      totalValueUsd += valIdr / (usdIdrRate || 1);
      totalInvestedIdr += inv.amountInvested || 0;
    }
  });

  const totalPnlIdr = totalValueIdr - totalInvestedIdr;
  const totalPnlPercent = totalInvestedIdr > 0 ? (totalPnlIdr / totalInvestedIdr) * 100 : 0;

  const categoryTabs = [
    { id: 'all', label: 'All' },
    ...holdingTypes.map((ht) => ({
      id: ht.id,
      label: ht.label,
    })),
  ];

  const getClassIcon = (id: string) => {
    switch (id) {
      case 'Saham':
        return <Building className="w-3 h-3 shrink-0" />;
      case 'RDPU':
        return <Landmark className="w-3 h-3 shrink-0" />;
      case 'Bitcoin':
        return <Coins className="w-3 h-3 shrink-0" />;
      case 'ETF USA':
        return <Globe className="w-3 h-3 shrink-0" />;
      case 'USD':
        return <DollarSign className="w-3 h-3 shrink-0" />;
      default:
        return <Layers className="w-3 h-3 shrink-0" />;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const target = investments.find((i) => i.id === id);
      await deleteInvestment(id);
      showNotification({
        type: 'info',
        title: 'Asset Position Deleted',
        accountName: target?.name,
      });
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
      setDeletingId(null);
    } catch (err) {
      console.error('Delete investment failed:', err);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in pb-12 min-w-0">
      {/* HEADER & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Investment Portfolio
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              · {investments.length} assets
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
            Stocks, mutual funds, crypto, and cash equivalents
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsHoldingTypesModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#11192e] hover:bg-slate-50 dark:hover:bg-[#17223d] text-slate-700 dark:text-zinc-300 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Add Asset Types</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('bank_to_investment');
              setIsTransferOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Fund Investment</span>
          </button>
        </div>
      </div>

      {/* PORTFOLIO TOTAL SUMMARY STRIP */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-[#161b26] dark:via-[#12151d] dark:to-[#101218] border border-indigo-200/90 dark:border-[#2a3347] shadow-sm min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 md:gap-y-0">
          {/* Total Market Value */}
          <div className="col-span-2 md:col-span-1 pb-2 md:pb-0 md:pr-4 border-b md:border-b-0 md:border-r border-indigo-200/70 dark:border-[#242b3c] flex items-center justify-between md:block gap-2 min-w-0">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-indigo-700/80 dark:text-zinc-400 block truncate">
                Total Market Value
              </span>
              <span className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums block truncate md:hidden ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                ≈ {formatMasked(totalValueUsd, 'USD', isPrivacyMode)}
              </span>
            </div>
            <p className={`text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums md:mt-0.5 shrink-0 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalValueIdr, 'IDR', isPrivacyMode)}
            </p>
            <span className={`hidden md:block text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              ≈ {formatMasked(totalValueUsd, 'USD', isPrivacyMode)}
            </span>
          </div>

          {/* Cost Basis */}
          <div className="pr-3 md:px-4 border-r border-slate-200/80 dark:border-[#242b3c] min-w-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
              Cost Basis
            </span>
            <p className={`text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 tabular-nums mt-0.5 truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalInvestedIdr, 'IDR', isPrivacyMode)}
            </p>
            <span className="hidden md:block text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 truncate">
              Deployed capital
            </span>
          </div>

          {/* Unrealized Return (PnL) */}
          <div className="pl-3 md:pl-4 min-w-0">
            <div className="flex items-center justify-between gap-1.5 text-[11px]">
              <span className="font-medium text-slate-500 dark:text-zinc-400 truncate">
                Unrealized PnL
              </span>
              <span
                className={`md:hidden font-semibold tabular-nums shrink-0 ${
                  totalPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {totalPnlPercent >= 0 ? '+' : ''}
                {totalPnlPercent.toFixed(1)}%
              </span>
            </div>
            <p
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 truncate ${
                totalPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              } ${isPrivacyMode ? 'privacy-blur' : ''}`}
            >
              {totalPnlIdr >= 0 ? '+' : ''}
              {formatMasked(totalPnlIdr, 'IDR', isPrivacyMode)}
            </p>
            <span
              className={`hidden md:block text-[10px] font-medium tabular-nums mt-0.5 truncate ${
                totalPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {totalPnlPercent >= 0 ? '+' : ''}
              {totalPnlPercent.toFixed(2)}% ROI
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT ASSET CLASS BREAKDOWN (SINGLE HAIRLINE-DIVIDED GRID) */}
      {holdingTypes.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 sm:px-4 border-b border-slate-100 dark:border-[#1b2540]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                Holdings by Class
              </span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
                · {investments.length}
              </span>
            </div>
            {activeCategoryFilter !== 'all' ? (
              <button
                onClick={() => setActiveCategoryFilter('all')}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
              >
                Show all
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                Tap to filter
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-100 dark:bg-[#161f38]">
            {holdingTypes.map((ht, idx) => {
              const alloc = categoryAllocations[ht.id];
              const isUsd = ht.defaultCurrency === 'USD';
              const isActive = activeCategoryFilter === ht.id;
              const isLastOddMobile =
                holdingTypes.length % 2 === 1 && idx === holdingTypes.length - 1;
              const badgeColor = ht.badgeColor || '#3b82f6';

              return (
                <button
                  key={ht.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(isActive ? 'all' : ht.id)}
                  className={`px-3 py-2 text-left transition-colors cursor-pointer min-w-0 ${
                    isLastOddMobile ? 'col-span-2 sm:col-span-1' : ''
                  } ${
                    isActive
                      ? 'bg-indigo-50/90 dark:bg-[#131d35]'
                      : 'bg-white dark:bg-[#0b1020] hover:bg-slate-50 dark:hover:bg-[#0f1629]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono mb-0.5">
                    <span
                      className="font-bold flex items-center gap-1 truncate"
                      style={{ color: badgeColor }}
                    >
                      {getClassIcon(ht.id)}
                      <span className="truncate">{ht.label}</span>
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 shrink-0 tabular-nums">
                      {alloc?.count || 0}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                    <span className={`text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {isUsd
                        ? formatMasked(alloc?.usdValue || 0, 'USD', isPrivacyMode)
                        : formatMasked(alloc?.idrValue || 0, 'IDR', isPrivacyMode)}
                    </span>
                    {isUsd && (
                      <span className={`text-[10px] font-mono tabular-nums text-slate-400 dark:text-zinc-500 truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(alloc?.idrValue || 0, 'IDR', isPrivacyMode)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SPLIT MASTER-DETAIL WORKSPACE */}
      <div className="flex flex-col lg:flex-row gap-3 items-start min-w-0">
        {/* MASTER LIST / TABLE WITH INTEGRATED FILTER STRIP */}
        <div className="flex-1 w-full min-w-0 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm overflow-hidden">
          {/* Integrated Scrollable Category Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-[#1b2540] overflow-x-auto no-scrollbar">
            {categoryTabs.map((tab) => {
              const isActive = activeCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`relative px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#0f1629]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="investment-category-filter-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-md bg-indigo-50 dark:bg-[#131d35] border border-indigo-200 dark:border-[#253559] pointer-events-none"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {filteredInvestments.length === 0 ? (
            <div className="p-7 text-center font-mono">
              <TrendingUp className="w-6 h-6 text-slate-400 dark:text-zinc-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-300">No assets in this category</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                Use "Fund Investment" to initialize and fund an investment position.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE COMPACT POSITION LIST (< 768px) */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-[#162038]">
                {filteredInvestments.map((inv) => {
                  const isUsd = inv.currency === 'USD';
                  const effectiveRate =
                    inv.customExchangeRate && inv.customExchangeRate > 0
                      ? inv.customExchangeRate
                      : usdIdrRate;
                  const cost = inv.amountInvested || 0;
                  const current = inv.currentValue || 0;
                  const pnl = current - cost;
                  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                  const idrEquivalent = isUsd ? current * effectiveRate : current;
                  const isSelected = selectedAsset?.id === inv.id;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedAsset(isSelected ? null : inv)}
                      className={`px-3.5 py-2.5 transition-colors cursor-pointer space-y-1 ${
                        isSelected
                          ? 'bg-slate-50 dark:bg-[#131d35]'
                          : 'hover:bg-slate-50/70 dark:hover:bg-[#0f1629]'
                      }`}
                    >
                      {/* Line 1: Name + Currency & Market Value */}
                      <div className="flex items-start justify-between gap-2.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 truncate">
                              {inv.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                              · {inv.currency}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                            <span className="truncate">{inv.category}</span>
                            {inv.platform && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{inv.platform}</span>
                              </>
                            )}
                            {inv.units !== undefined && inv.units !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums shrink-0">{inv.units} u</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className={`text-right shrink-0 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                          <div className="text-[13px] font-bold text-slate-900 dark:text-zinc-100">
                            {formatMasked(current, inv.currency, isPrivacyMode)}
                          </div>
                          {isUsd && (
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                              ≈ {formatMasked(idrEquivalent, 'IDR', isPrivacyMode)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Line 2: Cost & Return */}
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <div className="min-w-0 truncate text-slate-500 dark:text-zinc-400">
                          <span>Cost </span>
                          <span className={`font-medium text-slate-700 dark:text-zinc-300 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                            {formatMasked(cost, inv.currency, isPrivacyMode)}
                          </span>
                        </div>

                        <span
                          className={`font-semibold tabular-nums shrink-0 ${
                            pnl >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                        >
                          {pnl >= 0 ? '+' : ''}
                          {formatMasked(pnl, inv.currency, isPrivacyMode)} ({pnlPercent >= 0 ? '+' : ''}
                          {pnlPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP 8-COLUMN COMPACT TABLE (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1b2540] bg-slate-50 dark:bg-[#080d1a] text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 select-none">
                      <th className="py-2 px-3 font-semibold">Asset / Ticker</th>
                      <th className="py-2 px-3 font-semibold">Class</th>
                      <th className="py-2 px-3 font-semibold">Broker</th>
                      <th className="py-2 px-3 font-semibold text-right">Units</th>
                      <th className="py-2 px-3 font-semibold text-right">Cost Basis</th>
                      <th className="py-2 px-3 font-semibold text-right">Market Value</th>
                      <th className="py-2 px-3 font-semibold text-right">Unrealized PnL</th>
                      <th className="py-2 px-3 font-semibold text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#162038]">
                    {filteredInvestments.map((inv) => {
                      const isUsd = inv.currency === 'USD';
                      const effectiveRate =
                        inv.customExchangeRate && inv.customExchangeRate > 0
                          ? inv.customExchangeRate
                          : usdIdrRate;
                      const cost = inv.amountInvested || 0;
                      const current = inv.currentValue || 0;
                      const pnl = current - cost;
                      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                      const idrEquivalent = isUsd ? current * effectiveRate : current;
                      const isSelected = selectedAsset?.id === inv.id;

                      return (
                        <tr
                          key={inv.id}
                          onClick={() => setSelectedAsset(isSelected ? null : inv)}
                          className={`transition-colors cursor-pointer group ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-[#131d35]'
                              : 'hover:bg-slate-50 dark:hover:bg-[#0f1629]'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {inv.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                                · {inv.currency}
                              </span>
                            </div>
                          </td>

                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                            {inv.category}
                          </td>

                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                            {inv.platform || '—'}
                          </td>

                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-zinc-300">
                            {inv.units !== undefined && inv.units !== null ? inv.units : '—'}
                          </td>

                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                            <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                              {formatMasked(cost, inv.currency, isPrivacyMode)}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-zinc-100">
                            <div className={isPrivacyMode ? 'privacy-blur' : ''}>
                              <div>{formatMasked(current, inv.currency, isPrivacyMode)}</div>
                              {isUsd && (
                                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                                  ≈ {formatMasked(idrEquivalent, 'IDR', isPrivacyMode)}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            <div className={isPrivacyMode ? 'privacy-blur' : ''}>
                              <span
                                className={`font-semibold ${
                                  pnl >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {pnl >= 0 ? '+' : ''}
                                {formatMasked(pnl, inv.currency, isPrivacyMode)}
                              </span>
                              <span
                                className={`ml-1 text-[10px] ${
                                  pnl >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                ({pnlPercent >= 0 ? '+' : ''}
                                {pnlPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 inline transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* COMPACT DETAIL INSPECTION DRAWER */}
        <AnimatePresence mode="wait">
          {selectedAsset && (
            <motion.div
              key={selectedAsset.id}
              initial={{ opacity: 0, x: 14, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full lg:w-80 bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] rounded-xl p-3.5 space-y-3 shrink-0 shadow-md"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#1b2540]">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                    Position Details
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                    {selectedAsset.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                    <span>{selectedAsset.category}</span>
                    {selectedAsset.platform && (
                      <>
                        <span>·</span>
                        <span>{selectedAsset.platform}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-[#141d33] cursor-pointer shrink-0"
                  title="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Financial Telemetry */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946]">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Current Value</span>
                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                      {formatMasked(selectedAsset.currentValue || 0, selectedAsset.currency, isPrivacyMode)}
                    </span>
                    {selectedAsset.currency === 'USD' && (
                      <div className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums">
                        ≈ {formatMasked((selectedAsset.currentValue || 0) * (selectedAsset.customExchangeRate || usdIdrRate), 'IDR', isPrivacyMode)}
                        {selectedAsset.customExchangeRate ? (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-mono">
                            (FX: Rp {selectedAsset.customExchangeRate.toLocaleString('id-ID')})
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946]">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Cost Basis</span>
                  <span className="font-semibold font-mono text-slate-700 dark:text-zinc-300 tabular-nums">
                    {formatMasked(selectedAsset.amountInvested || 0, selectedAsset.currency, isPrivacyMode)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946]">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Unrealized Return</span>
                  {(() => {
                    const cost = selectedAsset.amountInvested || 0;
                    const current = selectedAsset.currentValue || 0;
                    const pnl = current - cost;
                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                    return (
                      <div className="text-right font-mono">
                        <span
                          className={`font-bold tabular-nums ${
                            pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}
                          {formatMasked(pnl, selectedAsset.currency, isPrivacyMode)}
                        </span>
                        <div
                          className={`text-[10px] tabular-nums ${
                            pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {pnlPct >= 0 ? '+' : ''}
                          {pnlPct.toFixed(2)}% ROI
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {selectedAsset.units !== undefined && selectedAsset.units !== null && (
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946]">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Units / Lots</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-zinc-200 tabular-nums">
                      {selectedAsset.units}
                    </span>
                  </div>
                )}

                {selectedAsset.notes && (
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] text-xs text-slate-600 dark:text-zinc-400">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 block">Notes</span>
                    <p className="italic text-[11px]">"{selectedAsset.notes}"</p>
                  </div>
                )}
              </div>

              {/* Quick Actions inside Drawer */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#1b2540]">
                <button
                  onClick={() => {
                    setTransferInitialMode('bank_to_investment');
                    setIsTransferOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Fund from Bank Account</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setEditingInvestment(selectedAsset);
                      setIsAddInvestmentOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#11192e] hover:bg-slate-200 dark:hover:bg-[#17223d] text-slate-800 dark:text-zinc-200 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                    <span>Edit Asset</span>
                  </button>

                  {deletingId === selectedAsset.id ? (
                    <button
                      onClick={() => handleDelete(selectedAsset.id)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      <span>Confirm?</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeletingId(selectedAsset.id)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#11192e] hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
