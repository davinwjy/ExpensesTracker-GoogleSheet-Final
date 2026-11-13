import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  TrendingUp,
  PieChart,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Wallet,
  Shield,
  Target,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatUsd } from '../lib/formatters';
import { isUserAdmin } from '../lib/admin';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    accounts,
    transactions,
    investments,
    budgets,
    stats,
    usdIdrRate,
    isPrivacyMode,
    togglePrivacyMode,
  } = useFinance();

  const isAdmin = isUserAdmin(user);

  const displayName = React.useMemo(() => {
    if (user?.name && user.name.trim()) return user.name.trim();
    if (user?.email) {
      const localPart = user.email.split('@')[0] || 'User';
      return localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return 'Guest User';
  }, [user]);

  const userInitials = React.useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase() || 'WT';
  }, [displayName]);

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      count: null,
    },
    {
      id: 'expenses' as const,
      label: 'Transactions',
      icon: Receipt,
      count: transactions.length > 0 ? transactions.length : null,
    },
    {
      id: 'budgeting' as const,
      label: 'Budgeting',
      icon: Target,
      count: budgets.length > 0 ? budgets.length : null,
    },
    {
      id: 'accounts' as const,
      label: 'Accounts',
      icon: WalletCards,
      count: accounts.length > 0 ? accounts.length : null,
    },
    {
      id: 'investments' as const,
      label: 'Portfolio',
      icon: TrendingUp,
      count: investments.length > 0 ? investments.length : null,
    },
    {
      id: 'stats' as const,
      label: 'Analytics',
      icon: PieChart,
      count: null,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Admin Console',
            icon: Shield,
            count: 'Admin',
          },
        ]
      : []),
  ];

  const netWorthIdr = stats?.totalNetWorthIdr || 0;
  const netWorthUsd = usdIdrRate > 0 ? netWorthIdr / usdIdrRate : 0;

  const handleSelectNav = (
    tabId: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'
  ) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const renderSidebarContent = (layoutScope: 'desktop' | 'mobile') => (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#070a0f] border-r border-slate-200/80 dark:border-[#161e2e] text-slate-800 dark:text-zinc-200 select-none">
      {/* 1. CLEAN BRAND HEADER (Aligned with h-16 TopHeader) */}
      <div
        className={`h-16 border-b border-slate-200/70 dark:border-[#141c2b] flex items-center justify-between shrink-0 ${
          isCollapsed ? 'px-2.5 justify-center' : 'px-4'
        }`}
      >
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group min-w-0"
          title="WealthTrack Pro"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center shadow-xs group-hover:opacity-90 transition-opacity shrink-0">
            <Wallet className="w-4 h-4 stroke-[2.2]" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-white truncate whitespace-nowrap">
              WealthTrack
            </span>
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#141b28] transition-colors cursor-pointer shrink-0"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop Collapse Toggle */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#141b28] transition-colors cursor-pointer shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed on desktop */}
      {isCollapsed && (
        <div className="hidden lg:flex justify-center pt-3 pb-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#141b28] transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. UNIFIED NAVIGATION MENU */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 text-xs rounded-xl transition-colors cursor-pointer group ${
                isActive
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/50 dark:hover:bg-[#111723]'
              } ${isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId={`sidebar-solid-pill-${layoutScope}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-white dark:bg-[#141b29] border border-slate-200/80 dark:border-[#222e46] shadow-2xs pointer-events-none"
                />
              )}

              <Icon
                className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.2]'
                    : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="relative z-10 flex-1 text-left truncate whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.count !== null && (
                    <span
                      className={`relative z-10 text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. QUIET BOTTOM NET WORTH FOOTNOTE (Only when expanded) */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-slate-200/70 dark:border-[#141c2b] shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
            <span className="font-medium">Total Net Worth</span>
            <button
              type="button"
              onClick={togglePrivacyMode}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5 rounded transition-colors cursor-pointer"
              title={isPrivacyMode ? 'Show values' : 'Hide values'}
            >
              {isPrivacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div
            className={`font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100 truncate tabular-nums font-mono ${
              isPrivacyMode ? 'privacy-blur' : ''
            }`}
          >
            {formatIdr(netWorthIdr)}
          </div>

          <div
            className={`text-[11px] text-slate-400 dark:text-zinc-500 truncate mt-0.5 tabular-nums font-mono ${
              isPrivacyMode ? 'privacy-blur' : ''
            }`}
          >
            ≈ {formatUsd(netWorthUsd)}
          </div>
        </div>
      )}

      {/* 4. USER PROFILE FOOTER */}
      <div
        className={`border-t border-slate-200/70 dark:border-[#141c2b] shrink-0 ${
          isCollapsed ? 'p-2.5 flex justify-center' : 'px-3.5 py-3'
        }`}
      >
        {isCollapsed ? (
          <div
            className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center font-mono"
            title={`${displayName}${user?.email ? ` (${user.email})` : ''}`}
          >
            {userInitials}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">
                  {displayName}
                </div>
                {user?.email && (
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5 font-mono">
                    {user.email}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        <div
          className="fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out"
          style={{ width: isCollapsed ? '4.5rem' : '15rem' }}
        >
          {renderSidebarContent('desktop')}
        </div>
      </aside>

      {/* Mobile Drawer (with backdrop) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="relative w-64 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {renderSidebarContent('mobile')}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
