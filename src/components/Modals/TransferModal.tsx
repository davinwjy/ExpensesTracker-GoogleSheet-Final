import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ArrowRightLeft,
  ArrowUpDown,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Plus,
  Layers,
  Sparkles,
  Info,
  Loader2,
  Wallet,
  Calendar,
  FileText,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIdr, formatUsd, formatSameAccountTransferError } from '../../lib/formatters';
import { InvestmentCategory } from '../../types';

const DEFAULT_CATEGORY_OPTIONS: { id: InvestmentCategory; label: string; badge: string; isUsd: boolean }[] = [
  { id: 'Saham', label: 'Indonesian Stocks', badge: 'IDR', isUsd: false },
  { id: 'ETF USA', label: 'US Stocks & ETFs', badge: 'USD ($)', isUsd: true },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', badge: 'IDR', isUsd: false },
  { id: 'RDPU', label: 'Money Market (RDPU)', badge: 'IDR', isUsd: false },
  { id: 'USD', label: 'USD Cash Buffer', badge: 'USD ($)', isUsd: true },
];

const PLATFORM_SUGGESTIONS = [
  'Stockbit',
  'Bibit',
  'Gotrade',
  'Ajaib',
  'Tokocrypto',
  'Indodax',
  'Interactive Brokers',
  'BCA Sekuritas',
];

