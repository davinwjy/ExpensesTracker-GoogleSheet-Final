import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RotateCcw,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Plus,
  Wallet,
  Tag,
  Calendar,
  FileText,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatIdr,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getLocalDateString,
} from '../../lib/formatters';

export const AddExpenseModal: React.FC = () => {
  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    transactionInitialType,
    accounts,
    addTransaction,
    editingTransaction,
    setEditingTransaction,
    updateTransaction,
    showNotification,
    expenseCategories,
    incomeCategories,
    setIsCategoryModalOpen,
  } = useFinance();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState<string>(getLocalDateString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSelectableAccountsForType = React.useCallback(
    (targetType: 'expense' | 'income') => {
      if (targetType === 'expense') {
        return accounts;
      }
      return accounts.filter((acc) => {
        if (acc.type === 'credit_card' || acc.type === 'paylater') {
          if (
            editingTransaction &&
            editingTransaction.accountId === acc.id &&
            editingTransaction.type === 'income'
          ) {
            return true;
          }
          return (Number(acc.balance) || 0) > 0;
        }
        return true;
      });
    },
    [accounts, editingTransaction]
  );

  const selectableAccounts = React.useMemo(
    () => getSelectableAccountsForType(type),
    [getSelectableAccountsForType, type]
  );

  const wasOpenRef = React.useRef(false);
  const lastEditingTxIdRef = React.useRef<string | null | undefined>(undefined);

  // Clean form ONLY on modal open or when editingTransaction changes, preserving typed inputs during background sync
  useEffect(() => {
    if (isAddExpenseOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentEditingId = editingTransaction ? editingTransaction.id : null;
      const isEditingTxChanged = currentEditingId !== lastEditingTxIdRef.current;

      if (isFreshOpen || isEditingTxChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastEditingTxIdRef.current = currentEditingId;

        if (editingTransaction) {
          const txType = editingTransaction.type === 'income' ? 'income' : 'expense';
          setType(txType);
          setAmount(editingTransaction.amount.toString());
          setAccountId(editingTransaction.accountId);
          const fallbackCat =
            txType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
          setCategory(editingTransaction.category || fallbackCat);
          setDate(editingTransaction.date);
          setNotes(editingTransaction.notes || '');
        } else {
          const initType = transactionInitialType || 'expense';
          const validAccs = getSelectableAccountsForType(initType);
          const defaultAcc = validAccs.length > 0 ? validAccs[0] : undefined;
          setType(initType);
          setAmount('');
          setAccountId(defaultAcc ? defaultAcc.id : '');
          if (initType === 'income') {
            const isCreditAcc =
              defaultAcc &&
              (defaultAcc.type === 'credit_card' || defaultAcc.type === 'paylater');
            setCategory(isCreditAcc ? 'Cashback & Refunds' : INCOME_CATEGORIES[0]);
          } else {
            setCategory(EXPENSE_CATEGORIES[0]);
          }
          setDate(getLocalDateString());
          setNotes('');
        }
        setError('');
      }
    } else {
      wasOpenRef.current = false;
      lastEditingTxIdRef.current = undefined;
    }
  }, [
    isAddExpenseOpen,
    editingTransaction,
    transactionInitialType,
    getSelectableAccountsForType,
  ]);

  // If modal opened while accounts were still empty and sync finishes, bind default account without resetting user inputs
  useEffect(() => {
    if (isAddExpenseOpen && !accountId && selectableAccounts.length > 0) {
      setAccountId(selectableAccounts[0].id);
    }
  }, [isAddExpenseOpen, accountId, selectableAccounts]);

  const resetForm = () => {
    setIsSubmitting(false);
    const initType = transactionInitialType || 'expense';
    const validAccs = getSelectableAccountsForType(initType);
    const defaultAcc = validAccs.length > 0 ? validAccs[0] : undefined;
    setType(initType);
    setAmount('');
    setAccountId(defaultAcc ? defaultAcc.id : '');
    if (initType === 'income') {
      const isCreditAcc =
        defaultAcc &&
        (defaultAcc.type === 'credit_card' || defaultAcc.type === 'paylater');
      setCategory(isCreditAcc ? 'Cashback & Refunds' : INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
    setDate(getLocalDateString());
    setNotes('');
    setError('');
  };

  const handleTypeChange = (newType: 'expense' | 'income') => {
    if (newType === type) return;
    setType(newType);
    const validAccs = getSelectableAccountsForType(newType);
    let nextAcc = validAccs.find((a) => a.id === accountId);
    if (!nextAcc) {
      nextAcc = validAccs.length > 0 ? validAccs[0] : undefined;
      setAccountId(nextAcc ? nextAcc.id : '');
    }

    if (newType === 'income') {
      const isCreditAcc =
        nextAcc && (nextAcc.type === 'credit_card' || nextAcc.type === 'paylater');
      if (isCreditAcc) {
        setCategory('Cashback & Refunds');
      } else if (!incomeCategories.includes(category)) {
        setCategory(incomeCategories[0] || INCOME_CATEGORIES[0]);
      }
    } else {
      if (!expenseCategories.includes(category)) {
        setCategory(expenseCategories[0] || EXPENSE_CATEGORIES[0]);
      }
    }
  };

  const handleAccountChange = (newAccountId: string) => {
    setAccountId(newAccountId);
    const nextAcc = accounts.find((a) => a.id === newAccountId);
    if (
      type === 'income' &&
      nextAcc &&
      (nextAcc.type === 'credit_card' || nextAcc.type === 'paylater')
    ) {
      setCategory('Cashback & Refunds');
    }
  };

  const handleClose = () => {
    resetForm();
    setEditingTransaction(null);
    setIsAddExpenseOpen(false);
  };

  const handleQuickAdd = (inc: number) => {
    const current = Number(amount) || 0;
    setAmount((current + inc).toString());
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const availableBalance = React.useMemo(() => {
    if (!selectedAccount) return 0;
    if (
      selectedAccount.type === 'credit_card' ||
      selectedAccount.type === 'paylater'
    ) {
      if (selectedAccount.creditLimit === undefined) return 0;
      let revertedDebt = selectedAccount.balance;
      if (
        editingTransaction &&
        editingTransaction.accountId === selectedAccount.id &&
        (editingTransaction.type === 'expense' ||
          editingTransaction.type === 'cc_debt')
      ) {
        revertedDebt = Math.max(0, revertedDebt - editingTransaction.amount);
      }
      return Math.max(0, selectedAccount.creditLimit - revertedDebt);
    }
    let revertedBal = selectedAccount.balance;
    if (
      editingTransaction &&
      editingTransaction.accountId === selectedAccount.id &&
      (editingTransaction.type === 'expense' ||
        editingTransaction.type === 'cc_debt')
    ) {
      revertedBal += editingTransaction.amount;
    }
    return revertedBal;
  }, [selectedAccount, editingTransaction]);

  const refundableDebt = React.useMemo(() => {
    if (!selectedAccount) return 0;
    if (
      selectedAccount.type === 'credit_card' ||
      selectedAccount.type === 'paylater'
    ) {
      let currentUsedDebt = Number(selectedAccount.balance) || 0;
      if (
        editingTransaction &&
        editingTransaction.accountId === selectedAccount.id &&
        editingTransaction.type === 'income'
      ) {
        currentUsedDebt += editingTransaction.amount;
      }
      return Math.max(0, currentUsedDebt);
    }
    return 0;
  }, [selectedAccount, editingTransaction]);

  const parsedNumAmount = Number(amount);
  const isInsufficientBalance = Boolean(
    type === 'expense' &&
      selectedAccount &&
      !isNaN(parsedNumAmount) &&
      parsedNumAmount > 0 &&
      parsedNumAmount > availableBalance
  );

  const isExceedingRefundableDebt = Boolean(
    type === 'income' &&
      selectedAccount &&
      (selectedAccount.type === 'credit_card' ||
        selectedAccount.type === 'paylater') &&
      !isNaN(parsedNumAmount) &&
      parsedNumAmount > 0 &&
      parsedNumAmount > refundableDebt
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setIsSubmitting(false);
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      setIsSubmitting(false);
      return;
    }

    if (type === 'expense' && selectedAccount) {
      if (parsedAmount > availableBalance) {
        if (
          selectedAccount.type === 'credit_card' ||
          selectedAccount.type === 'paylater'
        ) {
          setError(
            `Credit limit insufficient (${formatIdr(
              availableBalance
            )}). Expense amount ${formatIdr(parsedAmount)} cannot be submitted.`
          );
        } else {
          setError(
            `Insufficient balance (${formatIdr(
              availableBalance
            )}). Expense amount ${formatIdr(parsedAmount)} cannot be submitted.`
          );
        }
        setIsSubmitting(false);
        return;
      }
    }

    if (
      type === 'income' &&
      selectedAccount &&
      (selectedAccount.type === 'credit_card' ||
        selectedAccount.type === 'paylater')
    ) {
      if (parsedAmount > refundableDebt) {
        setError(
          `Refund amount (${formatIdr(
            parsedAmount
          )}) cannot exceed used credit limit (${formatIdr(refundableDebt)}).`
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      } else {
        await addTransaction({
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      }

      const targetAcc = accounts.find((a) => a.id === accountId);
      const accName = targetAcc ? targetAcc.name : 'Account';
      const isCreditRefund =
        type === 'income' &&
        targetAcc &&
        (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater');
      showNotification({
        type: 'success',
        txType: type,
        title: editingTransaction
          ? isCreditRefund
            ? 'Credit Refund Updated'
            : type === 'expense'
            ? 'Expense Updated'
            : 'Income Updated'
          : isCreditRefund
          ? 'Credit Card Refund Recorded'
          : type === 'expense'
          ? 'Expense Recorded'
          : 'Income Recorded',
        message: notes?.trim() ? notes.trim() : undefined,
        amount: parsedAmount,
        category,
        accountName: accName,
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
      setIsSubmitting(false);
    }
  };

  if (!isAddExpenseOpen) return null;

  const activeCategories: readonly string[] =
    type === 'income' ? incomeCategories : expenseCategories;
  const categoryOptions = activeCategories.includes(category)
    ? [...activeCategories]
    : [category, ...activeCategories];

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
      <div className="relative w-full max-w-md bg-white dark:bg-[#0c1017] border-t sm:border border-slate-200/90 dark:border-[#1c2536] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Clean Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-[#161e2e] shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
              {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {editingTransaction
                ? 'Update transaction details and account balance'
                : 'Record an expense or income to your account'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetForm}
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
          id="expense-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Type Selector */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#111723] rounded-xl border border-slate-200/70 dark:border-[#1c2536]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'expense'
                  ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight
                className={`w-3.5 h-3.5 ${
                  type === 'expense' ? 'text-rose-500' : 'text-slate-400'
                }`}
              />
              <span>Expense</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTypeChange('income')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'income'
                  ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowDownRight
                className={`w-3.5 h-3.5 ${
                  type === 'income' ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span>Income</span>
            </button>
          </div>

          {/* Hero Amount Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <label htmlFor="tx-amount-input" className="font-medium text-slate-700 dark:text-zinc-300">
                {type === 'expense' ? 'Expense Amount' : 'Income Amount'}
              </label>
              {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    type === 'expense'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatIdr(Number(amount))}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                id="tx-amount-input"
                type="number"
                min="0"
                step="any"
                disabled={isSubmitting}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className={`w-full bg-white dark:bg-[#0b0f17] border rounded-xl pl-10 pr-3.5 py-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors disabled:opacity-60 ${
                  isInsufficientBalance || isExceedingRefundableDebt
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-slate-200 dark:border-[#222d42] focus:border-emerald-500'
                }`}
                required
                autoFocus
              />
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[10000, 50000, 100000, 250000, 500000, 1000000, 5000000].map(
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

            {/* Balance / Limit Warning */}
            {isInsufficientBalance && (
              <div className="mt-2.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Exceeds available balance by{' '}
                  <strong className="font-mono tabular-nums">
                    {formatIdr(parsedNumAmount - availableBalance)}
                  </strong>
                </span>
              </div>
            )}

            {isExceedingRefundableDebt && (
              <div className="mt-2.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Refund exceeds used credit limit (max{' '}
                  <strong className="font-mono tabular-nums">
                    {formatIdr(refundableDebt)}
                  </strong>
                  )
                </span>
              </div>
            )}
          </div>

          {/* Account Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span>{type === 'expense' ? 'From Account' : 'To Account'}</span>
              </label>

              {selectedAccount && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {selectedAccount.type === 'credit_card' ||
                  selectedAccount.type === 'paylater'
                    ? type === 'income'
                      ? 'Used Debt: '
                      : 'Available: '
                    : 'Balance: '}
                  <strong
                    className={`font-mono tabular-nums ${
                      isInsufficientBalance || isExceedingRefundableDebt
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatIdr(
                      (selectedAccount.type === 'credit_card' ||
                        selectedAccount.type === 'paylater') &&
                        type === 'income'
                        ? refundableDebt
                        : availableBalance
                    )}
                  </strong>
                </span>
              )}
            </div>

            <select
              value={accountId}
              disabled={isSubmitting}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
              required
            >
              {selectableAccounts.length === 0 && (
                <option value="">No accounts found — add one first</option>
              )}
              {selectableAccounts.map((acc) => {
                const isCredit =
                  acc.type === 'credit_card' || acc.type === 'paylater';
                const avail = isCredit
                  ? Math.max(0, (acc.creditLimit || 0) - acc.balance)
                  : acc.balance;
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} —{' '}
                    {isCredit
                      ? type === 'income'
                        ? `Used: ${formatIdr(acc.balance)}`
                        : `Avail: ${formatIdr(avail)}`
                      : formatIdr(acc.balance)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Category</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Manage Categories</span>
              </button>
            </div>

            <select
              value={category}
              disabled={isSubmitting}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Note Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                disabled={isSubmitting}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
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
                disabled={isSubmitting}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  type === 'income'
                    ? 'e.g. Salary, bonus...'
                    : 'e.g. Lunch, coffee...'
                }
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60"
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
            form="expense-modal-form"
            disabled={
              isSubmitting ||
              isInsufficientBalance ||
              isExceedingRefundableDebt
            }
            className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs select-none ${
              isSubmitting
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-not-allowed opacity-60'
                : isInsufficientBalance || isExceedingRefundableDebt
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>
                  {isInsufficientBalance
                    ? 'Insufficient Balance'
                    : isExceedingRefundableDebt
                    ? 'Exceeds Used Limit'
                    : editingTransaction
                    ? 'Save Changes'
                    : type === 'expense'
                    ? 'Save Expense'
                    : 'Save Income'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
