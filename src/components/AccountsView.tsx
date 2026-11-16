import React from 'react';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Edit2,
  Wallet,
  Landmark,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatMasked } from '../lib/formatters';
import { Account } from '../types';

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
  
  const totalLiquid = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) +
    cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) -
    totalCcDebt - totalPaylaterDebt;

  return (
    <div className="space-y-6 animate-in fade-in pb-12 min-w-0">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Accounts & Wallets
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              · {accounts.length} total accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Bank accounts, cash reserves, e-wallets, credit cards, and paylater facilities
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAddAccountOpen(true);
            }}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Account</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('bank_to_investment');
              setIsTransferOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-[#11192e] hover:bg-slate-50 dark:hover:bg-[#17223d] text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Fund Investment</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('account_to_account');
              setIsTransferOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-[#11192e] hover:bg-slate-50 dark:hover:bg-[#17223d] text-blue-600 dark:text-blue-300 text-xs font-medium border border-slate-200 dark:border-[#222f4d] transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Transfer</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics by Account Group (3 Cells) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-[#0d2247] dark:via-[#0a1936] dark:to-[#081329] border border-indigo-200/90 dark:border-[#1f3f77] shadow-sm min-w-0">
          <span className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 font-mono uppercase tracking-wider block">
            NET LIQUID CASH
          </span>
          <p className={`text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums mt-0.5 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalLiquid, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Assets minus debt liabilities</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 dark:from-[#0c2044] dark:via-[#091834] dark:to-[#081329] border border-indigo-200/80 dark:border-[#1c3a6e] shadow-sm min-w-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider gap-2">
            <span className="truncate">BANKS & CASH</span>
            <Landmark className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className={`text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-0.5 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalBankBalance + totalCashBalance, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">{bankAccounts.length + cashAccounts.length} accounts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] shadow-sm min-w-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider gap-2">
            <span className="truncate">CC & PAYLATER DEBT</span>
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className={`text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalCcDebt + totalPaylaterDebt, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">{creditCards.length + paylaterAccounts.length} facility(ies)</span>
        </div>
      </div>

      {/* Credit Cards Section */}
      {creditCards.length > 0 && (
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase truncate">
                CREDIT CARDS & REVOLVING DEBT
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 shrink-0">{creditCards.length} card facility</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {creditCards.map((card) => {
              const accentColor = card.color || '#f59e0b';
              const limit = card.creditLimit || 1;
              const debt = card.balance || 0;
              const available = Math.max(0, limit - debt);
              const utilization = Math.min(100, Math.round((debt / limit) * 100));

              return (
                <div
                  key={card.id}
                  className="relative p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] hover:border-slate-300 dark:hover:border-[#2b3b63] transition-all group overflow-hidden shadow-sm min-w-0"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono truncate">{card.name}</h3>
                          {card.cardNetwork && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              {card.cardNetwork}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 block truncate">
                          {card.last4Digits ? `•••• ${card.last4Digits}` : 'CREDIT CARD'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingAccount(card);
                        setIsAddAccountOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#141d33] transition-colors cursor-pointer shrink-0"
                      title="Edit card parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Hero: Available Credit */}
                  <div className="space-y-0.5 mb-3 font-mono min-w-0">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE CREDIT</span>
                    <p className={`text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(available, 'IDR', isPrivacyMode)}
                    </p>
                  </div>

                  {/* Sub Details: Used Credit & Total Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] font-mono min-w-0">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">USED CREDIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(debt, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">TOTAL LIMIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(limit, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1 mb-3.5 font-mono min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-zinc-400">
                      <span className="truncate">LIMIT: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(limit, 'IDR', isPrivacyMode)}</span></span>
                      <span className={`shrink-0 ${utilization > 70 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {utilization}% UTILIZED
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#151e34] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span>Billing: {card.billingDate ? `Day ${card.billingDate}` : '25th'}</span>
                      <span>Due: {card.dueDate ? `Day ${card.dueDate}` : '10th'}</span>
                    </div>
                  </div>

                  {/* Pay Bill Action */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-[#1b2540]">
                    <button
                      onClick={() => {
                        setPayBillCard(card);
                        setIsPayBillOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs border border-amber-500/30 transition-colors cursor-pointer font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>PAY BILL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PayLater Section */}
      {paylaterAccounts.length > 0 && (
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase truncate">
                PAYLATER FACILITIES & DEBT
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 shrink-0">{paylaterAccounts.length} facility(ies)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paylaterAccounts.map((pl) => {
              const accentColor = pl.color || '#1d64e8';
              const limit = pl.creditLimit || 1;
              const debt = pl.balance || 0;
              const available = Math.max(0, limit - debt);
              const utilization = Math.min(100, Math.round((debt / limit) * 100));

              return (
                <div
                  key={pl.id}
                  className="relative p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] hover:border-slate-300 dark:hover:border-[#2b3b63] transition-all group overflow-hidden shadow-sm min-w-0"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono truncate">{pl.name}</h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                            PAYLATER
                          </span>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 block truncate">
                          {pl.last4Digits ? `•••• ${pl.last4Digits}` : 'PAYLATER ACCOUNT'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingAccount(pl);
                        setIsAddAccountOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#141d33] transition-colors cursor-pointer shrink-0"
                      title="Edit paylater parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Hero: Available Credit */}
                  <div className="space-y-0.5 mb-3 font-mono min-w-0">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE CREDIT</span>
                    <p className={`text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(available, 'IDR', isPrivacyMode)}
                    </p>
                  </div>

                  {/* Sub Details: Used Credit & Total Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] font-mono min-w-0">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">USED CREDIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(debt, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">TOTAL LIMIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(limit, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1 mb-3.5 font-mono min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-zinc-400">
                      <span className="truncate">LIMIT: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(limit, 'IDR', isPrivacyMode)}</span></span>
                      <span className={`shrink-0 ${utilization > 70 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {utilization}% UTILIZED
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#151e34] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span>Billing: {pl.billingDate ? `Day ${pl.billingDate}` : '25th'}</span>
                      <span>Due: {pl.dueDate ? `Day ${pl.dueDate}` : '10th'}</span>
                    </div>
                  </div>

                  {/* Pay Bill Action */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-[#1b2540]">
                    <button
                      onClick={() => {
                        setPayBillCard(pl);
                        setIsPayBillOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono text-xs border border-indigo-500/30 transition-colors cursor-pointer font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>PAY BILL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bank & Cash Accounts Grid */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase truncate">
              LIQUID LEDGERS (BANKS & CASH)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 shrink-0">
            {bankAccounts.length + cashAccounts.length} account(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...bankAccounts, ...cashAccounts].map((acc) => {
            const accentColor = acc.color || '#1d64e8';

            return (
              <div
                key={acc.id}
                className="relative p-4 rounded-xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-[#1b2540] hover:border-slate-300 dark:hover:border-[#2b3b63] transition-all group overflow-hidden shadow-sm min-w-0"
              >
                <div
                  className="absolute top-0 inset-x-0 h-1"
                  style={{ backgroundColor: accentColor }}
                />

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {acc.type === 'bank' && <Landmark className="w-4 h-4" />}
                      {acc.type === 'cash' && <Coins className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono truncate">{acc.name}</h3>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 block">
                        {acc.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setIsAddAccountOpen(true);
                    }}
                    className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#141d33] transition-colors cursor-pointer shrink-0"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5 mb-4 font-mono min-w-0">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE BALANCE</span>
                  <p className={`text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                    {formatMasked(acc.balance, 'IDR', isPrivacyMode)}
                  </p>
                  {acc.accountNumber && (
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums truncate">{acc.accountNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2.5 border-t border-slate-100 dark:border-[#1b2540]">
                  <button
                    onClick={() => {
                      setTransferInitialMode('account_to_account');
                      setIsTransferOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] hover:bg-slate-100 dark:hover:bg-[#15203a] text-slate-700 dark:text-zinc-300 font-mono text-xs border border-slate-200 dark:border-[#1e2946] transition-colors cursor-pointer min-w-0"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="truncate">TRANSFER</span>
                  </button>

                  <button
                    onClick={() => {
                      setTransferInitialMode('bank_to_investment');
                      setIsTransferOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#0f1629] hover:bg-slate-100 dark:hover:bg-[#15203a] text-slate-700 dark:text-zinc-300 font-mono text-xs border border-slate-200 dark:border-[#1e2946] transition-colors cursor-pointer min-w-0"
                  >
                    <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">FUND INVEST</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
