import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Activity,
  Database,
  RefreshCw,
  Trash2,
  UserPlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Download,
  Lock,
  Mail,
  Sliders,
  X,
  EyeOff,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { AdminOverviewStats, AdminUserListItem, SystemSettings } from '../types';
import { formatDate } from '../lib/formatters';
import { isUserAdmin, DEFAULT_ADMIN_EMAILS } from '../lib/admin';

const PRIMARY_ADMIN_EMAIL = DEFAULT_ADMIN_EMAILS[0];

type AdminSubTab = 'overview' | 'users' | 'settings';

export const AdminView: React.FC = () => {
  const { user } = useAuth();

  const [subTab, setSubTab] = useState<AdminSubTab>('overview');
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // User Management Filters & Actions
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // System Announcement State
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [annEnabled, setAnnEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
  const [defaultUsdRate, setDefaultUsdRate] = useState('15850');

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovRes, usRes, setRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminSystemSettings(),
      ]);

      setOverview(ovRes);
      setUsers(usRes.users || []);
      if (setRes.settings) {
        setSystemSettings(setRes.settings);
        setAnnMessage(setRes.settings.announcement?.message || '');
        setAnnType(setRes.settings.announcement?.type || 'info');
        setAnnEnabled(Boolean(setRes.settings.announcement?.enabled));
        setMaintenanceMode(Boolean(setRes.settings.maintenanceMode));
        setAllowNewRegistrations(setRes.settings.allowNewRegistrations !== false);
        setDefaultUsdRate(String(setRes.settings.defaultUsdIdrRate || 15850));
      }
    } catch (err: any) {
      console.error('Failed to load admin console data:', err);
      showToast(err.message || 'Failed to load admin console data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isUserAdmin(user)) {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  if (!isUserAdmin(user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Restricted Access
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm">
          This governance console is restricted to authorized platform administrators (
          <span className="text-emerald-600 dark:text-emerald-400 font-mono">{PRIMARY_ADMIN_EMAIL}</span>).
        </p>
      </div>
    );
  }

  const handleToggleUserRole = async (targetUser: AdminUserListItem) => {
    if (targetUser.email.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
      showToast('Cannot demote the primary master administrator.', 'error');
      return;
    }
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await api.setAdminUserRole(targetUser.id, nextRole, targetUser.email);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id || u.email.toLowerCase() === targetUser.email.toLowerCase()
            ? { ...u, role: nextRole }
            : u
        )
      );
      showToast(`Updated ${targetUser.email} role to ${nextRole.toUpperCase()}`);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = newAdminEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    try {
      const res = await api.addAdminEmail(targetEmail);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              registeredAdmins: res.adminEmails,
              adminCount: res.adminEmails.length,
            }
          : prev
      );
      setNewAdminEmail('');
      showToast(`Granted administrator privileges to ${targetEmail}`);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add admin email', 'error');
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === PRIMARY_ADMIN_EMAIL) {
      showToast('Cannot revoke primary super admin privileges', 'error');
      return;
    }
    try {
      const res = await api.removeAdminEmail(cleanEmail);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              registeredAdmins: res.adminEmails,
              adminCount: res.adminEmails.length,
            }
          : prev
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.email.toLowerCase() === cleanEmail ? { ...u, role: 'user' } : u
        )
      );
      showToast(`Revoked admin privileges from ${cleanEmail}`);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove admin email', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await api.deleteAdminUser(userId);
      showToast(res.message || 'User account deleted');
      setConfirmDeleteUserId(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.updateAdminSystemSettings({
        announcement: {
          id: systemSettings?.announcement?.id || 'ann_' + Date.now(),
          message: annMessage.trim(),
          type: annType,
          enabled: annEnabled,
          updatedAt: new Date().toISOString(),
        },
        maintenanceMode,
        allowNewRegistrations,
        defaultUsdIdrRate: Number(defaultUsdRate) || 15850,
      });
      showToast('System settings and broadcast policies saved');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save system settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      const dump = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wealthtrack-governance-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported non-financial governance snapshot');
    } catch (err: any) {
      showToast(err.message || 'Failed to export configuration', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsersCount = overview?.totalUsers ?? users.length;
  const cloudSyncConnectedCount = users.filter((u) => u.hasSheetSync).length;
  const localOnlyUsersCount = Math.max(0, totalUsersCount - cloudSyncConnectedCount);

  const navItems: { id: AdminSubTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview & Health', icon: Activity },
    { id: 'users', label: 'Users & Access', icon: Users, badge: users.length },
    { id: 'settings', label: 'Site Settings & Broadcast', icon: Sliders },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Governance Header Card */}
      <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Platform Governance Console
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-mono">
                {user?.email}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              System Administration &amp; Access Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Manage platform accounts, administrator permissions, and global broadcast announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={loadAdminData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#151a24] dark:hover:bg-[#1c2230] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#232a3b] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
              Refresh Status
            </button>
            <button
              onClick={handleExportConfig}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export Config JSON
            </button>
          </div>
        </div>

        {/* Zero-Knowledge Financial Privacy Shield Banner */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-[#1b212e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Zero-Knowledge Financial Privacy Enforced
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  STRICT
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Administrators cannot view, query, or export any user&apos;s net worth, account balances, investment holdings, or expenses.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Wealth &amp; Expense Telemetry Disabled
          </div>
        </div>
      </div>

      {/* Animated Sub-Tab Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = subTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-subtab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#171c28] border border-slate-200/80 dark:border-[#252d3d] shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content Area with Framer Motion Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* TAB 1: OVERVIEW & HEALTH */}
          {subTab === 'overview' && (
            <div className="space-y-6">
              {/* 3 Non-Financial Governance KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Registered Users
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {overview?.totalUsers ?? users.length}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Active platform accounts
                  </p>
                </div>

                <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Administrator Seats
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {overview?.adminCount || 1}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Whitelisted governance emails
                  </p>
                </div>

                <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Broadcast &amp; Access Policy
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Megaphone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {annEnabled ? 'Active' : 'Standby'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {allowNewRegistrations ? 'Open user sign-up' : 'Invite-only access'}
                  </p>
                </div>
              </div>

              {/* System Architecture & Quick Governance Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        System &amp; Privacy Architecture
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Operational
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200/70 dark:border-[#1e2536]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Storage Engine
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                        {overview?.dbType || 'JSON Persistent Store'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200/70 dark:border-[#1e2536]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Financial Data Isolation
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Zero-Knowledge (Wealth &amp; Expenses Hidden)
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200/70 dark:border-[#1e2536]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Public User Registration
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {allowNewRegistrations ? 'Enabled (Open Sign-Up)' : 'Disabled (Invite Only)'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200/70 dark:border-[#1e2536]">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Primary Super Administrator
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono truncate">
                        {PRIMARY_ADMIN_EMAIL}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Governance Actions */}
                <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Quick Governance Actions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Jump directly to user role management or site-wide broadcast announcements.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setSubTab('users')}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#141824] dark:hover:bg-[#1a2030] border border-slate-200 dark:border-[#22293a] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-blue-500" />
                        Manage Users &amp; Admin Seats
                      </span>
                      <span className="font-mono text-slate-400">{users.length}</span>
                    </button>

                    <button
                      onClick={() => setSubTab('settings')}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#141824] dark:hover:bg-[#1a2030] border border-slate-200 dark:border-[#22293a] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Megaphone className="w-4 h-4 text-amber-500" />
                        Broadcast Banner &amp; Policies
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {annEnabled ? 'Live' : 'Off'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS & ACCESS */}
          {subTab === 'users' && (
            <div className="space-y-6">
              {/* Grant Admin Access + Whitelist */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleAddAdminEmail}
                  className="lg:col-span-5 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Authorize Administrator Email
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Whitelist an email for governance access
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#22293a] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      Grant Admin
                    </button>
                  </div>
                </form>

                <div className="lg:col-span-7 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Whitelisted Administrators
                    </h3>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {(overview?.registeredAdmins || [PRIMARY_ADMIN_EMAIL]).length} Active
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(overview?.registeredAdmins || [PRIMARY_ADMIN_EMAIL]).map((email) => {
                      const isMaster = email.toLowerCase() === PRIMARY_ADMIN_EMAIL;
                      return (
                        <div
                          key={email}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                            isMaster
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'bg-slate-50 dark:bg-[#141824] border-slate-200 dark:border-[#232a3b] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{email}</span>
                          {isMaster ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] font-sans font-bold">
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminEmail(email)}
                              className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 focus:outline-none transition-colors cursor-pointer"
                              title={`Revoke admin privileges from ${email}`}
                            >
                              <X className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* User Directory Card (Zero Financial Columns) */}
              <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-[#1b212e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Registered User Directory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Identity and role governance only — personal balances, holdings, and expenses are private.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search name or email..."
                        className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#22293a] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-[#131822] p-0.5 rounded-lg border border-slate-200 dark:border-[#22293a]">
                      {(['all', 'admin', 'user'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setRoleFilter(r)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                            roleFilter === r
                              ? 'bg-white dark:bg-[#1f2637] text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile User Card Stack (< 768px) */}
                <div className="md:hidden divide-y divide-slate-200 dark:divide-[#1b212e]">
                  {filteredUsers.map((u) => {
                    const isMaster = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL;
                    return (
                      <div key={u.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {u.name}
                            </div>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                              {u.email}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                              u.role === 'admin'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono">Joined {formatDate(u.createdAt)}</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <EyeOff className="w-3 h-3" />
                            Financials Private
                          </span>
                        </div>

                        {!isMaster && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#252d3d] text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              {u.role === 'admin' ? 'Demote to Member' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUserId(u.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Governance Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#1b212e] text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-[#10141d]">
                        <th className="py-3 px-5">User Identity</th>
                        <th className="py-3 px-4">Access Role</th>
                        <th className="py-3 px-4">Cloud Sheet Link</th>
                        <th className="py-3 px-4">Financial Privacy</th>
                        <th className="py-3 px-4">Registered Date</th>
                        <th className="py-3 px-5 text-right">Governance Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#1b212e] text-xs">
                      {filteredUsers.map((u) => {
                        const isMaster = u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL;
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-[#121722] transition-colors"
                          >
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {u.name}
                              </div>
                              <div className="font-mono text-slate-500 dark:text-slate-400">
                                {u.email}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  u.role === 'admin'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-slate-100 dark:bg-[#161b26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#232a3b]'
                                }`}
                              >
                                {u.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" />}
                                {u.role === 'admin' ? 'Administrator' : 'Standard User'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {u.hasSheetSync ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                  Connected
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  Local Only
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#151a24] text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                <EyeOff className="w-3 h-3 text-emerald-500" />
                                Wealth &amp; Expenses Encrypted
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {formatDate(u.createdAt)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              {isMaster ? (
                                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                                  Protected Master Admin
                                </span>
                              ) : confirmDeleteUserId === u.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteUserId(null)}
                                    className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleUserRole(u)}
                                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#161b26] dark:hover:bg-[#1f2636] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#252d3d] text-xs font-semibold transition-colors whitespace-nowrap"
                                  >
                                    {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteUserId(u.id)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    title="Delete user account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SITE SETTINGS & BROADCAST */}
          {subTab === 'settings' && (
            <form onSubmit={handleSaveSystemSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Global Announcement Banner
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Broadcast a non-intrusive system notice at the top of the workspace for all users.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1e2536] cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Enable Broadcast Banner
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Display announcement across all user sessions
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={annEnabled}
                      onChange={(e) => setAnnEnabled(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Announcement Message
                    </label>
                    <textarea
                      rows={3}
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                      placeholder="e.g. Scheduled Google Sheets cloud sync maintenance this Sunday at 02:00 WIB."
                      className="w-full p-3 bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#22293a] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Banner Severity Style
                      </label>
                      <select
                        value={annType}
                        onChange={(e) => setAnnType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#22293a] rounded-lg text-xs text-slate-900 dark:text-white"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="success">Success (Emerald)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="alert">Critical Alert (Rose)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Default Fallback USD/IDR Rate
                      </label>
                      <input
                        type="number"
                        value={defaultUsdRate}
                        onChange={(e) => setDefaultUsdRate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#22293a] rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Access &amp; Security Policies
                    </h3>
                  </div>

                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1e2536] cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Allow Public User Registrations
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Permit new users to create accounts
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowNewRegistrations}
                      onChange={(e) => setAllowNewRegistrations(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1e2536] cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Maintenance Mode Indicator
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Show maintenance badge on public header
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  {isSavingSettings ? 'Saving Policies...' : 'Save Governance Settings'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
