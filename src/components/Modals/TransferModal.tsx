import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ArrowRightLeft,
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
import { formatIdr, formatUsd } from '../../lib/formatters';
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

  // Bind default accounts/investments if modal opened while data was still syncing, without resetting typed inputs
  useEffect(() => {
    if (!isTransferOpen) return;
    if (!fromAccountId && accounts.length > 0) {
      setFromAccountId(accounts[0].id);
    }
    if (!toAccountId && accounts.length > 1) {
      setToAccountId(accounts[1].id);
    }
    if (!toInvestmentId && investments.length > 0) {
      setToInvestmentId(investments[0].id);
    }
  }, [isTransferOpen, accounts, investments, fromAccountId, toAccountId, toInvestmentId]);

  const resetFields = () => {
    setIsSubmitting(false);
    setFromAccountId(accounts.length > 0 ? accounts[0].id : '');
    if (accounts.length > 1) {
      setToAccountId(accounts[1].id);
    } else {
      setToAccountId('');
    }

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

    if (!fromAccountId) {
      setError('Select source account (Bank or Cash)');
      return;
    }

    if (numericAmount <= 0) {
      setError('Enter transfer amount in Rupiah');
      return;
    }

    if (mode === 'account_to_account') {
      if (!toAccountId) {
        setError('Select destination account');
        return;
      }
      if (fromAccountId === toAccountId) {
        setError('Source and destination accounts cannot be the same');
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
        fromAccountId,
        toAccountId: mode === 'account_to_account' ? toAccountId : undefined,
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

      const fromAcc = accounts.find((a) => a.id === fromAccountId);
      const toAcc = accounts.find((a) => a.id === toAccountId);
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
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1017] border-t sm:border border-slate-200/90 dark:border-[#1c2536] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Clean Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-[#161e2e] shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
              {mode === 'bank_to_investment' ? 'Fund Investment' : 'Account Transfer'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {mode === 'bank_to_investment'
                ? 'Top up an investment holding directly from your bank or cash'
                : 'Transfer balances between your bank accounts or cash wallets'}
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
          id="transfer-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#111723] rounded-xl border border-slate-200/70 dark:border-[#1c2536]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setMode('bank_to_investment')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                mode === 'bank_to_investment'
                  ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
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
              onClick={() => setMode('account_to_account')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                mode === 'account_to_account'
                  ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowRightLeft
                className={`w-3.5 h-3.5 ${
                  mode === 'account_to_account' ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span>Between Accounts</span>
            </button>
          </div>

          {/* Hero Transfer Amount Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <label htmlFor="transfer-amount-input" className="font-medium text-slate-700 dark:text-zinc-300">
                Transfer Amount (IDR)
              </label>
              {numericAmount > 0 && (
                <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIdr(numericAmount)}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500 select-none">
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
                className={`w-full bg-white dark:bg-[#0b0f17] border rounded-xl pl-10 pr-3.5 py-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors disabled:opacity-60 ${
                  isInsufficientSource
                    ? 'border-amber-500/60 focus:border-amber-500'
                    : 'border-slate-200 dark:border-[#222d42] focus:border-emerald-500'
                }`}
                required
                autoFocus
              />
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000].map(
                (inc) => (
                  <button
                    key={inc}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickAdd(inc)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#151d2c] dark:hover:bg-[#1c263a] text-[11px] font-medium text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-[#232f46] transition-colors cursor-pointer tabular-nums font-mono disabled:opacity-40"
                  >
                    +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}k`}
                  </button>
                )
              )}
            </div>

            {isInsufficientSource && selectedSourceAccount && (
              <div className="mt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
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
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
              required
            >
              {accounts
                .filter((a) => a.type === 'bank' || a.type === 'cash')
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {formatIdr(acc.balance)}
                  </option>
                ))}
            </select>
          </div>

          {/* Destination: Investment OR Account */}
          {mode === 'bank_to_investment' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target Investment</span>
                </label>

                {/* Sub-toggle: Existing vs New Holding */}
                <div className="flex p-0.5 bg-slate-100 dark:bg-[#111723] rounded-lg border border-slate-200/70 dark:border-[#1c2536] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTargetType('existing')}
                    disabled={investments.length === 0}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
                      targetType === 'existing'
                        ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Existing ({investments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('new')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-medium ${
                      targetType === 'new'
                        ? 'bg-white dark:bg-[#1b2436] text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Asset</span>
                  </button>
                </div>
              </div>

              {/* OPTION A: Existing Investment */}
              {targetType === 'existing' && (
                <div className="space-y-2">
                  {investments.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>No investment assets yet. Select "New Asset" to create and fund your first position.</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={toInvestmentId}
                        onChange={(e) => handleSelectInvestment(e.target.value)}
                        className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
                        required
                      >
                        {investments.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            [{inv.category}] {inv.name} ({inv.currency})
                          </option>
                        ))}
                      </select>
                      {selectedInvestment && (
                        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] text-[11px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                          <span>
                            Asset Class: <strong className="text-slate-900 dark:text-zinc-200">{selectedInvestment.category}</strong>
                          </span>
                          <span>
                            Currency:{' '}
                            <strong className={isUsdTarget ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {isUsdTarget ? 'USD ($) — Live Conversion' : 'IDR (Rupiah)'}
                            </strong>
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* OPTION B: Brand-New Investment */}
              {targetType === 'new' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-[#1d273a]">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>New Investment Asset</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsHoldingTypesModalOpen(true)}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Manage Classes</span>
                    </button>
                  </div>

                  {/* Asset Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Asset Name / Ticker
                    </label>
                    <input
                      type="text"
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      placeholder="e.g. S&P 500 (VOO), BBCA, Bitcoin..."
                      className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Asset Class
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {categoryOptions.map((cat) => {
                        const isSelected = newInvCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-[#1b2436] border-emerald-500/60 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                : 'bg-white/70 dark:bg-[#0b0f17] border-slate-200/80 dark:border-[#222d42] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                            }`}
                          >
                            <div className="font-semibold text-xs truncate">{cat.label}</div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{cat.badge}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform / Broker & Units */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Broker / Platform
                      </label>
                      <input
                        type="text"
                        value={newInvPlatform}
                        onChange={(e) => setNewInvPlatform(e.target.value)}
                        placeholder="e.g. Gotrade, Bibit, Stockbit..."
                        className="w-full h-9 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {PLATFORM_SUGGESTIONS.slice(0, 4).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewInvPlatform(p)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 dark:bg-[#151d2c] dark:hover:bg-[#1c263a] text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-[#232f46] transition-colors cursor-pointer"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Quantity / Units (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newInvUnits}
                        onChange={(e) => setNewInvUnits(e.target.value)}
                        placeholder="e.g. 1.25"
                        className="w-full h-9 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
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
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
                required
              >
                {accounts
                  .filter((a) => a.id !== fromAccountId && a.type !== 'credit_card' && a.type !== 'paylater')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {formatIdr(acc.balance)}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* USD Conversion Box */}
          {mode === 'bank_to_investment' && isUsdTarget && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-[#101622] border border-indigo-200/80 dark:border-indigo-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>USD Conversion</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetToGoogleRate}
                  className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Spot Rate ({formatIdr(usdIdrRate)})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    USD Received ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amountUsd}
                      onChange={(e) => handleAmountUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-indigo-200 dark:border-indigo-500/40 focus:border-indigo-500 rounded-xl pl-7 pr-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Exchange Rate (IDR/USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={exchangeRate}
                      onChange={(e) => handleExchangeRateChange(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-indigo-500 rounded-xl pl-8 pr-3 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-[#0b0f17] border border-indigo-100 dark:border-[#1d273a] text-[11px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                <span>Credited to {targetType === 'existing' ? (selectedInvestment?.name || 'Asset') : (newInvName || 'New Asset')}:</span>
                <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {amountUsd && Number(amountUsd) > 0 ? `+${formatUsd(Number(amountUsd))}` : '$0.00'}
                </strong>
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Note (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly DCA, savings transfer..."
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </form>

        {/* Clean Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50/70 dark:bg-[#090d14] border-t border-slate-100 dark:border-[#161e2e] flex items-center justify-end gap-2">
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
            form="transfer-modal-form"
            disabled={isSubmitting}
            className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs select-none ${
              isSubmitting
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white cursor-pointer'
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
                    ? 'Create & Fund Asset'
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