export const TransferModal: React.FC = () => {
  const {
    isTransferOpen,
    setIsTransferOpen,
    transferInitialMode,
    accounts,
    investments,
    holdingTypes,
    setIsHoldingTypesModalOpen,
    usdIdrRate,
    transferFunds,
    showNotification,
  } = useFinance();

  const [mode, setMode] = useState<'account_to_account' | 'bank_to_investment'>('bank_to_investment');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [toInvestmentId, setToInvestmentId] = useState<string>('');

  // Target investment choice: 'existing' or 'new'
  const [targetType, setTargetType] = useState<'existing' | 'new'>('existing');

  // New investment fields (No currency selection needed - inferred by asset class)
  const [newInvName, setNewInvName] = useState<string>('');
  const [newInvCategory, setNewInvCategory] = useState<InvestmentCategory>('Saham');
  const [newInvPlatform, setNewInvPlatform] = useState<string>('');
  const [newInvUnits, setNewInvUnits] = useState<string>('');

  // Amount & Editable Conversion
  const [amountIdr, setAmountIdr] = useState<string>('');
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>(usdIdrRate.toString());
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swapRotated, setSwapRotated] = useState(false);

  const transferableAccounts = React.useMemo(
    () => accounts.filter((a) => a.type === 'bank' || a.type === 'cash'),
    [accounts]
  );

  const destinationAccounts = React.useMemo(
    () => transferableAccounts.filter((a) => a.id !== fromAccountId),
    [transferableAccounts, fromAccountId]
  );

  const wasOpenRef = React.useRef(false);
  const lastInitialModeRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isTransferOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentMode = transferInitialMode || 'bank_to_investment';
      const isModeChanged = currentMode !== lastInitialModeRef.current;

      if (isFreshOpen || isModeChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastInitialModeRef.current = currentMode;
        setMode(currentMode);
        resetFields();
      }
    } else {
      wasOpenRef.current = false;
      lastInitialModeRef.current = undefined;
    }
  }, [isTransferOpen, transferInitialMode]);

  // Keep selected source/destination accounts valid and distinct without resetting typed inputs
  useEffect(() => {
    if (!isTransferOpen) return;

    const hasValidFrom = transferableAccounts.some((a) => a.id === fromAccountId);
    const effectiveFromId = hasValidFrom
      ? fromAccountId
      : transferableAccounts[0]?.id || '';

    if (effectiveFromId !== fromAccountId) {
      setFromAccountId(effectiveFromId);
    }

    const hasValidTo = transferableAccounts.some(
      (a) => a.id === toAccountId && a.id !== effectiveFromId
    );
    if (!hasValidTo) {
      const nextDest =
        transferableAccounts.find((a) => a.id !== effectiveFromId)?.id || '';
      if (nextDest !== toAccountId) {
        setToAccountId(nextDest);
      }
    }

    if (!toInvestmentId && investments.length > 0) {
      setToInvestmentId(investments[0].id);
    }
  }, [isTransferOpen, transferableAccounts, investments, fromAccountId, toAccountId, toInvestmentId]);

  const resetFields = () => {
    setIsSubmitting(false);
    const defaultFrom = transferableAccounts[0]?.id || '';
    const defaultTo =
      transferableAccounts.find((a) => a.id !== defaultFrom)?.id || '';
    setFromAccountId(defaultFrom);
    setToAccountId(defaultTo);

    const firstInv = investments.length > 0 ? investments[0] : null;
    setToInvestmentId(firstInv ? firstInv.id : '');
    setTargetType(investments.length === 0 ? 'new' : 'existing');
    setNewInvName('');
    setNewInvCategory('Saham');
    setNewInvPlatform('');
    setNewInvUnits('');
    setAmountIdr('');
    setAmountUsd('');

    const initialRate = firstInv?.customExchangeRate || usdIdrRate;
    setExchangeRate(initialRate.toString());
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleFromAccountChange = (newFromId: string) => {
    const previousFromId = fromAccountId;
    setFromAccountId(newFromId);
    if (error) setError('');

    if (!toAccountId || toAccountId === newFromId) {
      const swappedDest =
        previousFromId &&
        previousFromId !== newFromId &&
        transferableAccounts.some((a) => a.id === previousFromId)
          ? previousFromId
          : transferableAccounts.find((a) => a.id !== newFromId)?.id || '';
      setToAccountId(swappedDest);
    }
  };

  const handleSwapAccounts = () => {
    if (isSubmitting || transferableAccounts.length < 2) return;
    const trimmedFrom = fromAccountId.trim();
    const trimmedTo = toAccountId.trim();
    if (!trimmedFrom || !trimmedTo || trimmedFrom === trimmedTo) return;
    setFromAccountId(trimmedTo);
    setToAccountId(trimmedFrom);
    setSwapRotated((prev) => !prev);
    if (error) setError('');
  };

  const handleClose = () => {
    resetFields();
    setIsTransferOpen(false);
  };

  const selectedSourceAccount = accounts.find((a) => a.id === fromAccountId);
  const selectedDestAccount = accounts.find((a) => a.id === toAccountId);
  const selectedInvestment = investments.find((i) => i.id === toInvestmentId);

  const numericAmount = Number(amountIdr) || 0;
  const numericRate = Number(exchangeRate) || selectedInvestment?.customExchangeRate || usdIdrRate;

  const selectedNewHoldingType = holdingTypes.find((h) => h.id === newInvCategory);

  const categoryOptions =
    holdingTypes && holdingTypes.length > 0
      ? holdingTypes.map((h) => ({
          id: h.id,
          label: h.label,
          badge: h.defaultCurrency === 'USD' ? 'USD ($)' : 'IDR',
          isUsd: h.defaultCurrency === 'USD',
        }))
      : DEFAULT_CATEGORY_OPTIONS;

  // Determine if target asset operates in USD
  const isUsdTarget =
    mode === 'bank_to_investment' &&
    (targetType === 'existing'
      ? selectedInvestment?.currency === 'USD' || selectedInvestment?.category === 'ETF USA' || selectedInvestment?.category === 'USD'
      : selectedNewHoldingType?.defaultCurrency === 'USD' || newInvCategory === 'ETF USA' || newInvCategory === 'USD');

  // Bidirectional amount handlers: user can edit IDR, USD amount, or Rate
  const handleAmountIdrChange = (val: string) => {
    setAmountIdr(val);
    const numIdr = Number(val);
    if (!isNaN(numIdr) && numIdr > 0) {
      const rate = Number(exchangeRate) || selectedInvestment?.customExchangeRate || usdIdrRate;
      if (rate > 0) {
        setAmountUsd((numIdr / rate).toFixed(2));
      }
    } else {
      setAmountUsd('');
    }
  };

  const handleAmountUsdChange = (val: string) => {
    setAmountUsd(val);
    const numUsd = Number(val);
    const numIdr = Number(amountIdr);
    if (!isNaN(numUsd) && numUsd > 0 && !isNaN(numIdr) && numIdr > 0) {
      const calculatedRate = (numIdr / numUsd).toFixed(2);
      setExchangeRate(calculatedRate);
    }
  };

  const handleExchangeRateChange = (val: string) => {
    setExchangeRate(val);
    const numRate = Number(val);
    const numIdr = Number(amountIdr);
    if (!isNaN(numRate) && numRate > 0 && !isNaN(numIdr) && numIdr > 0) {
      setAmountUsd((numIdr / numRate).toFixed(2));
    }
  };

  const handleResetToGoogleRate = () => {
    setExchangeRate(usdIdrRate.toString());
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && usdIdrRate > 0) {
      setAmountUsd((numIdr / usdIdrRate).toFixed(2));
    }
  };

  const handleSelectInvestment = (invId: string) => {
    setToInvestmentId(invId);
    const inv = investments.find((i) => i.id === invId);
    const rate = inv?.customExchangeRate || usdIdrRate;
    setExchangeRate(rate.toString());
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && rate > 0) {
      setAmountUsd((numIdr / rate).toFixed(2));
    }
  };

  const handleSelectCategory = (cat: InvestmentCategory) => {
    setNewInvCategory(cat);
    const rate = Number(exchangeRate) || usdIdrRate;
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && rate > 0) {
      setAmountUsd((numIdr / rate).toFixed(2));
    }
  };

  const handleQuickAdd = (inc: number) => {
    const current = Number(amountIdr) || 0;
    handleAmountIdrChange((current + inc).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedFromId = fromAccountId.trim();
    const trimmedToId = toAccountId.trim();

    if (!trimmedFromId) {
      setError('Select source account (Bank or Cash)');
      return;
    }

    if (numericAmount <= 0) {
      setError('Enter transfer amount in Rupiah');
      return;
    }

    if (mode === 'account_to_account') {
      if (transferableAccounts.length < 2) {
        setError('You need at least two different bank or cash accounts to make a transfer.');
        return;
      }
      if (!trimmedToId) {
        setError('Please choose a destination account.');
        return;
      }
      if (trimmedFromId === trimmedToId) {
        const conflictingAcc = accounts.find((a) => a.id === trimmedFromId) || selectedSourceAccount;
        setError(formatSameAccountTransferError(conflictingAcc?.name));
        return;
      }
    } else {
      if (targetType === 'existing') {
        if (!toInvestmentId) {
          setError('Select target investment asset or create a new one');
          return;
        }
      } else {
        if (!newInvName.trim()) {
          setError('Enter new investment asset name (e.g. BBCA, S&P 500 VOO, Bitcoin)');
          return;
        }
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const numericUsd = isUsdTarget && amountUsd && !isNaN(Number(amountUsd)) ? Number(amountUsd) : undefined;
      const effectiveRate = isUsdTarget && numericRate > 0 ? numericRate : undefined;

      await transferFunds({
        type: mode,
        fromAccountId: trimmedFromId,
        toAccountId: mode === 'account_to_account' ? trimmedToId : undefined,
        toInvestmentId: mode === 'bank_to_investment' && targetType === 'existing' ? toInvestmentId : undefined,
        newInvestment:
          mode === 'bank_to_investment' && targetType === 'new'
            ? {
                name: newInvName.trim(),
                category: newInvCategory,
                currency: selectedNewHoldingType?.defaultCurrency || ((newInvCategory === 'ETF USA' || newInvCategory === 'USD') ? 'USD' : 'IDR'),
                platform: newInvPlatform.trim() || undefined,
                units: newInvUnits && !isNaN(Number(newInvUnits)) ? Number(newInvUnits) : undefined,
                notes: notes.trim() || undefined,
              }
            : undefined,
        amountIdr: numericAmount,
        amountUsd: numericUsd,
        exchangeRate: effectiveRate,
        date,
        notes: notes.trim() || undefined,
      });

      const fromAcc = accounts.find((a) => a.id === trimmedFromId);
      const toAcc = accounts.find((a) => a.id === trimmedToId);
      const toInv = investments.find((i) => i.id === toInvestmentId);
      const targetLabel = mode === 'account_to_account'
        ? (toAcc?.name || 'Destination Account')
        : (targetType === 'new' ? newInvName.trim() : (toInv?.name || 'Investment Portfolio'));

      showNotification({
        type: 'success',
        txType: 'transfer',
        title: mode === 'account_to_account' ? 'Inter-Account Transfer Successful' : 'Investment Top-Up Successful',
        message: `${fromAcc?.name || 'Account'} ➔ ${targetLabel}`,
        amount: numericAmount,
        category: mode === 'account_to_account' ? 'Cash Transfer' : newInvCategory,
        accountName: fromAcc?.name,
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete transfer');
      setIsSubmitting(false);
    }
  };

  if (!isTransferOpen) return null;

  const isInsufficientSource = Boolean(
    selectedSourceAccount && numericAmount > selectedSourceAccount.balance
  );

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
      <div className="relative w-full max-w-md bg-white dark:bg-[#0b1020] border-t sm:border border-slate-200/90 dark:border-[#1b2540] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[86vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-1.5 pb-0.5 shrink-0">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-[#18223a] shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
              {mode === 'bank_to_investment' ? 'Fund Investment' : 'Account Transfer'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              {mode === 'bank_to_investment'
                ? 'Top up an asset from bank or cash'
                : 'Transfer balances between accounts'}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={resetFields}
              disabled={isSubmitting}
              title="Reset form"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="transfer-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-3.5 space-y-2.5 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-[#0f1629] rounded-lg border border-slate-200/70 dark:border-[#1e2946]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMode('bank_to_investment');
                if (error) setError('');
              }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                mode === 'bank_to_investment'
                  ? 'bg-white dark:bg-[#18233e] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a3960]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingUp
                className={`w-3.5 h-3.5 ${
                  mode === 'bank_to_investment' ? 'text-indigo-500' : 'text-slate-400'
                }`}
              />
              <span>To Investment</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMode('account_to_account');
                if (error) setError('');
              }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                mode === 'account_to_account'
                  ? 'bg-white dark:bg-[#18233e] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a3960]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowRightLeft
                className={`w-3.5 h-3.5 ${
                  mode === 'account_to_account' ? 'text-indigo-500' : 'text-slate-400'
                }`}
              />
              <span>Between Accounts</span>
            </button>
          </div>

          {/* Hero Transfer Amount Card */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <label htmlFor="transfer-amount-input" className="font-medium text-slate-700 dark:text-zinc-300">
                Transfer Amount (IDR)
              </label>
              {numericAmount > 0 && (
                <span className="font-mono font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {formatIdr(numericAmount)}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                id="transfer-amount-input"
                type="number"
                min="0"
                step="any"
                disabled={isSubmitting}
                value={amountIdr}
                onChange={(e) => handleAmountIdrChange(e.target.value)}
                placeholder="1,000,000"
                className={`w-full bg-white dark:bg-[#080d1a] border rounded-lg pl-8.5 pr-3 py-1.5 text-base font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors disabled:opacity-60 ${
                  isInsufficientSource
                    ? 'border-amber-500/60 focus:border-amber-500'
                    : 'border-slate-200 dark:border-[#243252] focus:border-indigo-500'
                }`}
                required
                autoFocus
              />
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap gap-1">
              {[100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000].map(
                (inc) => (
                  <button
                    key={inc}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickAdd(inc)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 dark:bg-[#131d35] dark:hover:bg-[#1a2645] text-[10px] font-medium text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-[#243252] transition-colors cursor-pointer tabular-nums font-mono disabled:opacity-40"
                  >
                    +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}k`}
                  </button>
                )
              )}
            </div>

            {isInsufficientSource && selectedSourceAccount && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Exceeds {selectedSourceAccount.name} balance by{' '}
                  <strong className="font-mono tabular-nums">
                    {formatIdr(numericAmount - selectedSourceAccount.balance)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Source Account */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-slate-400" />
                <span>From Account</span>
              </label>
              {selectedSourceAccount && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Available:{' '}
                  <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatIdr(selectedSourceAccount.balance)}
                  </strong>
                </span>
              )}
            </div>
            <select
              value={fromAccountId}
              disabled={isSubmitting}
              onChange={(e) => handleFromAccountChange(e.target.value)}
              className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
              required
            >
              {transferableAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {formatIdr(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Destination: Investment OR Account */}
          {mode === 'bank_to_investment' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-slate-400" />
                  <span>Target Investment</span>
                </label>

                {/* Sub-toggle: Existing vs New Holding */}
                <div className="flex p-0.5 bg-slate-100 dark:bg-[#0f1629] rounded-md border border-slate-200/70 dark:border-[#1e2946] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTargetType('existing')}
                    disabled={investments.length === 0}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
                      targetType === 'existing'
                        ? 'bg-white dark:bg-[#18233e] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-2.5 h-2.5" />
                    <span>Existing ({investments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('new')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-medium ${
                      targetType === 'new'
                        ? 'bg-white dark:bg-[#18233e] text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>New Asset</span>
                  </button>
                </div>
              </div>

              {/* OPTION A: Existing Investment */}
              {targetType === 'existing' && (
                <div className="space-y-1.5">
                  {investments.length === 0 ? (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>No assets yet. Select "New Asset" to create one.</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={toInvestmentId}
                        onChange={(e) => handleSelectInvestment(e.target.value)}
                        className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
                        required
                      >
                        {investments.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            [{inv.category}] {inv.name} ({inv.currency})
                          </option>
                        ))}
                      </select>
                      {selectedInvestment && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] text-[10px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                          <span>
                            Class: <strong className="text-slate-900 dark:text-zinc-200">{selectedInvestment.category}</strong>
                          </span>
                          <strong className={isUsdTarget ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {isUsdTarget ? 'USD ($) · Live FX' : 'IDR (Rupiah)'}
                          </strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* OPTION B: Brand-New Investment */}
              {targetType === 'new' && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70 dark:border-[#1e2946]">
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>New Investment Asset</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsHoldingTypesModalOpen(true)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Classes</span>
                    </button>
                  </div>

                  {/* Asset Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                      Asset Name / Ticker
                    </label>
                    <input
                      type="text"
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      placeholder="e.g. S&P 500 (VOO), BBCA, Bitcoin..."
                      className="w-full h-8.5 bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                      Asset Class
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {categoryOptions.map((cat) => {
                        const isSelected = newInvCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`p-1.5 rounded-lg text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-[#18233e] border-indigo-500/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'bg-white/70 dark:bg-[#080d1a] border-slate-200/80 dark:border-[#1e2946] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                            }`}
                          >
                            <div className="font-semibold text-[11px] truncate">{cat.label}</div>
                            <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">{cat.badge}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform / Broker & Units */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                        Broker / Platform
                      </label>
                      <input
                        type="text"
                        value={newInvPlatform}
                        onChange={(e) => setNewInvPlatform(e.target.value)}
                        placeholder="Gotrade, Bibit..."
                        className="w-full h-8 bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                        Units (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newInvUnits}
                        onChange={(e) => setNewInvUnits(e.target.value)}
                        placeholder="e.g. 1.25"
                        className="w-full h-8 bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PLATFORM_SUGGESTIONS.slice(0, 4).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewInvPlatform(p)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 dark:bg-[#141d33] dark:hover:bg-[#1b2744] text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-[#243252] transition-colors cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Quick Swap Divider Row */}
              <div className="relative flex items-center justify-center py-0.5">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-200/80 dark:border-[#1e2946]" />
                <button
                  type="button"
                  onClick={handleSwapAccounts}
                  disabled={
                    isSubmitting ||
                    transferableAccounts.length < 2 ||
                    !fromAccountId ||
                    !toAccountId
                  }
                  title="Swap source and destination accounts"
                  aria-label="Swap From and To accounts"
                  className="relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] hover:border-indigo-500 dark:hover:border-indigo-400 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowUpDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      swapRotated ? 'rotate-180' : ''
                    }`}
                  />
                  <span>Swap</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-slate-400" />
                    <span>To Account</span>
                  </label>
                  {selectedDestAccount && (
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Balance:{' '}
                      <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatIdr(selectedDestAccount.balance)}
                      </strong>
                    </span>
                  )}
                </div>

                {transferableAccounts.length < 2 ? (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Add another bank or cash account to transfer funds.</span>
                  </div>
                ) : (
                  <select
                    value={toAccountId}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setToAccountId(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
                    required
                  >
                    {destinationAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} — {formatIdr(acc.balance)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* USD Conversion Box */}
          {mode === 'bank_to_investment' && isUsdTarget && (
            <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-[#101622] border border-indigo-200/80 dark:border-indigo-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>USD Conversion</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetToGoogleRate}
                  className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Spot ({formatIdr(usdIdrRate)})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                    USD Received ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amountUsd}
                      onChange={(e) => handleAmountUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-8.5 bg-white dark:bg-[#0b0f17] border border-indigo-200 dark:border-indigo-500/40 focus:border-indigo-500 rounded-lg pl-6 pr-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                    FX Rate (IDR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={exchangeRate}
                      onChange={(e) => handleExchangeRateChange(e.target.value)}
                      className="w-full h-8.5 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-indigo-500 rounded-lg pl-7.5 pr-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-[#0b0f17] border border-indigo-100 dark:border-[#1d273a] text-[10px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                <span className="truncate">Credited to {targetType === 'existing' ? (selectedInvestment?.name || 'Asset') : (newInvName || 'New Asset')}:</span>
                <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                  {amountUsd && Number(amountUsd) > 0 ? `+${formatUsd(Number(amountUsd))}` : '$0.00'}
                </strong>
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Note</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="DCA, transfer..."
                className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </form>

        {/* Compact Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-slate-50/70 dark:bg-[#080d1a] border-t border-slate-100 dark:border-[#18223a] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="transfer-modal-form"
            disabled={isSubmitting}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs select-none ${
              isSubmitting
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-not-allowed opacity-60'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transferring...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>
                  {mode === 'bank_to_investment' && targetType === 'new'
                    ? 'Create & Fund'
                    : 'Confirm Transfer'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
