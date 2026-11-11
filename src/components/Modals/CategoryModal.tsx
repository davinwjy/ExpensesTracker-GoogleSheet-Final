import React, { useState } from 'react';
import {
  X,
  Plus,
  Tag,
  Trash2,
  AlertCircle,
  Check,
  ShieldCheck,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1017] border-t sm:border border-slate-200 dark:border-[#1b212e] rounded-t sm:rounded shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#080a0f]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Command Strip Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                TRANSACTION CATEGORIES
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Add and manage custom Expense & Income classification categories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Add New Category Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3.5 rounded bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1a1f2c]">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Plus className="w-3.5 h-3.5" />
                <span>ADD NEW CATEGORY</span>
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                CATEGORY NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  activeType === 'expense'
                    ? 'e.g. Subscriptions, Coffee, Pet Care, Gadgets...'
                    : 'e.g. Affiliate Commission, Royalties, Consulting...'
                }
                className="w-full bg-white dark:bg-[#0d1017] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                CATEGORY TYPE <span className="text-rose-500">*</span>
              </label>
              <select
                value={activeType}
                onChange={(e) => {
                  setActiveType(e.target.value as 'expense' | 'income');
                  setError('');
                  setSuccess('');
                }}
                className="w-full bg-white dark:bg-[#0d1017] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono cursor-pointer"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                BADGE COLOR ACCENT
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded border transition-transform cursor-pointer ${
                      color === c
                        ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-emerald-500/50'
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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all disabled:opacity-50 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'SAVING...' : '+ ADD CATEGORY'}</span>
              </button>
            </div>
          </form>

          {/* Registered Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                AVAILABLE CATEGORIES ({allDisplayedCategories.length})
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-[#171b26] rounded border border-slate-200 dark:border-[#1d2332] bg-slate-50 dark:bg-[#080a0f] overflow-hidden max-h-64 overflow-y-auto">
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
                    className="p-2.5 px-3 flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-[#0d1017] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">
                        {catName}
                      </span>
                      <span
                        className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                          catType === 'expense'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {catType}
                      </span>
                      {isSystem ? (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center gap-0.5 shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>DEFAULT</span>
                        </span>
                      ) : (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 shrink-0">
                          CUSTOM
                        </span>
                      )}
                      {txCount > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
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
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              DELETE
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-[10px] cursor-pointer"
                            >
                              CANCEL
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(customObj.id)}
                            title="Delete custom category"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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

        {/* Command Strip Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 hover:bg-slate-300 dark:bg-[#131722] dark:hover:bg-[#1a2030] border border-slate-300 dark:border-[#21293a] transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
