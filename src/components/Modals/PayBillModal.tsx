import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CreditCard,
  RotateCcw,
  AlertCircle,
  Loader2,
  Wallet,
  Calendar,
  FileText,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIdr } from '../../lib/formatters';

export const PayBillModal: React.FC = () => {
  const {
    isPayBillOpen,
    setIsPayBillOpen,
    payBillCard,
    setPayBillCard,
    accounts,
    payCreditCardBill,
    showNotification,
  } = useFinance();

  const creditCards = React.useMemo(
    () => accounts.filter((a) => a.type === 'credit_card' || a.type === 'paylater'),
    [accounts]
  );
  const fundingAccounts = React.useMemo(
    () => accounts.filter((a) => a.type === 'bank' || a.type === 'cash'),
    [accounts]
  );

  const [creditCardAccountId, setCreditCardAccountId] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [amountIdr, setAmountIdr] = useState<string>('');
  const [adminFee, setAdminFee] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wasOpenRef = React.useRef(false);
  const lastPayBillCardIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isPayBillOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentCardId = payBillCard ? payBillCard.id : null;
      const isCardChanged = currentCardId !== lastPayBillCardIdRef.current;

      if (isFreshOpen || isCardChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastPayBillCardIdRef.current = currentCardId;

        if (payBillCard) {
          setCreditCardAccountId(payBillCard.id);
          setAmountIdr(payBillCard.balance > 0 ? payBillCard.balance.toString() : '');
        } else if (creditCards.length > 0) {
          setCreditCardAccountId(creditCards[0].id);
          setAmountIdr(creditCards[0].balance > 0 ? creditCards[0].balance.toString() : '');
        }

        if (fundingAccounts.length > 0) {
          setSourceAccountId(fundingAccounts[0].id);
        }

        setAdminFee('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setError('');
      }
    } else {
      wasOpenRef.current = false;
      lastPayBillCardIdRef.current = undefined;
    }
  }, [isPayBillOpen, payBillCard, creditCards, fundingAccounts]);

  useEffect(() => {
    if (!isPayBillOpen) return;
    if (!creditCardAccountId && creditCards.length > 0) {
      setCreditCardAccountId(creditCards[0].id);
      if (!amountIdr && creditCards[0].balance > 0) {
        setAmountIdr(creditCards[0].balance.toString());
      }
    }
    if (!sourceAccountId && fundingAccounts.length > 0) {
      setSourceAccountId(fundingAccounts[0].id);
    }
  }, [isPayBillOpen, creditCards, fundingAccounts, creditCardAccountId, sourceAccountId, amountIdr]);

  const handleCardSelectChange = (newCardId: string) => {
    setCreditCardAccountId(newCardId);
    const card = accounts.find((a) => a.id === newCardId);
    if (card && card.balance > 0) {
      setAmountIdr(card.balance.toString());
    }
  };

  const resetForm = () => {
    setIsSubmitting(false);
    if (creditCards.length > 0) {
      setCreditCardAccountId(creditCards[0].id);
      setAmountIdr(creditCards[0].balance > 0 ? creditCards[0].balance.toString() : '');
    }
    if (fundingAccounts.length > 0) {
      setSourceAccountId(fundingAccounts[0].id);
    }
    setAdminFee('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    setPayBillCard(null);
    setIsPayBillOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const parsedAmount = Number(amountIdr);
    const parsedFee = adminFee ? Number(adminFee) || 0 : 0;
    const totalDeduction = parsedAmount + parsedFee;

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      setIsSubmitting(false);
      return;
    }

    if (!creditCardAccountId) {
      setError('Please select a credit card to pay');
      setIsSubmitting(false);
      return;
    }

    if (!sourceAccountId) {
      setError('Please select a funding source account (Bank or Cash)');
      setIsSubmitting(false);
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === sourceAccountId);
    if (sourceAcc && sourceAcc.balance < totalDeduction) {
      setError(`Insufficient balance in ${sourceAcc.name} to cover bill + fee (Required: ${formatIdr(totalDeduction)}, Available: ${formatIdr(sourceAcc.balance)})`);
      setIsSubmitting(false);
      return;
    }

    try {
      await payCreditCardBill({
        creditCardAccountId,
        sourceAccountId,
        amountIdr: parsedAmount,
        adminFee: parsedFee > 0 ? parsedFee : undefined,
        date,
        notes: notes.trim() || undefined,
      });

      const targetCard = accounts.find((a) => a.id === creditCardAccountId);
      showNotification({
        type: 'success',
        txType: 'bill_pay',
        title: 'Bill Payment Successful',
        message: targetCard ? `Bill for ${targetCard.name} has been settled${parsedFee > 0 ? ` with Rp ${parsedFee.toLocaleString()} fee` : ''}` : undefined,
        amount: totalDeduction,
        category: targetCard?.type === 'paylater' ? 'PayLater Bill' : 'Credit Card Bill',
        accountName: targetCard?.name || 'Credit Card',
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to pay credit card bill');
      setIsSubmitting(false);
    }
  };

  if (!isPayBillOpen) return null;

  const selectedCard = accounts.find((a) => a.id === creditCardAccountId);
  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

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
              Pay Credit Card / PayLater Bill
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Settle your statement balance and restore available credit limit
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
          id="pay-bill-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Hero Payment Amount Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101622] border border-slate-200/80 dark:border-[#1d273a] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300">
                Payment Amount (IDR)
              </label>
              {amountIdr && !isNaN(Number(amountIdr)) && Number(amountIdr) > 0 && (
                <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIdr(Number(amountIdr))}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountIdr}
                onChange={(e) => setAmountIdr(e.target.value)}
                placeholder="0"
                className="w-full bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222d42] focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors"
                required
              />
            </div>

            {selectedCard && (
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Current Bill:{' '}
                  <strong className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {formatIdr(selectedCard.balance)}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setAmountIdr(selectedCard.balance.toString())}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#151d2c] dark:hover:bg-[#1c263a] text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-slate-200/80 dark:border-[#232f46] cursor-pointer transition-colors"
                >
                  Pay Full Bill
                </button>
              </div>
            )}
          </div>

          {/* Target Credit Card or PayLater */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Card / PayLater to Settle</span>
              </label>
              {selectedCard && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Avail Limit:{' '}
                  <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatIdr(Math.max(0, (selectedCard.creditLimit || 0) - selectedCard.balance))}
                  </strong>
                </span>
              )}
            </div>
            <select
              value={creditCardAccountId}
              onChange={(e) => handleCardSelectChange(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
              required
            >
              {creditCards.length === 0 && (
                <option value="">No credit card or PayLater accounts found</option>
              )}
              {creditCards.map((card) => {
                const tag = card.type === 'paylater' ? 'PayLater' : card.cardNetwork || 'Card';
                return (
                  <option key={card.id} value={card.id}>
                    {card.name} ({tag}) — Bill: {formatIdr(card.balance)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Funding Source Account */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span>Pay From Account</span>
              </label>
              {selectedSource && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Balance:{' '}
                  <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatIdr(selectedSource.balance)}
                  </strong>
                </span>
              )}
            </div>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl px-3 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors"
              required
            >
              {fundingAccounts.length === 0 && (
                <option value="">No bank or cash accounts found</option>
              )}
              {fundingAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {formatIdr(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Admin / Settlement Fee */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-zinc-300">
                Admin Fee (Optional)
              </label>
              {adminFee && !isNaN(Number(adminFee)) && Number(adminFee) > 0 && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Total Deduction:{' '}
                  <strong className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {formatIdr((Number(amountIdr) || 0) + Number(adminFee))}
                  </strong>
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={adminFee}
                onChange={(e) => setAdminFee(e.target.value)}
                placeholder="0"
                className="w-full h-10 bg-white dark:bg-[#101622] border border-slate-200 dark:border-[#1d273a] focus:border-emerald-500 rounded-xl pl-8 pr-3 text-xs font-semibold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

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
                placeholder="e.g. Monthly statement..."
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
            form="pay-bill-form"
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
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Pay Bill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
