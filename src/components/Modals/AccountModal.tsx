import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CreditCard,
  RotateCcw,
  AlertCircle,
  Trash2,
  Wallet,
  Hash,
  Palette,
  Loader2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AccountType } from '../../types';
import { formatIdr } from '../../lib/formatters';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#64748b', // slate
];

const CARD_NETWORKS = ['Visa', 'Mastercard', 'JCB', 'Amex', 'GPN', 'UnionPay'];

export const AccountModal: React.FC = () => {
  const {
    isAddAccountOpen,
    setIsAddAccountOpen,
    editingAccount,
    setEditingAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    showNotification,
  } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#3b82f6');

  // Credit card specific states
  const [creditLimit, setCreditLimit] = useState('');
  const [billingDate, setBillingDate] = useState('25');
  const [dueDate, setDueDate] = useState('10');
  const [cardNetwork, setCardNetwork] = useState('Visa');
  const [last4Digits, setLast4Digits] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const wasOpenRef = React.useRef(false);
  const lastEditingAccountIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isAddAccountOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentEditingId = editingAccount ? editingAccount.id : null;
      const isEditingAccountChanged = currentEditingId !== lastEditingAccountIdRef.current;

      if (isFreshOpen || isEditingAccountChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastEditingAccountIdRef.current = currentEditingId;

        if (editingAccount) {
          setName(editingAccount.name);
          setType(editingAccount.type);
          setBalance(editingAccount.balance.toString());
          setAccountNumber(editingAccount.accountNumber || '');
          setColor(editingAccount.color || '#3b82f6');
          setCreditLimit(editingAccount.creditLimit ? editingAccount.creditLimit.toString() : '');
          setBillingDate(editingAccount.billingDate ? editingAccount.billingDate.toString() : '25');
          setDueDate(editingAccount.dueDate ? editingAccount.dueDate.toString() : '10');
          setCardNetwork(editingAccount.cardNetwork || 'Visa');
          setLast4Digits(editingAccount.last4Digits || '');
        } else {
          resetFields();
        }
        setError('');
        setConfirmDelete(false);
      }
    } else {
      wasOpenRef.current = false;
      lastEditingAccountIdRef.current = undefined;
    }
  }, [isAddAccountOpen, editingAccount]);

  const resetFields = () => {
    setIsSubmitting(false);
    setName('');
    setType('bank');
    setBalance('0');
    setAccountNumber('');
    setColor('#3b82f6');
    setCreditLimit('0');
    setBillingDate('25');
    setDueDate('10');
    setCardNetwork('Visa');
    setLast4Digits('');
    setError('');
  };

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    setBalance('0');
    setCreditLimit('0');
    setError('');
  };

  const handleClose = () => {
    resetFields();
    setEditingAccount(null);
    setIsAddAccountOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an account name');
      return;
    }

    const parsedBalance = Number(balance);
    if (isNaN(parsedBalance)) {
      setError('Please enter a valid numeric balance / debt');
      return;
    }

    let parsedLimit = undefined;
    if (type === 'credit_card' || type === 'paylater') {
      parsedLimit = Number(creditLimit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        setError('Please enter a valid credit limit');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        balance: parsedBalance,
        accountNumber: accountNumber.trim() || undefined,
        color,
      };

      if (type === 'credit_card' || type === 'paylater') {
        payload.creditLimit = parsedLimit;
        payload.billingDate = Number(billingDate) || 25;
        payload.dueDate = Number(dueDate) || 10;
        payload.cardNetwork = cardNetwork;
        payload.last4Digits = last4Digits.trim() || undefined;
      }

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
        showNotification({
          type: 'success',
          title: 'Account Updated',
          accountName: payload.name,
        });
      } else {
        await addAccount(payload);
        showNotification({
          type: 'success',
          title: 'Account Added',
          accountName: payload.name,
          amount: payload.balance,
        });
      }

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAccount) return;
    const accountToDeleteName = editingAccount.name;
    setIsSubmitting(true);
    try {
      await deleteAccount(editingAccount.id);
      showNotification({
        type: 'info',
        title: 'Account Deleted',
        accountName: accountToDeleteName,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account');
      setIsSubmitting(false);
    }
  };

  if (!isAddAccountOpen) return null;

  const isCreditFacility = type === 'credit_card' || type === 'paylater';

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
              {editingAccount ? 'Edit Account' : 'Add Account'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {editingAccount
                ? 'Update account details, balance, or credit limit'
                : 'Add a bank account, credit card, PayLater, or cash wallet'}
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

        {/* Form Body */}
        <form
          id="account-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Account Type Selector */}
          <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-[#111723] rounded-xl border border-slate-200/70 dark:border-[#1c2536]">
            {(
              [
                { id: 'bank', label: 'Bank' },
                { id: 'credit_card', label: 'Card' },
                { id: 'paylater', label: 'PayLater' },
                { id: 'cash', label: 'Cash' },
              ] as { id: AccountType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTypeChange(tab.id)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                  type === tab.id
                    ? 'bg-white dark:bg-[#1b2436] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a364f]'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>{isCreditFacility ? 'Card / Provider Name' : 'Account Name'}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === 'credit_card'
                  ? 'e.g. BCA Visa Platinum, Mandiri Card'
                  : type === 'paylater'
                  ? 'e.g. GoPayLater, ShopeePayLater'
                  : 'e.g. BCA Main, Cash Wallet...'
              }
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Hero Balance / Debt Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300">
                {isCreditFacility ? 'Used Credit / Current Bill' : 'Current Balance'}
              </label>
              {balance && !isNaN(Number(balance)) && (
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    isCreditFacility
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatIdr(Number(balance))}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                type="number"
                step="any"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors"
                required
              />
            </div>

            {isCreditFacility && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                <span>Available Credit Limit:</span>
                <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIdr(Math.max(0, Number(creditLimit || 0) - Number(balance || 0)))}
                </strong>
              </div>
            )}
          </div>

          {/* Credit Card / PayLater Specific Fields */}
          {isCreditFacility && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Total Credit Limit (IDR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="20000000"
                      className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-8 pr-3 text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {type === 'credit_card' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Card Network
                    </label>
                    <select
                      value={cardNetwork}
                      onChange={(e) => setCardNetwork(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none"
                    >
                      {CARD_NETWORKS.map((net) => (
                        <option key={net} value={net}>
                          {net}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={`grid ${type === 'credit_card' ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
                {type === 'credit_card' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={last4Digits}
                      onChange={(e) => setLast4Digits(e.target.value)}
                      placeholder="4821"
                      className="w-full h-9 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Billing Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Due Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Account Number (Optional) */}
          {!isCreditFacility && type !== 'cash' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Number (Optional)</span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 521098231 or •••• 4821"
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Color Tag */}
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
                  className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                    color === c
                      ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-emerald-500/40'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Clean Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-50/70 dark:bg-[#090d14] border-t border-slate-100 dark:border-[#161e2e] flex items-center justify-between gap-2">
          {editingAccount ? (
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
              form="account-modal-form"
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
                  <span>{editingAccount ? 'Save Changes' : 'Add Account'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
