import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Trash2,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { InvestmentCategory } from '../../types';
import { formatIdr, formatUsd } from '../../lib/formatters';

const DEFAULT_INVESTMENT_CATEGORIES: { id: InvestmentCategory; label: string; defaultCurrency: 'IDR' | 'USD'; example: string }[] = [
  { id: 'Saham', label: 'Indonesian Stocks (Saham)', defaultCurrency: 'IDR', example: 'e.g. BBCA, BBRI, ASII' },
  { id: 'RDPU', label: 'Money Market (RDPU)', defaultCurrency: 'IDR', example: 'e.g. Sucorinvest Stable Fund' },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', defaultCurrency: 'IDR', example: 'e.g. Cold storage, Indodax, Pintu' },
  { id: 'ETF USA', label: 'US Stocks & ETFs', defaultCurrency: 'USD', example: 'e.g. VOO, QQQ, SCHD, SPY' },
  { id: 'USD', label: 'USD Holdings & Cash', defaultCurrency: 'USD', example: 'e.g. Wise USD balance, Broker cash' },
];

export const InvestmentModal: React.FC = () => {
  const {
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    editingInvestment,
    setEditingInvestment,
    holdingTypes,
    setIsHoldingTypesModalOpen,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    usdIdrRate,
    showNotification,
  } = useFinance();

  const [category, setCategory] = useState<InvestmentCategory>('Saham');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [customExchangeRate, setCustomExchangeRate] = useState<string>('');
  const [name, setName] = useState('');
  const [amountInvested, setAmountInvested] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [units, setUnits] = useState('');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoriesList = React.useMemo(
    () =>
      holdingTypes && holdingTypes.length > 0
        ? holdingTypes.map((h) => ({
            id: h.id,
            label: h.label,
            defaultCurrency: h.defaultCurrency,
            example: h.example || `e.g. ${h.label}`,
          }))
        : DEFAULT_INVESTMENT_CATEGORIES,
    [holdingTypes]
  );

  const selectedCategoryMeta = categoriesList.find((c) => c.id === category) || {
    id: category,
    label: category,
    defaultCurrency: currency,
    example: '',
  };
  const isUsd = currency === 'USD';
  const effectiveRate = isUsd
    ? (Number(customExchangeRate) > 0 ? Number(customExchangeRate) : usdIdrRate)
    : usdIdrRate;

  const wasOpenRef = React.useRef(false);
  const lastEditingInvestmentIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isAddInvestmentOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentEditingId = editingInvestment ? editingInvestment.id : null;
      const isEditingInvestmentChanged = currentEditingId !== lastEditingInvestmentIdRef.current;

      if (isFreshOpen || isEditingInvestmentChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastEditingInvestmentIdRef.current = currentEditingId;

        if (editingInvestment) {
          setCategory(editingInvestment.category);
          const matched = categoriesList.find((c) => c.id === editingInvestment.category);
          const resolvedCurrency = matched ? matched.defaultCurrency : ((editingInvestment.category === 'ETF USA' || editingInvestment.category === 'USD') ? 'USD' : 'IDR');
          setCurrency(resolvedCurrency);
          setCustomExchangeRate(editingInvestment.customExchangeRate ? editingInvestment.customExchangeRate.toString() : '');
          setName(editingInvestment.name);
          setAmountInvested(editingInvestment.amountInvested.toString());
          setCurrentValue(editingInvestment.currentValue.toString());
          setUnits(editingInvestment.units !== undefined ? editingInvestment.units.toString() : '');
          setPlatform(editingInvestment.platform || '');
          setNotes(editingInvestment.notes || '');
        } else {
          resetFields();
        }
        setError('');
        setConfirmDelete(false);
      }
    } else {
      wasOpenRef.current = false;
      lastEditingInvestmentIdRef.current = undefined;
    }
  }, [isAddInvestmentOpen, editingInvestment, categoriesList]);

  const resetFields = () => {
    setIsSubmitting(false);
    setCategory('Saham');
    setCurrency('IDR');
    setCustomExchangeRate('');
    setName('');
    setAmountInvested('');
    setCurrentValue('');
    setUnits('');
    setPlatform('');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetFields();
    setEditingInvestment(null);
    setIsAddInvestmentOpen(false);
  };

  const handleCategoryChange = (newCat: InvestmentCategory) => {
    setCategory(newCat);
    const matched = categoriesList.find((c) => c.id === newCat);
    const resolvedCurrency = matched ? matched.defaultCurrency : ((newCat === 'ETF USA' || newCat === 'USD') ? 'USD' : 'IDR');
    setCurrency(resolvedCurrency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an investment name or ticker');
      return;
    }

    const parsedInvested = Number(amountInvested);
    if (isNaN(parsedInvested) || parsedInvested < 0) {
      setError('Please enter a valid invested amount');
      return;
    }

    const parsedCurrent = currentValue !== '' ? Number(currentValue) : parsedInvested;
    if (isNaN(parsedCurrent) || parsedCurrent < 0) {
      setError('Please enter a valid current value');
      return;
    }

    const parsedCustomRate = isUsd && customExchangeRate && !isNaN(Number(customExchangeRate)) && Number(customExchangeRate) > 0
      ? Number(customExchangeRate)
      : undefined;

    const matched = categoriesList.find((c) => c.id === category);
    const resolvedCurrency: 'IDR' | 'USD' = matched ? matched.defaultCurrency : ((category === 'ETF USA' || category === 'USD') ? 'USD' : 'IDR');

    setIsSubmitting(true);
    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, {
          name: name.trim(),
          category,
          currency: resolvedCurrency,
          amountInvested: parsedInvested,
          currentValue: parsedCurrent,
          customExchangeRate: parsedCustomRate,
          units: units ? Number(units) : undefined,
          platform: platform.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        showNotification({
          type: 'success',
          title: 'Holding Updated',
          accountName: name.trim(),
        });
      } else {
        await addInvestment({
          name: name.trim(),
          category,
          currency: resolvedCurrency,
          amountInvested: parsedInvested,
          currentValue: parsedCurrent,
          customExchangeRate: parsedCustomRate,
          units: units ? Number(units) : undefined,
          platform: platform.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        showNotification({
          type: 'success',
          title: 'Holding Added',
          accountName: name.trim(),
          amount: resolvedCurrency === 'IDR' ? parsedInvested : Math.round(parsedInvested * (parsedCustomRate || usdIdrRate)),
        });
      }

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingInvestment) return;
    const targetName = editingInvestment.name;
    setIsSubmitting(true);
    try {
      await deleteInvestment(editingInvestment.id);
      showNotification({
        type: 'info',
        title: 'Holding Removed',
        accountName: targetName,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete investment');
      setIsSubmitting(false);
    }
  };

  const invNumber = Number(amountInvested) || 0;
  const curNumber = currentValue !== '' ? Number(currentValue) : invNumber;
  const pnl = curNumber - invNumber;
  const pnlPercent = invNumber > 0 ? (pnl / invNumber) * 100 : 0;

  if (!isAddInvestmentOpen || !editingInvestment) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="no-pull-to-refresh fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1017] border-t sm:border border-slate-200/90 dark:border-[#1c2536] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Clean Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-[#161e2e] shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
              Edit Investment Holding
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Update market valuation, principal cost, and broker details
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetFields}
              disabled={isSubmitting}
              title="Reset form"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151d2c] transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151d2c] transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="investment-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Asset Class</span>
              </label>
              <button
                type="button"
                onClick={() => setIsHoldingTypesModalOpen(true)}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3 h-3" />
                <span>Manage Classes</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-[#111723] rounded-xl border border-slate-200/70 dark:border-[#1c2536]">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-1.5 px-2.5 rounded-lg text-center whitespace-nowrap transition-all cursor-pointer flex-1 min-w-[75px] ${
                    category === cat.id
                      ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white border border-slate-200/80 dark:border-[#2a364f] shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span className="block text-xs">{cat.id}</span>
                  <span className="block text-[10px] opacity-70 font-mono">
                    {cat.defaultCurrency}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Asset Name / Ticker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <span>Asset Name / Ticker</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedCategoryMeta.example}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Hero Principal & Market Valuation Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Principal Cost ({isUsd ? 'USD' : 'IDR'})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                    {isUsd ? '$' : 'Rp'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amountInvested}
                    onChange={(e) => setAmountInvested(e.target.value)}
                    placeholder={isUsd ? '100.00' : '1,000,000'}
                    className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Current Value ({isUsd ? 'USD' : 'IDR'})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                    {isUsd ? '$' : 'Rp'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder={amountInvested || (isUsd ? '100.00' : '1,000,000')}
                    className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-8 pr-3 text-sm font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Live PnL Preview */}
            {invNumber > 0 && (
              <div className="px-3 py-2 bg-white dark:bg-[#0b0f17] rounded-xl border border-slate-200/80 dark:border-[#222d42] flex flex-wrap items-center justify-between text-xs gap-2">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400">Unrealized Return: </span>
                  <span
                    className={`font-bold font-mono tabular-nums ${
                      pnl >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {pnl >= 0 ? '+' : ''}
                    {isUsd ? formatUsd(pnl) : formatIdr(pnl)} ({pnlPercent >= 0 ? '+' : ''}
                    {pnlPercent.toFixed(2)}%)
                  </span>
                </div>
                {isUsd && (
                  <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                    IDR Value:{' '}
                    <strong className="text-slate-900 dark:text-zinc-200 font-mono tabular-nums">
                      {formatIdr(curNumber * effectiveRate)}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Broker Exchange Rate (Only shown when currency is USD) */}
          {isUsd && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-[#101622] border border-indigo-200/80 dark:border-indigo-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-indigo-800 dark:text-indigo-300">
                  Broker Exchange Rate (IDR per USD)
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  Spot: {formatIdr(usdIdrRate)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  Rp
                </span>
                <input
                  type="number"
                  step="any"
                  value={customExchangeRate}
                  onChange={(e) => setCustomExchangeRate(e.target.value)}
                  placeholder={usdIdrRate.toString()}
                  className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-indigo-500 rounded-xl pl-8 pr-3 text-xs font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Units & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Quantity / Units (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder={category === 'Bitcoin' ? 'e.g. 0.015' : 'e.g. 10'}
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Platform / Broker (Optional)
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. GoTrade, Bibit, Stockbit..."
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Note (Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly DCA, long-term hold..."
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Clean Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50/70 dark:bg-[#090d14] border-t border-slate-100 dark:border-[#161e2e] flex items-center justify-between gap-2">
          {editingInvestment ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="h-9 px-3 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#151d2c] transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="investment-modal-form"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white cursor-pointer disabled:opacity-50 transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
