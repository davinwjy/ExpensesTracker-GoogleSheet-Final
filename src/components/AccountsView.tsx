import React from 'react';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Edit2,
  Landmark,
  Coins,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMasked } from '../lib/formatters';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    isPrivacyMode,
    setIsAddAccountOpen,
    setEditingAccount,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsPayBillOpen,
    setPayBillCard,
  } = useFinance();

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const paylaterAccounts = accounts.filter((a) => a.type === 'paylater');

  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCashBalance = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCcDebt = creditCards.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalPaylaterDebt = paylaterAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalLiquid =
    totalBankBalance + totalCashBalance - totalCcDebt - totalPaylaterDebt;

  const liquidAccounts = [...bankAccounts, ...cashAccounts];
  const creditFacilities = [...creditCards, ...paylaterAccounts];

  return (
    <div className="space-y-3.5 animate-in fade-in pb-12 min-w-0">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Accounts & Wallets
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              · {accounts.length} total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
            Banks, cash wallets, credit cards, and paylater facilities
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAddAccountOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#11192e] hover:bg-slate-50 dark:hover:bg-[#17223d] text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Add Account</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('account_to_account');
              setIsTransferOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Transfer</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Strip */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-[#161b26] dark:via-[#12151d] dark:to-[#101218] border border-indigo-200/90 dark:border-[#2a3347] shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 md:gap-y-0">
          {/* Net Liquid Cash */}
          <div className="col-span-2 md:col-span-1 pb-2 md:pb-0 md:pr-4 border-b md:border-b-0 md:border-r border-indigo-200/70 dark:border-[#242b3c] flex items-center justify-between md:block gap-2 min-w-0">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-indigo-700/80 dark:text-zinc-400 block truncate">
                Net Liquid Cash
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 block truncate md:hidden">
                Assets minus debt
              </span>
            </div>
            <p className={`text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tabular-nums md:mt-0.5 shrink-0 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalLiquid, 'IDR', isPrivacyMode)}
            </p>
            <span className="hidden md:block text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 truncate">
              Assets minus debt liabilities
            </span>
          </div>

          {/* Banks & Cash */}
          <div className="pr-3 md:px-4 border-r border-slate-200/80 dark:border-[#242b3c] min-w-0">
            <div className="flex items-center justify-between gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-blue-400">
              <span className="truncate">
                Banks & Cash <span className="text-slate-400 dark:text-zinc-500 font-normal">({liquidAccounts.length})</span>
              </span>
              <Landmark className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className={`text-sm sm:text-base font-bold text-indigo-600 dark:text-blue-400 tabular-nums mt-0.5 truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalBankBalance + totalCashBalance, 'IDR', isPrivacyMode)}
            </p>
          </div>

          {/* CC & Paylater Debt */}
          <div className="pl-3 md:pl-4 min-w-0">
            <div className="flex items-center justify-between gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <span className="truncate">
                CC & Paylater <span className="text-slate-400 dark:text-zinc-500 font-normal">({creditFacilities.length})</span>
              </span>
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className={`text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalCcDebt + totalPaylaterDebt, 'IDR', isPrivacyMode)}
            </p>
          </div>
        </div>
      </div>

      {/* Liquid Ledgers (Banks & Cash) — Compact Hairline List */}
      <div className="rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm overflow-hidden min-w-0">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 sm:px-4 border-b border-slate-100 dark:border-[#1b2540]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Landmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
              Banks & Cash
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
              · {liquidAccounts.length}
            </span>
          </div>
          <span className={`text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-blue-400 shrink-0 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalBankBalance + totalCashBalance, 'IDR', isPrivacyMode)}
          </span>
        </div>

        {liquidAccounts.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-zinc-400">
            No bank or cash accounts added yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#161f38]">
            {liquidAccounts.map((acc) => {
              const accentColor = acc.color || '#1d64e8';

              return (
                <div
                  key={acc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2 hover:bg-slate-50/80 dark:hover:bg-[#0f1629] transition-colors min-w-0"
                >
                  {/* Top / Left: Icon + Name + Balance (on mobile, balance sits cleanly opposite name) */}
                  <div className="flex items-center justify-between gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        {acc.type === 'bank' ? (
                          <Landmark className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        ) : (
                          <Coins className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-[13px] sm:text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                          {acc.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                          <span className="hidden sm:inline text-slate-300 dark:text-zinc-700" aria-hidden="true">
                            ·
                          </span>
                          <span className="capitalize">{acc.type}</span>
                          {acc.accountNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{acc.accountNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile-only Balance */}
                    <span className={`sm:hidden text-[13px] font-mono tabular-nums font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap shrink-0 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(acc.balance, 'IDR', isPrivacyMode)}
                    </span>
                  </div>

                  {/* Bottom on Mobile / Right on Desktop: Desktop Balance + Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pl-9 sm:pl-0 shrink-0">
                    <span className={`hidden sm:inline text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(acc.balance, 'IDR', isPrivacyMode)}
                    </span>

                    <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-1 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setTransferInitialMode('account_to_account');
                          setIsTransferOpen(true);
                        }}
                        className="py-1.5 px-2 sm:py-1 rounded-md bg-slate-50 dark:bg-[#11192e] hover:bg-slate-100 dark:hover:bg-[#17223d] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px] sm:text-[10px] font-medium"
                        title="Transfer funds"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span>Transfer</span>
                      </button>

                      <button
                        onClick={() => {
                          setTransferInitialMode('bank_to_investment');
                          setIsTransferOpen(true);
                        }}
                        className="py-1.5 px-2 sm:py-1 rounded-md bg-slate-50 dark:bg-[#11192e] hover:bg-slate-100 dark:hover:bg-[#17223d] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px] sm:text-[10px] font-medium"
                        title="Fund investment"
                      >
                        <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span>Invest</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsAddAccountOpen(true);
                        }}
                        className="py-1.5 px-2 sm:p-1.5 rounded-md bg-slate-50 dark:bg-[#11192e] sm:bg-transparent sm:dark:bg-transparent text-slate-600 sm:text-slate-400 dark:text-zinc-300 sm:dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#141d33] border border-slate-200 dark:border-[#222f4d] sm:border-0 transition-colors cursor-pointer flex items-center justify-center gap-1 text-[11px] sm:text-[10px] font-medium"
                        title="Edit account"
                      >
                        <Edit2 className="w-3 h-3 shrink-0" />
                        <span className="sm:hidden">Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit Cards & PayLater Section — Compact Rows */}
      {creditFacilities.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 sm:px-4 border-b border-slate-100 dark:border-[#1b2540]">
            <div className="flex items-center gap-1.5 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                Credit Cards & PayLater
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
                · {creditFacilities.length}
              </span>
            </div>
            <span className={`text-xs font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400 shrink-0 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalCcDebt + totalPaylaterDebt, 'IDR', isPrivacyMode)} debt
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#161f38]">
            {creditFacilities.map((facility) => {
              const isPaylater = facility.type === 'paylater';
              const accentColor = facility.color || (isPaylater ? '#1d64e8' : '#f59e0b');
              const limit = facility.creditLimit || 1;
              const debt = facility.balance || 0;
              const available = Math.max(0, limit - debt);
              const utilization = Math.min(100, Math.round((debt / limit) * 100));

              return (
                <div
                  key={facility.id}
                  className="px-3.5 py-2.5 sm:px-4 hover:bg-slate-50/80 dark:hover:bg-[#0f1629] transition-colors space-y-2 sm:space-y-1.5 min-w-0"
                >
                  {/* Row 1: Identity + Available Credit (+ Desktop Actions) */}
                  <div className="flex items-center justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <CreditCard className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-[13px] sm:text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                          {facility.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                          <span className="hidden sm:inline text-slate-300 dark:text-zinc-700" aria-hidden="true">
                            ·
                          </span>
                          <span>
                            {isPaylater
                              ? 'PayLater'
                              : facility.cardNetwork || 'Card'}
                          </span>
                          {facility.last4Digits && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>••{facility.last4Digits}</span>
                            </>
                          )}
                          <span className="hidden sm:inline" aria-hidden="true">·</span>
                          <span className="hidden sm:inline whitespace-nowrap">
                            Bill {facility.billingDate || 25} / Due {facility.dueDate || 10}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className={`text-[13px] sm:text-sm font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap block sm:inline ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                          {formatMasked(available, 'IDR', isPrivacyMode)}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 sm:ml-1 block sm:inline leading-none">
                          avail
                        </span>
                      </div>

                      {/* Desktop Inline Actions */}
                      <button
                        onClick={() => {
                          setPayBillCard(facility);
                          setIsPayBillOpen(true);
                        }}
                        className={`hidden sm:inline-flex px-2 py-1 rounded-md font-mono text-[10px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isPaylater
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Pay Bill
                      </button>

                      <button
                        onClick={() => {
                          setEditingAccount(facility);
                          setIsAddAccountOpen(true);
                        }}
                        className="hidden sm:inline-flex p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#141d33] transition-colors cursor-pointer"
                        title="Edit facility parameters"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Utilization Progress Bar + Used/Limit Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 pl-9 sm:pl-8 font-mono text-[10px] min-w-0">
                    <div className="w-full sm:flex-1 h-1.5 sm:h-1 bg-slate-200 dark:bg-[#151e34] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 70
                            ? 'bg-rose-500'
                            : utilization > 40
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 text-slate-500 dark:text-zinc-400 tabular-nums">
                      <span>
                        <span className={`text-amber-600 dark:text-amber-400 font-semibold ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                          {formatMasked(debt, 'IDR', isPrivacyMode)}
                        </span>
                        <span className="mx-1">/</span>
                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                          {formatMasked(limit, 'IDR', isPrivacyMode)}
                        </span>
                      </span>
                      <span className={utilization > 70 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                        {utilization}% used
                      </span>
                    </div>
                  </div>

                  {/* Row 3 (Mobile Only): Billing/Due Dates + Pay Bill & Edit Buttons */}
                  <div className="flex sm:hidden items-center justify-between gap-2 pl-9 pt-0.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                      Bill {facility.billingDate || 25} · Due {facility.dueDate || 10}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setPayBillCard(facility);
                          setIsPayBillOpen(true);
                        }}
                        className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isPaylater
                            ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Pay Bill
                      </button>

                      <button
                        onClick={() => {
                          setEditingAccount(facility);
                          setIsAddAccountOpen(true);
                        }}
                        className="p-1.5 rounded-md bg-slate-50 dark:bg-[#11192e] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
                        title="Edit facility parameters"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
