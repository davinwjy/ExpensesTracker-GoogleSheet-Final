import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Trash2,
  AlertCircle,
  Check,
  ShieldCheck,
  TrendingUp,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { HoldingType } from '../../types';

const COLOR_OPTIONS: { id: string; label: string; class: string; border: string }[] = [
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/40' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', border: 'border-blue-500/40' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', border: 'border-purple-500/40' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', border: 'border-amber-500/40' },
  { id: 'teal', label: 'Teal', class: 'bg-teal-500/15 text-teal-600 dark:text-teal-400', border: 'border-teal-500/40' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', border: 'border-rose-500/40' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/40' },
];

export const HoldingTypesModal: React.FC = () => {
  const {
    isHoldingTypesModalOpen,
    setIsHoldingTypesModalOpen,
    holdingTypes,
    addHoldingType,
    updateHoldingType,
    deleteHoldingType,
    investments,
    showNotification,
  } = useFinance();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [example, setExample] = useState('');
  const [badgeColor, setBadgeColor] = useState('blue');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isHoldingTypesModalOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setDefaultCurrency('IDR');
    setExample('');
    setBadgeColor('blue');
    setError('');
    setDeletingId(null);
  };

  const handleClose = () => {
    resetForm();
    setSuccess('');
    setIsHoldingTypesModalOpen(false);
  };

  const handleStartEdit = (ht: HoldingType) => {
    setEditingId(ht.id);
    setLabel(ht.label);
    setDefaultCurrency(ht.defaultCurrency);
    setExample(ht.example || '');
    setBadgeColor(ht.badgeColor || (ht.defaultCurrency === 'USD' ? 'purple' : 'blue'));
    setError('');
    setSuccess('');
    setDeletingId(null);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Please enter a holding type name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateHoldingType(editingId, {
          label: trimmedLabel,
          defaultCurrency,
          example: example.trim() || undefined,
          badgeColor,
        });
        showNotification({
          type: 'success',
          title: 'Asset Class Updated',
          accountName: trimmedLabel,
        });
        setSuccess(`Asset class "${trimmedLabel}" updated.`);
        resetForm();
      } else {
        await addHoldingType({
          label: trimmedLabel,
          defaultCurrency,
          example: example.trim() || undefined,
          badgeColor,
        });
        showNotification({
          type: 'success',
          title: 'Asset Class Added',
          accountName: trimmedLabel,
        });
        setSuccess(`Asset class "${trimmedLabel}" created.`);
        resetForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save holding type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const target = holdingTypes.find((h) => h.id === id);
      await deleteHoldingType(id);
      showNotification({
        type: 'info',
        title: 'Asset Class Deleted',
        accountName: target?.label,
      });
      setSuccess('Asset class deleted.');
      setDeletingId(null);
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete holding type');
    }
  };

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
              Manage Asset Classes
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Configure portfolio holding categories and base currencies (IDR / USD)
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

          {/* Form: Add or Edit Holding Type */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                {editingId ? (
                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>
                  {editingId ? `Edit Asset Class: ${label || editingId}` : 'New Asset Class'}
                </span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {/* Name / Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Asset Class Name
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Gold / Metals, SBN Bonds, Real Estate..."
                className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                required
              />
            </div>

            {/* Base Currency Choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Base Currency
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-[#0b0f17] rounded-xl border border-slate-200/80 dark:border-[#222d42]">
                <button
                  type="button"
                  onClick={() => setDefaultCurrency('IDR')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    defaultCurrency === 'IDR'
                      ? 'bg-white dark:bg-[#1b2436] text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Rp IDR (Rupiah)
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultCurrency('USD')}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    defaultCurrency === 'USD'
                      ? 'bg-white dark:bg-[#1b2436] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  $ USD (US Dollar)
                </button>
              </div>
            </div>

            {/* Example / Ticker Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Example Assets / Platforms (Optional)
              </label>
              <input
                type="text"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="e.g. Antam, Pluang Gold, ORI024, Gotrade..."
                className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
              />
            </div>

            {/* Color Accent */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Badge Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBadgeColor(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${c.class} ${
                      badgeColor === c.id
                        ? `${c.border} ring-1 ring-slate-400 dark:ring-white/30 font-semibold`
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-9 px-3 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all disabled:opacity-50"
              >
                {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Add Asset Class'}
                </span>
              </button>
            </div>
          </form>

          {/* List of Existing Holding Types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                Registered Asset Classes ({holdingTypes.length})
              </span>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-[#192233] rounded-2xl border border-slate-200/80 dark:border-[#1d273a] bg-slate-50/60 dark:bg-[#101622] overflow-hidden">
              {holdingTypes.map((ht) => {
                const isUsd = ht.defaultCurrency === 'USD';
                const taggedCount = investments.filter((i) => i.category === ht.id).length;
                const isBeingEdited = editingId === ht.id;

                return (
                  <div
                    key={ht.id}
                    className={`px-3.5 py-3 flex items-center justify-between gap-2 transition-colors ${
                      isBeingEdited
                        ? 'bg-emerald-500/5 dark:bg-[#151e2e]'
                        : 'hover:bg-slate-100/80 dark:hover:bg-[#141c2b]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">
                          {ht.label}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold ${
                            isUsd
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {ht.defaultCurrency}
                        </span>
                        {ht.isSystem && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Default</span>
                          </span>
                        )}
                      </div>
                      {ht.example && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                          {ht.example}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        <span>
                          {taggedCount} active holding{taggedCount !== 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(ht)}
                        title="Edit asset class"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1b2436] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!ht.isSystem && (
                        <div>
                          {deletingId === ht.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(ht.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(ht.id)}
                              disabled={taggedCount > 0}
                              title={
                                taggedCount > 0
                                  ? 'Cannot delete while active assets use this class'
                                  : 'Delete asset class'
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                taggedCount > 0
                                  ? 'text-slate-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                                  : 'text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
