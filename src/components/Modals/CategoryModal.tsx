import React, { useState } from 'react';
import {
  X,
  Plus,
  Tag,
  Trash2,
  AlertCircle,
  Check,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS } from '../../lib/formatters';

const PRESET_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f97316', // orange
  '#ec4899', // pink
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#eab308', // yellow
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#84cc16', // lime
  '#64748b', // slate
];

export const CategoryModal: React.FC = () => {
  const {
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    customCategories,
    expenseCategories,
    incomeCategories,
    addCustomCategory,
    deleteCustomCategory,
    transactions,
    showNotification,
  } = useFinance();

  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isCategoryModalOpen) return null;

  const handleClose = () => {
    setName('');
    setError('');
    setSuccess('');
    setDeletingId(null);
    setIsCategoryModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a category name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCustomCategory(trimmed, activeType, color);
      showNotification({
        type: 'success',
        title: 'Category Added',
        message: `"${trimmed}" added to ${activeType === 'expense' ? 'Expense' : 'Income'} categories.`,
      });
      setSuccess(`Category "${trimmed}" added successfully.`);
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    setError('');
    setSuccess('');
    try {
      await deleteCustomCategory(id);
      showNotification({
        type: 'info',
        title: 'Category Deleted',
        message: `"${catName}" has been removed.`,
      });
      setSuccess(`Category "${catName}" removed.`);
      setDeletingId(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
    }
  };

  const allDisplayedCategories = [
    ...expenseCategories.map((catName) => ({ name: catName, type: 'expense' as const })),
    ...incomeCategories.map((catName) => ({ name: catName, type: 'income' as const })),
  ];
  const expenseSystemSet = new Set<string>([...EXPENSE_CATEGORIES]);
  const incomeSystemSet = new Set<string>([...INCOME_CATEGORIES]);

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
              Manage Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Create and organize custom expense & income categories
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151d2c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Add New Category Card */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-3.5"
          >
            <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-[#0b0f17] rounded-xl border border-slate-200/80 dark:border-[#222d42]">
              <button
                type="button"
                onClick={() => {
                  setActiveType('expense');
                  setError('');
                  setSuccess('');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeType === 'expense'
                    ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Expense Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveType('income');
                  setError('');
                  setSuccess('');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeType === 'income'
                    ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Income Category
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Category Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  activeType === 'expense'
                    ? 'e.g. Subscriptions, Coffee, Pet Care...'
                    : 'e.g. Royalties, Consulting, Dividends...'
                }
                className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Color Accent</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-lg border transition-transform cursor-pointer ${
                      color === c
                        ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-emerald-500/40'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Adding...' : 'Add Category'}</span>
              </button>
            </div>
          </form>

          {/* Registered Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                Available Categories ({allDisplayedCategories.length})
              </span>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-[#192233] rounded-2xl border border-slate-200/80 dark:border-[#1d273a] bg-slate-50/60 dark:bg-[#101622] overflow-hidden max-h-60 overflow-y-auto">
              {allDisplayedCategories.map(({ name: catName, type: catType }) => {
                const isSystem =
                  catType === 'expense'
                    ? expenseSystemSet.has(catName)
                    : incomeSystemSet.has(catName);
                const customObj = customCategories.find(
                  (c) => c.type === catType && c.name.toLowerCase() === catName.toLowerCase()
                );
                const dotColor = customObj?.color || CATEGORY_COLORS[catName] || '#10b981';
                const txCount = transactions.filter(
                  (t) => t.category === catName && (t.type || 'expense') === catType
                ).length;

                return (
                  <div
                    key={`${catType}-${catName}`}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-100/80 dark:hover:bg-[#141c2b] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="font-medium text-xs text-slate-900 dark:text-zinc-100 truncate">
                        {catName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize shrink-0 ${
                          catType === 'expense'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {catType}
                      </span>
                      {isSystem ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center gap-0.5 shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Default</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                          Custom
                        </span>
                      )}
                      {txCount > 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums shrink-0">
                          · {txCount} tx
                        </span>
                      )}
                    </div>

                    {!isSystem && customObj && (
                      <div className="shrink-0">
                        {deletingId === customObj.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(customObj.id, catName)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(customObj.id)}
                            title="Delete custom category"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clean Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50/70 dark:bg-[#090d14] border-t border-slate-100 dark:border-[#161e2e] flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-[#151d2c] border border-slate-200/80 dark:border-[#222d42] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
