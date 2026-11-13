import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Trash2,
  Target,
  Calendar,
  Tag,
  Loader2,
  Plus,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { EXPENSE_CATEGORIES, formatIdr } from '../../lib/formatters';

const PRESET_AMOUNTS = [
  { label: '500k', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 },
];

export const BudgetModal: React.FC = () => {
  const {
    isBudgetModalOpen,
    setIsBudgetModalOpen,
    editingBudget,
    setEditingBudget,
    saveBudget,
    deleteBudget,
    transactions,
    showNotification,
    expenseCategories,
  } = useFinance();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [limit, setLimit] = useState<string>('');
  const [scope, setScope] = useState<'recurring' | 'specific'>('recurring');
  const [specificMonth, setSpecificMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(expenseCategories);
    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.category && tx.category.trim()) {
        set.add(tx.category.trim());
      }
    });
    return Array.from(set);
  }, [transactions, expenseCategories]);

  // Compute last month & current month spending for the currently selected category
  const categoryBenchmark = React.useMemo(() => {
    const activeCat = (isCustomCategory ? customCategory : category).trim().toLowerCase();
    const now = new Date();
    const baseMonthStr =
      scope === 'specific' && specificMonth
        ? specificMonth.slice(0, 7)
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yNum, mNum] = baseMonthStr.split('-').map(Number);
    const prevDate = new Date(yNum || now.getFullYear(), (mNum || 1) - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthLabel = prevDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

    let prevSpent = 0;
    let currSpent = 0;

    if (activeCat) {
      transactions.forEach((tx) => {
        if (tx.type !== 'expense' || !tx.date) return;
        if ((tx.category || '').trim().toLowerCase() !== activeCat) return;
        const cleanDate = tx.date.trim();
        if (cleanDate.startsWith(prevMonthStr)) {
          prevSpent += tx.amount;
        } else if (cleanDate.startsWith(baseMonthStr)) {
          currSpent += tx.amount;
        }
      });
    }

    const round50k = (val: number) => Math.max(100000, Math.round(val / 50000) * 50000);
    const refAmount = prevSpent > 0 ? prevSpent : currSpent;

    return {
      prevMonthLabel,
      prevSpent,
      currSpent,
      hasBenchmark: refAmount > 0,
      saverLimit: round50k(refAmount * 0.9),
      matchLimit: prevSpent > 0 ? prevSpent : round50k(currSpent),
      bufferLimit: round50k(refAmount * 1.1),
    };
  }, [isCustomCategory, customCategory, category, scope, specificMonth, transactions]);

  const wasOpenRef = React.useRef(false);
  const lastEditingBudgetIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isBudgetModalOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentEditingId = editingBudget ? editingBudget.id : null;
      const isEditingBudgetChanged = currentEditingId !== lastEditingBudgetIdRef.current;

      if (isFreshOpen || isEditingBudgetChanged) {
        setError('');
        setIsSubmitting(false);
        setConfirmDelete(false);
        wasOpenRef.current = true;
        lastEditingBudgetIdRef.current = currentEditingId;

        if (editingBudget) {
          if (availableCategories.includes(editingBudget.category)) {
            setCategory(editingBudget.category);
            setIsCustomCategory(false);
            setCustomCategory('');
          } else {
            setIsCustomCategory(true);
            setCustomCategory(editingBudget.category);
          }
          setLimit(editingBudget.monthlyLimit ? String(editingBudget.monthlyLimit) : '');
          if (editingBudget.month) {
            setScope('specific');
            setSpecificMonth(editingBudget.month);
          } else {
            setScope('recurring');
          }
        } else {
          setCategory(availableCategories[0] || EXPENSE_CATEGORIES[0]);
          setIsCustomCategory(false);
          setCustomCategory('');
          setLimit('2000000');
          setScope('recurring');
        }
      }
    } else {
      wasOpenRef.current = false;
      lastEditingBudgetIdRef.current = undefined;
    }
  }, [isBudgetModalOpen, editingBudget, availableCategories]);

  if (!isBudgetModalOpen) return null;

  const handleClose = () => {
    setIsBudgetModalOpen(false);
    setEditingBudget(null);
    setConfirmDelete(false);
  };

  const handlePresetClick = (amount: number) => {
    setLimit(String(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    const targetCategory = isCustomCategory ? customCategory.trim() : category.trim();
    if (!targetCategory) {
      setError('Please select or enter a category name');
      return;
    }

    const parsedLimit = parseFloat(limit.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Please enter a valid monthly limit greater than Rp 0');
      return;
    }

    const targetMonth = scope === 'specific' ? specificMonth : undefined;

    setIsSubmitting(true);
    try {
      await saveBudget(
        targetCategory,
        parsedLimit,
        targetMonth,
        editingBudget?.id || undefined
      );

      showNotification({
        type: 'success',
        title: editingBudget ? 'Budget Limit Updated' : 'Budget Limit Saved',
        message: `${targetCategory}: monthly target ${formatIdr(parsedLimit)}`,
        amount: parsedLimit,
        category: targetCategory,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save budget limit');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBudget?.id) return;
    const cat = editingBudget.category;
    setIsSubmitting(true);
    try {
      await deleteBudget(editingBudget.id);
      showNotification({
        type: 'info',
        title: 'Budget Limit Removed',
        category: cat,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLimitNumber = parseFloat(limit.replace(/[^0-9.]/g, '')) || 0;

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
              {editingBudget ? 'Edit Category Budget' : 'Set Category Budget'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Configure your monthly spending target and alerts
            </p>
          </div>
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

        {/* Scrollable Form Body */}
        <form
          id="budget-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Expense Category</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isCustomCategory ? 'Choose from list' : 'Custom category'}</span>
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Gym & Supplements, Subscriptions..."
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                required
                autoFocus
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Hero Monthly Limit Input Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <span>Monthly Limit</span>
              </label>
              {currentLimitNumber > 0 && (
                <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIdr(currentLimitNumber)}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                type="text"
                value={limit}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLimit(val);
                }}
                placeholder="2000000"
                className="w-full bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors"
                required
              />
            </div>

            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetClick(p.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer tabular-nums font-mono ${
                    currentLimitNumber === p.value
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'bg-white hover:bg-slate-100 dark:bg-[#151d2c] dark:hover:bg-[#1c263a] text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-[#232f46]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Last Month Benchmark Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                Last Month ({categoryBenchmark.prevMonthLabel}):
              </span>
              <strong className="text-slate-900 dark:text-zinc-100 font-mono tabular-nums">
                {formatIdr(categoryBenchmark.prevSpent)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Spent This Month:</span>
              <span className="text-slate-700 dark:text-zinc-300 font-mono tabular-nums">
                {formatIdr(categoryBenchmark.currSpent)}
              </span>
            </div>
            {categoryBenchmark.hasBenchmark && (
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePresetClick(categoryBenchmark.saverLimit)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 transition-colors cursor-pointer text-center"
                >
                  Save -10%
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick(categoryBenchmark.matchLimit)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer text-center"
                >
                  Match 100%
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetClick(categoryBenchmark.bufferLimit)}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-600 dark:text-indigo-300 transition-colors cursor-pointer text-center"
                >
                  Buffer +10%
                </button>
              </div>
            )}
          </div>

          {/* Budget Scope (Recurring vs Month-Specific) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Budget Period</span>
            </label>

            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#111723] rounded-xl border border-slate-200/70 dark:border-[#1c2536]">
              <button
                type="button"
                onClick={() => setScope('recurring')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scope === 'recurring'
                    ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Every Month
              </button>

              <button
                type="button"
                onClick={() => setScope('specific')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scope === 'specific'
                    ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Specific Month
              </button>
            </div>

            {scope === 'specific' && (
              <div className="pt-1">
                <input
                  type="month"
                  value={specificMonth}
                  onChange={(e) => setSpecificMonth(e.target.value)}
                  className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            )}
          </div>
        </form>

        {/* Clean Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50/70 dark:bg-[#090d14] border-t border-slate-100 dark:border-[#161e2e] flex items-center justify-between gap-2">
          {editingBudget ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-2.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-3 flex items-center gap-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
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
              form="budget-modal-form"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{editingBudget ? 'Update Budget' : 'Save Budget'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
