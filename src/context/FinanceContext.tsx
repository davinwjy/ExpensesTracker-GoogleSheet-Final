import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import {
  Account,
  AccountType,
  Transaction,
  Investment,
  DashboardStats,
  UserSettings,
  SystemAnnouncement,
  HoldingType,
  InvestmentCategory,
  CategoryBudget,
  BudgetProgress,
  NotificationPopupItem,
  CustomTransactionCategory,
} from '../types';
import { api } from '../lib/api';
import { localDb, DEFAULT_HOLDING_TYPES } from '../lib/localDb';
import { useAuth } from './AuthContext';
import { isFirebaseActive, syncFirestoreOnline } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';
import { computeStats } from '../lib/statsHelper';
import { exchangeRateService } from '../lib/exchangeRateService';
import { offlineSyncManager } from '../lib/offlineSync';
import { isTransactionLocked, EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS } from '../lib/formatters';
import {
  googleSheetsService,
  SHEET_TAB_NAMES,
  extractSpreadsheetId,
} from '../lib/googleSheetsService';
import { sheetsSyncQueue } from '../lib/sheetsSyncQueue';
import {
  getStoredSpreadsheetId,
  saveSpreadsheetId,
  removeSpreadsheetId,
  getCachedAccessToken,
  requestGoogleSheetsAccess,
} from '../lib/googleAuthHelper';

import {
  appsScriptService,
  getStoredAppsScriptUrl,
  saveAppsScriptUrl,
  removeAppsScriptUrl,
  saveServerAppsScriptUrl,
  fetchServerAppsScriptUrl,
  isEmailExplicitlyDisconnected,
} from '../lib/appsScriptService';

interface FinanceContextType {
  // Offline & Synchronization Status
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  triggerManualSync: () => Promise<void>;

  // Google Apps Script Storage & Sync
  appsScriptUrl: string;
  setAppsScriptUrl: (url: string) => Promise<void>;
  disconnectAppsScript: () => Promise<void>;
  isAppsScriptConnected: boolean;
  isAppsScriptSyncing: boolean;
  syncAppsScriptNow: () => Promise<void>;
  pushAllDataToGoogleSheet: () => Promise<{ success: boolean; pushedCount: { expenses: number; accounts: number; investments: number; budgets: number } }>;

  // Legacy Google Sheets OAuth Props
  spreadsheetId: string;
  setSpreadsheetId: (idOrUrl: string) => Promise<void>;
  isSheetsConnected: boolean;
  pendingSheetsQueueCount: number;
  isSheetsSyncing: boolean;
  connectGoogleSheets: () => Promise<void>;
  disconnectGoogleSheets: () => void;
  syncGoogleSheetsNow: () => Promise<void>;
  isGoogleSheetSetupOpen: boolean;
  setIsGoogleSheetSetupOpen: (v: boolean) => void;

  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  stats: DashboardStats | null;
  settings: UserSettings | null;
  usdIdrRate: number;
  rateSource: string;
  rateLastUpdated: string | null;
  isRateAutoUpdate: boolean;
  setIsRateAutoUpdate: (enabled: boolean) => Promise<void>;
  isRateFetching: boolean;
  fetchLatestRate: (options?: { silent?: boolean }) => Promise<{ success: boolean; rate?: number }>;
  isLoading: boolean;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  activeTab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin') => void;
  tabHistory: Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>;
  goBack: () => boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  isMobileQuickMenuOpen: boolean;
  setIsMobileQuickMenuOpen: (v: boolean) => void;
  announcement: SystemAnnouncement | null;
  refreshAnnouncement: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Account Operations
  addAccount: (data: {
    name: string;
    type: AccountType;
    balance: number;
    accountNumber?: string;
    color?: string;
    creditLimit?: number;
    billingDate?: number;
    dueDate?: number;
    cardNetwork?: string;
    last4Digits?: string;
  }) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  payCreditCardBill: (data: {
    creditCardAccountId: string;
    sourceAccountId: string;
    amountIdr: number;
    adminFee?: number;
    date?: string;
    notes?: string;
  }) => Promise<void>;

  // Transaction Operations
  addTransaction: (data: {
    type: 'expense' | 'income';
    amount: number;
    accountId: string;
    category: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Transfer Operations
  transferFunds: (data: {
    type: 'account_to_account' | 'bank_to_investment';
    fromAccountId: string;
    toAccountId?: string;
    toInvestmentId?: string;
    newInvestment?: {
      name: string;
      category: InvestmentCategory;
      currency?: 'IDR' | 'USD';
      platform?: string;
      units?: number;
      notes?: string;
    };
    amountIdr: number;
    amountUsd?: number;
    exchangeRate?: number;
    date?: string;
    notes?: string;
  }) => Promise<void>;

  // Investment Operations
  addInvestment: (data: {
    name: string;
    category: InvestmentCategory;
    currency?: 'IDR' | 'USD';
    amountInvested: number;
    currentValue?: number;
    customExchangeRate?: number;
    units?: number;
    platform?: string;
    notes?: string;
  }) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  // Holding Types (Master Data)
  holdingTypes: HoldingType[];
  addHoldingType: (data: {
    id?: string;
    label: string;
    defaultCurrency: 'IDR' | 'USD';
    example?: string;
    badgeColor?: string;
  }) => Promise<void>;
  updateHoldingType: (id: string, data: Partial<HoldingType>) => Promise<void>;
  deleteHoldingType: (id: string) => Promise<void>;

  // Transaction Categories (Default + Custom)
  customCategories: CustomTransactionCategory[];
  expenseCategories: string[];
  incomeCategories: string[];
  addCustomCategory: (name: string, type: 'expense' | 'income', color?: string) => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<void>;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (v: boolean) => void;

  // Settings
  updateRate: (newRate: number, source?: string) => Promise<void>;

  // Modal states
  isHoldingTypesModalOpen: boolean;
  setIsHoldingTypesModalOpen: (v: boolean) => void;
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (v: boolean) => void;
  transactionInitialType: 'expense' | 'income';
  setTransactionInitialType: (type: 'expense' | 'income') => void;
  isTransferOpen: boolean;
  setIsTransferOpen: (v: boolean) => void;
  transferInitialMode: 'account_to_account' | 'bank_to_investment';
  setTransferInitialMode: (mode: 'account_to_account' | 'bank_to_investment') => void;
  isAddAccountOpen: boolean;
  setIsAddAccountOpen: (v: boolean) => void;
  isAddInvestmentOpen: boolean;
  setIsAddInvestmentOpen: (v: boolean) => void;
  editingAccount: Account | null;
  setEditingAccount: (a: Account | null) => void;
  editingInvestment: Investment | null;
  setEditingInvestment: (i: Investment | null) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  isFirebaseSetupOpen: boolean;
  setIsFirebaseSetupOpen: (v: boolean) => void;
  isMobileAppModalOpen: boolean;
  setIsMobileAppModalOpen: (v: boolean) => void;
  isPayBillOpen: boolean;
  setIsPayBillOpen: (v: boolean) => void;
  payBillCard: Account | null;
  setPayBillCard: (a: Account | null) => void;

  // Budgeting Operations
  budgets: CategoryBudget[];
  saveBudget: (category: string, monthlyLimit: number, month?: string, id?: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  applySmartBudgetsFromLastMonth: (
    targetMonthStr: string,
    multiplier?: number
  ) => Promise<{ updatedCount: number; totalNewLimit: number }>;
  isBudgetModalOpen: boolean;
  setIsBudgetModalOpen: (v: boolean) => void;
  editingBudget: CategoryBudget | null;
  setEditingBudget: (b: CategoryBudget | null) => void;
  getBudgetProgressForMonth: (targetMonthStr?: string) => {
    items: BudgetProgress[];
    unbudgetedItems: Array<{
      category: string;
      actualSpent: number;
      transactionCount: number;
      prevMonthSpent: number;
      suggestedSmartLimit: number;
    }>;
    prevMonthCategories: Array<{
      category: string;
      prevMonthSpent: number;
      prevMonthCount: number;
      currentSpent: number;
      currentLimit: number;
      budgetId?: string;
      suggestedSmartLimit: number;
    }>;
    prevMonthStr: string;
    totalBudgeted: number;
    totalSpent: number;
    totalPrevMonthSpent: number;
    totalMomDeltaAmount: number;
    totalMomDeltaPercent: number | null;
    totalRemaining: number;
    overallPercent: number;
    isOverBudget: boolean;
    overBudgetCount: number;
  };

  // Popup Notification
  notification: NotificationPopupItem | null;
  showNotification: (item: Omit<NotificationPopupItem, 'id'>) => void;
  closeNotification: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading, isFirebase } = useAuth();

  // Load cached snapshot for immediate 0ms offline dashboard availability
  const cachedSnapshot = offlineSyncManager.getSnapshot();

  const [accounts, setAccounts] = useState<Account[]>(() => cachedSnapshot?.accounts || []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => cachedSnapshot?.transactions || []);
  const [investments, setInvestments] = useState<Investment[]>(() => cachedSnapshot?.investments || []);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => cachedSnapshot?.budgets || []);
  const [stats, setStats] = useState<DashboardStats | null>(() => {
    if (cachedSnapshot?.stats) return cachedSnapshot.stats;
    const initAccs = cachedSnapshot?.accounts || [];
    const initTxs = cachedSnapshot?.transactions || [];
    const initInvs = cachedSnapshot?.investments || [];
    const initRate = cachedSnapshot?.usdIdrRate || 15850;
    if (initAccs.length > 0 || initTxs.length > 0 || initInvs.length > 0) {
      return computeStats(initAccs, initTxs, initInvs, initRate);
    }
    return null;
  });
  const [settings, setSettings] = useState<UserSettings | null>(() => cachedSnapshot?.settings || null);
  const [usdIdrRate, setUsdIdrRate] = useState<number>(() => cachedSnapshot?.usdIdrRate || 15850);
  const usdIdrRateRef = useRef<number>(usdIdrRate);
  useEffect(() => {
    usdIdrRateRef.current = usdIdrRate;
  }, [usdIdrRate]);

  const [rateSource, setRateSource] = useState<string>(() => {
    return cachedSnapshot?.rateSource || exchangeRateService.getLastRateInfo().source;
  });
  const [rateLastUpdated, setRateLastUpdated] = useState<string | null>(() => {
    return cachedSnapshot?.rateLastUpdated || exchangeRateService.getLastRateInfo().timestamp;
  });
  const [isRateAutoUpdate, setIsRateAutoUpdateState] = useState<boolean>(() => {
    return exchangeRateService.getAutoUpdateEnabled();
  });
  const [isRateFetching, setIsRateFetching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  // Connectivity & Background Sync Status
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineSyncManager.getPendingQueue().length);

  // Google Sheets Storage & Synchronization State
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(() => getStoredSpreadsheetId());
  const [isSheetsSyncing, setIsSheetsSyncing] = useState<boolean>(false);
  const [pendingSheetsQueueCount, setPendingSheetsQueueCount] = useState<number>(() => sheetsSyncQueue.getPendingCount());
  const [isGoogleSheetSetupOpen, setIsGoogleSheetSetupOpen] = useState<boolean>(false);

  const isSheetsConnected = Boolean(spreadsheetId && spreadsheetId.length > 5);

  const connectGoogleSheets = useCallback(async () => {
    const { accessToken } = await requestGoogleSheetsAccess();
    if (spreadsheetId) {
      await googleSheetsService.ensureSpreadsheetStructure(spreadsheetId, accessToken);
    }
  }, [spreadsheetId]);

  const disconnectGoogleSheets = useCallback(() => {
    removeSpreadsheetId();
    setSpreadsheetIdState('');
  }, []);

  const setSpreadsheetId = useCallback(async (inputUrlOrId: string) => {
    const cleanId = saveSpreadsheetId(inputUrlOrId);
    setSpreadsheetIdState(cleanId);
    if (!cleanId) return;

    let token = getCachedAccessToken();
    if (!token) {
      const res = await requestGoogleSheetsAccess();
      token = res.accessToken;
    }
    if (token) {
      await googleSheetsService.ensureSpreadsheetStructure(cleanId, token);
      const sheetData = await googleSheetsService.readAllSheetData(cleanId, token);
      if (sheetData.accounts.length > 0 || sheetData.transactions.length > 0 || sheetData.investments.length > 0) {
        setAccounts(sheetData.accounts);
        setTransactions(sheetData.transactions);
        setInvestments(sheetData.investments);
        if (sheetData.budgets.length > 0) setBudgets(sheetData.budgets);
        const nextStats = computeStats(sheetData.accounts, sheetData.transactions, sheetData.investments, usdIdrRate);
        setStats(nextStats);
      }
    }
  }, [usdIdrRate]);

  const syncGoogleSheetsNow = useCallback(async () => {
    if (!spreadsheetId || isSheetsSyncing) return;
    let token = getCachedAccessToken();
    if (!token) {
      const res = await requestGoogleSheetsAccess();
      token = res.accessToken;
    }
    if (!token) throw new Error('Otorisasi Google Sheets belum diberikan.');

    setIsSheetsSyncing(true);
    try {
      await sheetsSyncQueue.processQueue(spreadsheetId, token);
      setPendingSheetsQueueCount(sheetsSyncQueue.getPendingCount());

      const freshData = await googleSheetsService.readAllSheetData(spreadsheetId, token);
      setAccounts(freshData.accounts);
      setTransactions(freshData.transactions);
      setInvestments(freshData.investments);
      if (freshData.budgets.length > 0) setBudgets(freshData.budgets);
      const nextStats = computeStats(freshData.accounts, freshData.transactions, freshData.investments, usdIdrRate);
      setStats(nextStats);
    } catch (err: any) {
      console.warn('Sync Google Sheets error:', err);
      throw err;
    } finally {
      setIsSheetsSyncing(false);
    }
  }, [spreadsheetId, isSheetsSyncing, usdIdrRate]);

  // Google Apps Script Storage State & Methods
  const [appsScriptUrl, setAppsScriptUrlState] = useState<string>(() => getStoredAppsScriptUrl(user?.email));
  const [isAppsScriptSyncing, setIsAppsScriptSyncing] = useState<boolean>(false);

  const isAppsScriptConnected = Boolean(
    appsScriptUrl &&
    appsScriptUrl.startsWith('https://script.google.com') &&
    !isEmailExplicitlyDisconnected(user?.email)
  );

  // Strict Account Isolation + Per-Account URL Restoration
  const activeUserIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => {
    if (activeUserIdRef.current !== user?.id) {
      activeUserIdRef.current = user?.id;
      if (!user || user.email === 'demo@wealthtrack.pro') {
        removeAppsScriptUrl();
        setAppsScriptUrlState('');
      } else {
        const storedForEmail = getStoredAppsScriptUrl(user.email);
        setAppsScriptUrlState(storedForEmail || '');
      }
    }
  }, [user]);

  const setAppsScriptUrl = useCallback(async (url: string) => {
    const saved = saveAppsScriptUrl(url, user?.email);
    setAppsScriptUrlState(saved);

    // Bind URL directly to user's Firebase account in Firestore + server DB
    if (user?.email && user.email !== 'demo@wealthtrack.pro') {
      saveServerAppsScriptUrl(user.email, saved).catch(() => {});
    }
    if (user?.id && user?.email !== 'demo@wealthtrack.pro') {
      firestoreService.saveUserAppsScriptUrl(user.id, saved, user.email).catch((err) => {
        console.warn('Failed to bind Apps Script URL to Firestore:', err);
      });
      if (settings) {
        const nextSettings: UserSettings = { ...settings, appsScriptUrl: saved };
        setSettings(nextSettings);
        firestoreService.saveSettings(nextSettings).catch(() => {});
      }
    }

    if (!saved) return;

    await appsScriptService.initStructure(saved);
    const fresh = await appsScriptService.readAllData(saved);
    if (fresh.accounts.length > 0 || fresh.transactions.length > 0 || fresh.investments.length > 0) {
      setAccounts(fresh.accounts);
      setTransactions(fresh.transactions);
      setInvestments(fresh.investments);
      if (fresh.budgets.length > 0) setBudgets(fresh.budgets);
      const nextStats = computeStats(fresh.accounts, fresh.transactions, fresh.investments, usdIdrRate);
      setStats(nextStats);
    }
  }, [user?.id, user?.email, settings, usdIdrRate]);

  // Automatically restore or backfill Apps Script URL when user logs in
  useEffect(() => {
    if (!user?.id || !user?.email || user.email === 'demo@wealthtrack.pro') return;

    if (isEmailExplicitlyDisconnected(user.email)) {
      return;
    }

    const localForUser = getStoredAppsScriptUrl(user.email);
    if (localForUser && localForUser.startsWith('https://script.google.com')) {
      if (appsScriptUrl !== localForUser) {
        setAppsScriptUrlState(localForUser);
      }
      // Ensure both Server DB and Firestore always have a backup copy bound to this user
      saveServerAppsScriptUrl(user.email, localForUser).catch(() => {});
      if (isFirebase) {
        firestoreService.saveUserAppsScriptUrl(user.id, localForUser, user.email).catch(() => {});
      }
      return;
    }

    // If not in localStorage, check Firestore (users/{uid}, settings/{uid}, or users by email) and Server DB
    if (!appsScriptUrl) {
      let cancelled = false;
      (async () => {
        let recoveredUrl = '';
        if (isFirebase) {
          recoveredUrl = await firestoreService.getUserAppsScriptUrl(user.id, user.email);
        }
        if (!recoveredUrl) {
          recoveredUrl = await fetchServerAppsScriptUrl(user.email);
        }
        if (cancelled || !recoveredUrl) return;
        const saved = saveAppsScriptUrl(recoveredUrl, user.email);
        setAppsScriptUrlState(saved);
        saveServerAppsScriptUrl(user.email, saved).catch(() => {});
        if (isFirebase) {
          firestoreService.saveUserAppsScriptUrl(user.id, saved, user.email).catch(() => {});
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [user?.id, user?.email, isFirebase, appsScriptUrl]);

  const syncAppsScriptNow = useCallback(async () => {
    if (!appsScriptUrl || isAppsScriptSyncing) return;
    setIsAppsScriptSyncing(true);
    try {
      await appsScriptService.flushQueue();
      const fresh = await appsScriptService.readAllData(appsScriptUrl);
      setAccounts(fresh.accounts);
      setTransactions(fresh.transactions);
      setInvestments(fresh.investments);
      if (fresh.budgets.length > 0) setBudgets(fresh.budgets);
      const nextStats = computeStats(fresh.accounts, fresh.transactions, fresh.investments, usdIdrRate);
      setStats(nextStats);
    } catch (err) {
      console.warn('Sync Apps Script error:', err);
      throw err;
    } finally {
      setIsAppsScriptSyncing(false);
    }
  }, [appsScriptUrl, isAppsScriptSyncing, usdIdrRate]);

  // Helper to sync record operations via 0ms background queue to Google Apps Script / Sheets
  const syncToSheets = useCallback(
    async (
      tabName: string,
      action: 'CREATE' | 'UPDATE' | 'DELETE',
      recordId: string,
      rowValues?: any[]
    ) => {
      // 1. Zero-latency persistent background queue for Google Apps Script
      if (appsScriptUrl) {
        appsScriptService.enqueueSync(appsScriptUrl, tabName, action, recordId, rowValues);
        return;
      }

      // 2. Fallback to Google Sheets REST API
      if (!spreadsheetId) return;

      const token = getCachedAccessToken();
      if (isOnline && token) {
        try {
          if (action === 'CREATE' && rowValues) {
            await googleSheetsService.appendRow(spreadsheetId, token, tabName, rowValues);
          } else if (action === 'UPDATE' && rowValues) {
            await googleSheetsService.updateRowById(spreadsheetId, token, tabName, recordId, rowValues);
          } else if (action === 'DELETE') {
            await googleSheetsService.deleteRowById(spreadsheetId, token, tabName, recordId);
          }
          return;
        } catch (err) {
          console.warn(`Direct Sheets sync error for ${action} on ${tabName}:`, err);
        }
      }

      sheetsSyncQueue.enqueue({
        tabName,
        action,
        recordId,
        rowValues,
      });
      setPendingSheetsQueueCount(sheetsSyncQueue.getPendingCount());
    },
    [appsScriptUrl, spreadsheetId, isOnline]
  );

  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>('dashboard');
  const [tabHistory, setTabHistory] = useState<Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>>(['dashboard']);

  const setActiveTab = useCallback((tab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin') => {
    setActiveTabState((prevTab) => {
      if (prevTab === tab) return prevTab;
      setTabHistory((prevHist) => {
        if (prevHist[prevHist.length - 1] === tab) return prevHist;
        return [...prevHist, tab].slice(-30);
      });
      return tab;
    });

    try {
      window.history.pushState({ tab }, '', '#' + tab);
    } catch {}

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);

  const refreshAnnouncement = useCallback(async () => {
    try {
      const res = await api.getPublicAnnouncement();
      if (res.announcement && res.announcement.enabled && res.announcement.message) {
        setAnnouncement(res.announcement);
      } else {
        setAnnouncement(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshAnnouncement();
  }, [refreshAnnouncement]);

  // Theme mode: 'dark' | 'light'
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('wealthtrack_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const applyTheme = useCallback((targetTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('wealthtrack_theme', newTheme);
    } catch {}
    applyTheme(newTheme);
    if (user) {
      if (isFirebase && settings) {
        firestoreService.saveSettings({ ...settings, theme: newTheme });
      } else {
        api.updateSettings({ theme: newTheme }).catch(() => {});
      }
    }
  }, [applyTheme, user, isFirebase, settings]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Privacy mode persistent in localStorage
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('wealthtrack_privacy_mode') === 'true';
  });

  // Holding Types state
  const [holdingTypes, setHoldingTypes] = useState<HoldingType[]>(DEFAULT_HOLDING_TYPES);
  const [isHoldingTypesModalOpen, setIsHoldingTypesModalOpen] = useState(false);

  // Custom Transaction Categories state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomTransactionCategory[]>(() => {
    try {
      const saved = localStorage.getItem(`wealthtrack_custom_categories_${user?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((cat: CustomTransactionCategory) => {
            if (cat.name && cat.color) {
              CATEGORY_COLORS[cat.name] = cat.color;
            }
          });
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wealthtrack_custom_categories_${user?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((cat: CustomTransactionCategory) => {
            if (cat.name && cat.color) {
              CATEGORY_COLORS[cat.name] = cat.color;
            }
          });
          setCustomCategories(parsed);
          return;
        }
      }
    } catch {}
    if (settings?.customCategories && Array.isArray(settings.customCategories)) {
      settings.customCategories.forEach((cat) => {
        if (cat.name && cat.color) {
          CATEGORY_COLORS[cat.name] = cat.color;
        }
      });
      setCustomCategories(settings.customCategories);
    }
  }, [user?.id, settings?.customCategories]);

  const expenseCategories = React.useMemo(() => {
    const customExp = customCategories
      .filter((c) => c.type === 'expense')
      .map((c) => c.name);
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...customExp]));
  }, [customCategories]);

  const incomeCategories = React.useMemo(() => {
    const customInc = customCategories
      .filter((c) => c.type === 'income')
      .map((c) => c.name);
    return Array.from(new Set([...INCOME_CATEGORIES, ...customInc]));
  }, [customCategories]);

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [transactionInitialType, setTransactionInitialType] = useState<'expense' | 'income'>('expense');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferInitialMode, setTransferInitialMode] = useState<'account_to_account' | 'bank_to_investment'>('account_to_account');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFirebaseSetupOpen, setIsFirebaseSetupOpen] = useState(false);
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState(false);
  const [isPayBillOpen, setIsPayBillOpen] = useState(false);
  const [payBillCard, setPayBillCard] = useState<Account | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);

  // Popup Notification State
  const [notification, setNotification] = useState<NotificationPopupItem | null>(null);

  const showNotification = useCallback((item: Omit<NotificationPopupItem, 'id'>) => {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setNotification({ ...item, id });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const disconnectAppsScript = useCallback(async () => {
    removeAppsScriptUrl(user?.email, true);
    setAppsScriptUrlState('');
    if (user?.email && user.email !== 'demo@wealthtrack.pro') {
      saveServerAppsScriptUrl(user.email, '').catch(() => {});
    }
    if (settings) {
      const nextSettings: UserSettings = { ...settings, appsScriptUrl: '' };
      setSettings(nextSettings);
      if (isFirebase) {
        firestoreService.saveSettings(nextSettings).catch(() => {});
      }
    }
    if (user?.id && user?.email !== 'demo@wealthtrack.pro') {
      if (isFirebase) {
        try {
          await firestoreService.saveUserAppsScriptUrl(user.id, '', user.email);
        } catch (err) {
          console.warn('saveUserAppsScriptUrl disconnect error:', err);
        }
      }
    }
    showNotification({
      title: 'Google Sheet Terputus',
      message: 'Koneksi Apps Script telah diputus dari akun Anda.',
      type: 'info',
    });
  }, [user?.id, user?.email, settings, isFirebase, showNotification]);

  const pushAllDataToGoogleSheet = useCallback(async () => {
    if (!appsScriptUrl && !spreadsheetId) {
      throw new Error('Belum ada Google Sheet / Apps Script yang terhubung.');
    }

    let sourceAccounts = accounts;
    let sourceTransactions = transactions;
    let sourceInvestments = investments;
    let sourceBudgets = budgets;

    // Direct fetch from Firestore if Firebase is active to ensure 100% of documents are retrieved
    if (isFirebase && user) {
      const fbData = await firestoreService.fetchAllUserData(user.id);
      if (fbData.accounts.length > 0) sourceAccounts = fbData.accounts;
      if (fbData.transactions.length > 0) sourceTransactions = fbData.transactions;
      if (fbData.investments.length > 0) sourceInvestments = fbData.investments;
      if (fbData.budgets.length > 0) sourceBudgets = fbData.budgets;
    }

    const expensesRows = sourceTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.amount,
      tx.category,
      tx.notes || '',
      tx.accountId,
      tx.type,
      tx.toAccountId || '',
      tx.toInvestmentId || '',
      tx.createdAt || new Date().toISOString(),
      new Date().toISOString(),
    ]);

    const accountsRows = sourceAccounts.map((acc) => [
      acc.id,
      acc.name,
      acc.type,
      acc.balance,
      'IDR',
      acc.accountNumber || '',
      acc.creditLimit || 0,
      acc.billingDate || '',
      acc.dueDate || '',
      acc.cardNetwork || '',
      acc.last4Digits || '',
      acc.createdAt || new Date().toISOString(),
      acc.updatedAt || new Date().toISOString(),
    ]);

    const investmentsRows = sourceInvestments.map((inv) => [
      inv.id,
      inv.name,
      inv.category,
      inv.units || 1,
      inv.amountInvested,
      inv.currentValue || inv.amountInvested,
      inv.currency || 'IDR',
      inv.customExchangeRate || '',
      inv.platform || '',
      inv.notes || '',
      inv.createdAt || new Date().toISOString(),
      inv.updatedAt || new Date().toISOString(),
    ]);

    const budgetsRows = sourceBudgets.map((b) => [
      b.id,
      b.category,
      b.monthlyLimit,
      b.month || '',
      b.createdAt || new Date().toISOString(),
      b.updatedAt || new Date().toISOString(),
    ]);

    if (appsScriptUrl) {
      await appsScriptService.bulkUploadData(appsScriptUrl, {
        expenses: expensesRows,
        accounts: accountsRows,
        investments: investmentsRows,
        budgets: budgetsRows,
      });
    } else if (spreadsheetId) {
      const token = getCachedAccessToken();
      if (!token) throw new Error('Otorisasi Google Sheets belum diberikan.');
      await googleSheetsService.ensureSpreadsheetStructure(spreadsheetId, token);
      for (const row of expensesRows) {
        await googleSheetsService.appendRow(spreadsheetId, token, SHEET_TAB_NAMES.EXPENSES, row);
      }
      for (const row of accountsRows) {
        await googleSheetsService.appendRow(spreadsheetId, token, SHEET_TAB_NAMES.ACCOUNTS, row);
      }
      for (const row of investmentsRows) {
        await googleSheetsService.appendRow(spreadsheetId, token, SHEET_TAB_NAMES.INVESTMENTS, row);
      }
      for (const row of budgetsRows) {
        await googleSheetsService.appendRow(spreadsheetId, token, SHEET_TAB_NAMES.BUDGETS, row);
      }
    }

    const counts = {
      expenses: expensesRows.length,
      accounts: accountsRows.length,
      investments: investmentsRows.length,
      budgets: budgetsRows.length,
    };

    showNotification({
      title: 'Migrasi ke Google Sheet Berhasil',
      message: `${counts.expenses} Transaksi, ${counts.accounts} Akun, ${counts.investments} Investasi, ${counts.budgets} Budget berhasil di-push ke Google Sheet!`,
      type: 'success',
      durationMs: 5000,
    });

    return { success: true, pushedCount: counts };
  }, [appsScriptUrl, spreadsheetId, transactions, accounts, investments, budgets, isFirebase, user, showNotification]);

  useEffect(() => {
    if (!notification) return;
    const duration = notification.durationMs || 4500;
    const timer = setTimeout(() => {
      setNotification(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification]);

  // Ref trackers to guarantee zero stale closure issues in hardware/gesture back handlers
  const isMobileQuickMenuOpenRef = useRef(false);
  const isMobileMenuOpenRef = useRef(false);
  const isAddExpenseOpenRef = useRef(false);
  const isTransferOpenRef = useRef(false);
  const isAddAccountOpenRef = useRef(false);
  const isAddInvestmentOpenRef = useRef(false);
  const isBudgetModalOpenRef = useRef(false);
  const isPayBillOpenRef = useRef(false);
  const isHoldingTypesModalOpenRef = useRef(false);
  const isCategoryModalOpenRef = useRef(false);
  const isFirebaseSetupOpenRef = useRef(false);
  const isGoogleSheetSetupOpenRef = useRef(false);
  const isMobileAppModalOpenRef = useRef(false);
  const activeTabRef = useRef<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>('dashboard');
  const tabHistoryRef = useRef<Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>>(['dashboard']);
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => { isMobileQuickMenuOpenRef.current = isMobileQuickMenuOpen; }, [isMobileQuickMenuOpen]);
  useEffect(() => { isMobileMenuOpenRef.current = isMobileMenuOpen; }, [isMobileMenuOpen]);
  useEffect(() => { isAddExpenseOpenRef.current = isAddExpenseOpen; }, [isAddExpenseOpen]);
  useEffect(() => { isTransferOpenRef.current = isTransferOpen; }, [isTransferOpen]);
  useEffect(() => { isAddAccountOpenRef.current = isAddAccountOpen; }, [isAddAccountOpen]);
  useEffect(() => { isAddInvestmentOpenRef.current = isAddInvestmentOpen; }, [isAddInvestmentOpen]);
  useEffect(() => { isBudgetModalOpenRef.current = isBudgetModalOpen; }, [isBudgetModalOpen]);
  useEffect(() => { isPayBillOpenRef.current = isPayBillOpen; }, [isPayBillOpen]);
  useEffect(() => { isHoldingTypesModalOpenRef.current = isHoldingTypesModalOpen; }, [isHoldingTypesModalOpen]);
  useEffect(() => { isCategoryModalOpenRef.current = isCategoryModalOpen; }, [isCategoryModalOpen]);
  useEffect(() => { isFirebaseSetupOpenRef.current = isFirebaseSetupOpen; }, [isFirebaseSetupOpen]);
  useEffect(() => { isGoogleSheetSetupOpenRef.current = isGoogleSheetSetupOpen; }, [isGoogleSheetSetupOpen]);
  useEffect(() => { isMobileAppModalOpenRef.current = isMobileAppModalOpen; }, [isMobileAppModalOpen]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { tabHistoryRef.current = tabHistory; }, [tabHistory]);

  const isAnyModalOpen =
    isMobileQuickMenuOpen ||
    isMobileMenuOpen ||
    isAddExpenseOpen ||
    isTransferOpen ||
    isAddAccountOpen ||
    isAddInvestmentOpen ||
    isBudgetModalOpen ||
    isPayBillOpen ||
    isHoldingTypesModalOpen ||
    isCategoryModalOpen ||
    isFirebaseSetupOpen ||
    isGoogleSheetSetupOpen ||
    isMobileAppModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      try {
        window.history.pushState({ modal: true }, '');
      } catch {}
    }
  }, [isAnyModalOpen]);

  const goBack = useCallback((): boolean => {
    // 1. If any modal / quick action / drawer is open, close it first
    if (isMobileQuickMenuOpenRef.current) {
      setIsMobileQuickMenuOpen(false);
      return true;
    }
    if (isMobileMenuOpenRef.current) {
      setIsMobileMenuOpen(false);
      return true;
    }
    if (isGoogleSheetSetupOpenRef.current) {
      setIsGoogleSheetSetupOpen(false);
      return true;
    }
    if (isCategoryModalOpenRef.current) {
      setIsCategoryModalOpen(false);
      return true;
    }
    if (isAddExpenseOpenRef.current) {
      setIsAddExpenseOpen(false);
      setEditingTransaction(null);
      return true;
    }
    if (isTransferOpenRef.current) {
      setIsTransferOpen(false);
      return true;
    }
    if (isAddAccountOpenRef.current) {
      setIsAddAccountOpen(false);
      setEditingAccount(null);
      return true;
    }
    if (isAddInvestmentOpenRef.current) {
      setIsAddInvestmentOpen(false);
      setEditingInvestment(null);
      return true;
    }
    if (isBudgetModalOpenRef.current) {
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
      return true;
    }
    if (isPayBillOpenRef.current) {
      setIsPayBillOpen(false);
      setPayBillCard(null);
      return true;
    }
    if (isHoldingTypesModalOpenRef.current) {
      setIsHoldingTypesModalOpen(false);
      return true;
    }
    if (isFirebaseSetupOpenRef.current) {
      setIsFirebaseSetupOpen(false);
      return true;
    }
    if (isMobileAppModalOpenRef.current) {
      setIsMobileAppModalOpen(false);
      return true;
    }

    // 2. Check tab history stack: navigate to previous menu/page
    const history = tabHistoryRef.current;
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // remove current active tab
      const previousTab = nextHistory[nextHistory.length - 1];
      tabHistoryRef.current = nextHistory;
      setTabHistory(nextHistory);
      activeTabRef.current = previousTab;
      setActiveTabState(previousTab);
      try {
        window.history.replaceState({ tab: previousTab }, '', '#' + previousTab);
      } catch {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      return true;
    }

    // 3. If currently not on root dashboard, return to dashboard
    if (activeTabRef.current !== 'dashboard') {
      tabHistoryRef.current = ['dashboard'];
      setTabHistory(['dashboard']);
      activeTabRef.current = 'dashboard';
      setActiveTabState('dashboard');
      try {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } catch {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      return true;
    }

    // 4. At root dashboard with nothing open to dismiss
    return false;
  }, []);

  // Hardware Back Button and Browser Popstate Handler
  useEffect(() => {
    let removeCapacitorListener: (() => void) | null = null;

    const handleBackEvent = async () => {
      const handled = goBack();
      if (handled) {
        return;
      }

      // Root level with no open modals: Exit app directly
      try {
        await CapApp.exitApp();
      } catch (err) {
        console.warn('exitApp error', err);
      }
    };

    // 1. Capacitor Native Android Back Button Listener (Android APK)
    try {
      CapApp.addListener('backButton', () => {
        handleBackEvent();
      }).then((handle) => {
        removeCapacitorListener = () => {
          handle.remove();
        };
      }).catch(() => {});
    } catch {}

    // 2. Browser / PWA popstate listener
    const onPopState = () => {
      handleBackEvent();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
      window.removeEventListener('popstate', onPopState);
    };
  }, [goBack, showNotification]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('wealthtrack_privacy_mode', String(next));
      return next;
    });
  };

  // 1. FIREBASE REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!isFirebase || !user) return;

    // If Apps Script or Google Sheets is connected, use Google Sheets as the primary storage
    if (appsScriptUrl || spreadsheetId) {
      if (appsScriptUrl) {
        setIsLoading(true);
        appsScriptService
          .readAllData(appsScriptUrl)
          .then((fresh) => {
            setAccounts(fresh.accounts);
            setTransactions(fresh.transactions);
            setInvestments(fresh.investments);
            if (fresh.budgets.length > 0) setBudgets(fresh.budgets);
            setStats(computeStats(fresh.accounts, fresh.transactions, fresh.investments, usdIdrRateRef.current || 15850));
          })
          .catch((err) => console.warn('Apps Script initial load error:', err))
          .finally(() => setIsLoading(false));
      }
      return;
    }

    setIsLoading(true);

    const unsubscribe = firestoreService.subscribeToUserData(user.id, (data) => {
      // Normalize Bitcoin currency to IDR
      const normalizedInvestments = data.investments.map((inv) =>
        inv.category === 'Bitcoin' && inv.currency !== 'IDR'
          ? { ...inv, currency: 'IDR' as const }
          : inv
      );

      setAccounts(data.accounts);
      setTransactions(data.transactions);
      setSettings(data.settings);

      // Account-bound Apps Script URL restoration and auto-sync
      const boundUrl = data.settings?.appsScriptUrl?.trim() || '';
      if (
        boundUrl &&
        boundUrl.startsWith('https://script.google.com') &&
        !isEmailExplicitlyDisconnected(user?.email)
      ) {
        if (boundUrl !== appsScriptUrl) {
          saveAppsScriptUrl(boundUrl, user?.email);
          setAppsScriptUrlState(boundUrl);
          // Auto-connect and sync data immediately on login
          appsScriptService
            .readAllData(boundUrl)
            .then((fresh) => {
              if (fresh.accounts.length > 0 || fresh.transactions.length > 0 || fresh.investments.length > 0) {
                setAccounts(fresh.accounts);
                setTransactions(fresh.transactions);
                setInvestments(fresh.investments);
                if (fresh.budgets.length > 0) setBudgets(fresh.budgets);
                const nextStats = computeStats(fresh.accounts, fresh.transactions, fresh.investments, usdIdrRateRef.current || 15850);
                setStats(nextStats);
              }
            })
            .catch((err) => {
              console.warn('Initial auto-sync with bound Apps Script URL error:', err);
            });
        }
      }

      const rate = data.settings?.usdIdrRate || usdIdrRateRef.current || 15850;
      setUsdIdrRate(rate);
      if (data.settings?.rateSource) setRateSource(data.settings.rateSource);
      if (data.settings?.rateLastUpdated) setRateLastUpdated(data.settings.rateLastUpdated);
      if (data.settings?.autoUpdateRate !== undefined) {
        setIsRateAutoUpdateState(data.settings.autoUpdateRate);
        exchangeRateService.setAutoUpdateEnabled(data.settings.autoUpdateRate);
      }

      const computed = computeStats(data.accounts, data.transactions, normalizedInvestments, rate);
      setStats(computed);
      setIsLoading(false);

      // Persist snapshot to local cache for instant offline dashboard access
      offlineSyncManager.saveSnapshot({
        accounts: data.accounts,
        transactions: data.transactions,
        investments: normalizedInvestments,
        settings: data.settings,
        usdIdrRate: rate,
        rateSource: data.settings?.rateSource,
        rateLastUpdated: data.settings?.rateLastUpdated,
        stats: computed,
      });
    });

    return () => unsubscribe();
  }, [isFirebase, user, appsScriptUrl, spreadsheetId]);

  // 2. STANDARD SERVER / LOCAL REFRESH (when not Firebase)
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    if (isFirebase) return; // Handled by realtime onSnapshot or Apps Script load

    setIsLoading(true);
    try {
      const [accRes, txRes, invRes, statsRes, setRes, htRes, bgtRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getInvestments(),
        api.getDashboardStats(),
        api.getSettings(),
        api.getHoldingTypes(),
        api.getBudgets(),
      ]);

      const normalizedInvestments = invRes.investments.map((inv) =>
        inv.category === 'Bitcoin' && inv.currency !== 'IDR'
          ? { ...inv, currency: 'IDR' as const }
          : inv
      );

      setAccounts(accRes.accounts);
      setTransactions(txRes.transactions);
      setInvestments(normalizedInvestments);
      if (htRes?.holdingTypes && htRes.holdingTypes.length > 0) {
        setHoldingTypes(htRes.holdingTypes);
      }
      if (bgtRes?.budgets) {
        setBudgets(bgtRes.budgets);
      }
      setStats(statsRes);
      setSettings(setRes.settings);
      if (setRes.settings?.usdIdrRate) {
        setUsdIdrRate(setRes.settings.usdIdrRate);
      }
      if (setRes.settings?.rateSource) setRateSource(setRes.settings.rateSource);
      if (setRes.settings?.rateLastUpdated) setRateLastUpdated(setRes.settings.rateLastUpdated);
      if (setRes.settings?.autoUpdateRate !== undefined) {
        setIsRateAutoUpdateState(setRes.settings.autoUpdateRate);
        exchangeRateService.setAutoUpdateEnabled(setRes.settings.autoUpdateRate);
      }

      // Persist snapshot to local cache
      offlineSyncManager.saveSnapshot({
        accounts: accRes.accounts,
        transactions: txRes.transactions,
        investments: normalizedInvestments,
        budgets: bgtRes?.budgets,
        holdingTypes: htRes?.holdingTypes,
        stats: statsRes,
        settings: setRes.settings,
        usdIdrRate: setRes.settings?.usdIdrRate,
      });
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isFirebase]);

  useEffect(() => {
    // Preserve cached snapshot while authentication session is resolving
    if (isAuthLoading) return;

    if (isAuthenticated && !isFirebase) {
      refreshData();
    } else if (!isAuthenticated) {
      setAccounts([]);
      setTransactions([]);
      setInvestments([]);
      setStats(null);
    }
  }, [isAuthenticated, isFirebase, isAuthLoading, refreshData]);

  // ---------------- OPERATIONS ----------------

  // Accounts
  const addAccount = async (data: {
    name: string;
    type: AccountType;
    balance: number;
    accountNumber?: string;
    color?: string;
    creditLimit?: number;
    billingDate?: number;
    dueDate?: number;
    cardNetwork?: string;
    last4Digits?: string;
  }) => {
    const now = new Date().toISOString();
    const newAccount: Account = {
      id: 'acc_' + Date.now(),
      userId: user?.id || 'usr_local',
      name: data.name.trim(),
      type: data.type,
      balance: Number(data.balance) || 0,
      color: data.color || '#3b82f6',
      createdAt: now,
      updatedAt: now,
      ...(data.accountNumber?.trim() ? { accountNumber: data.accountNumber.trim() } : {}),
      ...(data.creditLimit !== undefined ? { creditLimit: Number(data.creditLimit) } : {}),
      ...(data.billingDate !== undefined ? { billingDate: Number(data.billingDate) } : {}),
      ...(data.dueDate !== undefined ? { dueDate: Number(data.dueDate) } : {}),
      ...(data.cardNetwork?.trim() ? { cardNetwork: data.cardNetwork.trim() } : {}),
      ...(data.last4Digits?.trim() ? { last4Digits: data.last4Digits.trim() } : {}),
    };

    setAccounts((prev) => {
      const next = [...prev, newAccount];
      offlineSyncManager.saveSnapshot({ accounts: next });
      return next;
    });

    syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'CREATE', newAccount.id, [
      newAccount.id,
      newAccount.name,
      newAccount.type,
      newAccount.balance,
      'IDR',
      newAccount.accountNumber || '',
      newAccount.creditLimit || 0,
      newAccount.billingDate || '',
      newAccount.dueDate || '',
      newAccount.cardNetwork || '',
      newAccount.last4Digits || '',
      newAccount.createdAt,
      newAccount.updatedAt || new Date().toISOString(),
    ]);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id: newAccount.id,
        type: 'account',
        action: 'create',
        data: newAccount,
      });
      return;
    }

    if (isFirebase && user) {
      await firestoreService.saveAccount(newAccount);
      return;
    }

    await api.createAccount(data);
    await refreshData();
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    const target = accounts.find((a) => a.id === id);
    if (target) {
      const updated: Account = {
        ...target,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      setAccounts((prev) => {
        const next = prev.map((a) => (a.id === id ? updated : a));
        offlineSyncManager.saveSnapshot({ accounts: next });
        return next;
      });

      syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updated.id, [
        updated.id,
        updated.name,
        updated.type,
        updated.balance,
        'IDR',
        updated.accountNumber || '',
        updated.creditLimit || 0,
        updated.billingDate || '',
        updated.dueDate || '',
        updated.cardNetwork || '',
        updated.last4Digits || '',
        updated.createdAt,
        updated.updatedAt || new Date().toISOString(),
      ]);

      if (appsScriptUrl || spreadsheetId) {
        return;
      }

      if (!isOnline) {
        offlineSyncManager.queueItem({
          id,
          type: 'account',
          action: 'update',
          data: updated,
        });
        return;
      }

      if (isFirebase && user) {
        await firestoreService.saveAccount(updated);
        return;
      }

      await api.updateAccount(id, data);
      await refreshData();
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      offlineSyncManager.saveSnapshot({ accounts: next });
      return next;
    });

    syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'DELETE', id);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id,
        type: 'account',
        action: 'delete',
        data: { id },
      });
      return;
    }

    if (isFirebase) {
      await firestoreService.deleteAccount(id);
      return;
    }

    await api.deleteAccount(id);
    await refreshData();
  };

  // Transactions
  const addTransaction = async (data: {
    type: 'expense' | 'income';
    amount: number;
    accountId: string;
    category: string;
    date: string;
    notes?: string;
  }) => {
    const parsedAmount = Math.abs(Number(data.amount));
    const now = new Date().toISOString();
    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const targetAcc = accounts.find((a) => a.id === data.accountId);
    if (!targetAcc) throw new Error('Funding account not found');

    const effectiveType: 'expense' | 'income' | 'cc_debt' =
      (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') && data.type === 'expense'
        ? 'cc_debt'
        : data.type;

    if (data.type === 'expense' || effectiveType === 'cc_debt') {
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        if (targetAcc.creditLimit !== undefined && targetAcc.balance + parsedAmount > targetAcc.creditLimit) {
          const avail = Math.max(0, targetAcc.creditLimit - targetAcc.balance);
          throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      } else {
        if (parsedAmount > targetAcc.balance) {
          throw new Error(`Insufficient balance (${targetAcc.balance.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    let updatedAccounts = [...accounts];
    let updatedAcc: Account | null = null;

    if (targetAcc) {
      let newBal = targetAcc.balance;
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        newBal = (data.type === 'expense' || effectiveType === 'cc_debt') ? targetAcc.balance + parsedAmount : targetAcc.balance - parsedAmount;
      } else {
        newBal = data.type === 'expense' ? targetAcc.balance - parsedAmount : targetAcc.balance + parsedAmount;
      }
      updatedAcc = {
        ...targetAcc,
        balance: newBal,
        updatedAt: now,
      };
      updatedAccounts = updatedAccounts.map((a) => (a.id === updatedAcc!.id ? updatedAcc! : a));
    }

    const newTx: Transaction = {
      id: txId,
      userId: user?.id || 'usr_local',
      type: effectiveType,
      amount: parsedAmount,
      accountId: data.accountId,
      category: data.category,
      date: data.date,
      createdAt: now,
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    };

    // Immediate optimistic state update
    const nextTxs = [newTx, ...transactions];
    setAccounts(updatedAccounts);
    setTransactions(nextTxs);
    const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
    setStats(nextStats);

    // Save to snapshot immediately for instant offline dashboard access
    offlineSyncManager.saveSnapshot({
      accounts: updatedAccounts,
      transactions: nextTxs,
      investments,
      stats: nextStats,
    });

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', newTx.id, [
      newTx.id,
      newTx.date,
      newTx.amount,
      newTx.category,
      newTx.notes || '',
      newTx.accountId,
      newTx.type,
      newTx.toAccountId || '',
      newTx.toInvestmentId || '',
      newTx.createdAt,
      new Date().toISOString(),
    ]);

    if (updatedAcc) {
      syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedAcc.id, [
        updatedAcc.id,
        updatedAcc.name,
        updatedAcc.type,
        updatedAcc.balance,
        'IDR',
        updatedAcc.accountNumber || '',
        updatedAcc.creditLimit || 0,
        updatedAcc.billingDate || '',
        updatedAcc.dueDate || '',
        updatedAcc.cardNetwork || '',
        updatedAcc.last4Digits || '',
        updatedAcc.createdAt,
        updatedAcc.updatedAt || new Date().toISOString(),
      ]);
    }

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id: newTx.id,
        type: 'transaction',
        action: 'create',
        data: newTx,
      });
      if (updatedAcc) {
        offlineSyncManager.queueItem({
          id: updatedAcc.id,
          type: 'account',
          action: 'update',
          data: updatedAcc,
        });
      }
      return;
    }

    if (isFirebase && user) {
      const promises: Promise<any>[] = [firestoreService.saveTransaction(newTx)];
      if (updatedAcc) {
        promises.push(firestoreService.saveAccount(updatedAcc));
      }
      await Promise.all(promises);
      return;
    }

    await api.createTransaction(data);
    await refreshData();
  };

  const payCreditCardBill = async (data: {
    creditCardAccountId: string;
    sourceAccountId: string;
    amountIdr: number;
    adminFee?: number;
    date?: string;
    notes?: string;
  }) => {
    const sourceAcc = accounts.find((a) => a.id === data.sourceAccountId);
    const ccAcc = accounts.find((a) => a.id === data.creditCardAccountId);
    if (!sourceAcc || !ccAcc) throw new Error('Accounts not found');

    const amount = Math.abs(Number(data.amountIdr));
    const adminFee = Math.abs(Number(data.adminFee || 0));
    const totalDeduction = amount + adminFee;
    const now = new Date().toISOString();
    const txId = 'tx_cc_' + Date.now();
    const txDate = data.date || now.split('T')[0];
    const isPayLater = ccAcc.type === 'paylater';

    const updatedSource: Account = {
      ...sourceAcc,
      balance: sourceAcc.balance - totalDeduction,
      updatedAt: now,
    };
    const updatedCc: Account = {
      ...ccAcc,
      balance: Math.max(0, ccAcc.balance - amount),
      updatedAt: now,
    };

    const tx: Transaction = {
      id: txId,
      userId: user?.id || 'usr_local',
      type: 'expense',
      amount,
      accountId: data.sourceAccountId,
      toAccountId: data.creditCardAccountId,
      category: isPayLater ? `PayLater Payment (${ccAcc.name})` : `Credit Card Payment (${ccAcc.name})`,
      date: txDate,
      notes: data.notes || `Paid ${isPayLater ? 'PayLater' : 'credit card'} bill for ${ccAcc.name} from ${sourceAcc.name}${adminFee > 0 ? ` (Admin Fee: Rp ${adminFee.toLocaleString()})` : ''}`,
      createdAt: now,
    };

    let feeTx: Transaction | null = null;
    if (adminFee > 0) {
      feeTx = {
        id: 'tx_fee_' + Date.now(),
        userId: user?.id || 'usr_local',
        type: 'expense',
        amount: adminFee,
        accountId: data.sourceAccountId,
        category: 'Admin / Settlement Fee',
        date: txDate,
        notes: `Admin settlement fee for ${ccAcc.name} bill payment`,
        createdAt: now,
      };
    }

    // Immediate optimistic state update
    const updatedAccounts = accounts.map((a) => (a.id === updatedSource.id ? updatedSource : a.id === updatedCc.id ? updatedCc : a));
    const updatedTxs = [tx, ...(feeTx ? [feeTx] : []), ...transactions];
    setAccounts(updatedAccounts);
    setTransactions(updatedTxs);
    const nextStats = computeStats(updatedAccounts, updatedTxs, investments, usdIdrRate);
    setStats(nextStats);

    // Save to snapshot immediately for instant offline dashboard access
    offlineSyncManager.saveSnapshot({
      accounts: updatedAccounts,
      transactions: updatedTxs,
      investments,
      stats: nextStats,
    });

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedSource.id, [
      updatedSource.id, updatedSource.name, updatedSource.type, updatedSource.balance, 'IDR',
      updatedSource.accountNumber || '', updatedSource.creditLimit || 0, updatedSource.billingDate || '', updatedSource.dueDate || '', updatedSource.cardNetwork || '', updatedSource.last4Digits || '', updatedSource.createdAt, updatedSource.updatedAt
    ]);
    syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedCc.id, [
      updatedCc.id, updatedCc.name, updatedCc.type, updatedCc.balance, 'IDR',
      updatedCc.accountNumber || '', updatedCc.creditLimit || 0, updatedCc.billingDate || '', updatedCc.dueDate || '', updatedCc.cardNetwork || '', updatedCc.last4Digits || '', updatedCc.createdAt, updatedCc.updatedAt
    ]);
    syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', tx.id, [
      tx.id, tx.date, tx.amount, tx.category, tx.notes || '', tx.accountId, tx.type, tx.toAccountId || '', tx.toInvestmentId || '', tx.createdAt, now
    ]);
    if (feeTx) {
      syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', feeTx.id, [
        feeTx.id, feeTx.date, feeTx.amount, feeTx.category, feeTx.notes || '', feeTx.accountId, feeTx.type, feeTx.toAccountId || '', feeTx.toInvestmentId || '', feeTx.createdAt, now
      ]);
    }

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (isFirebase && user) {
      await firestoreService.saveAccount(updatedSource);
      await firestoreService.saveAccount(updatedCc);
      await firestoreService.saveTransaction(tx);
      if (feeTx) {
        await firestoreService.saveTransaction(feeTx);
      }
      return;
    }

    await api.payCreditCardBill(data);
    await refreshData();
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const lockStatus = isTransactionLocked(oldTx, accounts);
    if (lockStatus.locked) {
      throw new Error(lockStatus.reason || 'This transaction is locked and cannot be modified.');
    }

    const newAmount = data.amount !== undefined ? Math.abs(Number(data.amount)) : oldTx.amount;
    const requestedType = data.type || oldTx.type;
    const newAccountId = data.accountId || oldTx.accountId;
    const now = new Date().toISOString();

    const oldAcc = accounts.find((a) => a.id === oldTx.accountId);
    const newAcc = accounts.find((a) => a.id === newAccountId);
    if (!newAcc) throw new Error('Target account not found');

    const effectiveType = (newAcc.type === 'credit_card' || newAcc.type === 'paylater') && (requestedType === 'expense' || requestedType === 'cc_debt')
      ? 'cc_debt'
      : requestedType;

    // Validate available balance/credit for updated expense
    if (requestedType === 'expense' || effectiveType === 'cc_debt') {
      if (newAcc.type === 'credit_card' || newAcc.type === 'paylater') {
        if (newAcc.creditLimit !== undefined) {
          let revertedDebt = newAcc.balance;
          if (oldAcc && oldAcc.id === newAcc.id && (oldTx.type === 'expense' || oldTx.type === 'cc_debt')) {
            revertedDebt = Math.max(0, revertedDebt - oldTx.amount);
          }
          if (revertedDebt + newAmount > newAcc.creditLimit) {
            const avail = Math.max(0, newAcc.creditLimit - revertedDebt);
            throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
          }
        }
      } else {
        let revertedBal = newAcc.balance;
        if (oldAcc && oldAcc.id === newAcc.id && (oldTx.type === 'expense' || oldTx.type === 'cc_debt')) {
          revertedBal += oldTx.amount;
        }
        if (newAmount > revertedBal) {
          throw new Error(`Insufficient balance (${revertedBal.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    const updatedTx: Transaction = {
      ...oldTx,
      ...data,
      amount: newAmount,
      type: effectiveType as any,
      accountId: newAccountId,
    };

    let updatedAccounts = [...accounts];

    // Auto sync transaction to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'UPDATE', updatedTx.id, [
      updatedTx.id,
      updatedTx.date,
      updatedTx.amount,
      updatedTx.category,
      updatedTx.notes || '',
      updatedTx.accountId,
      updatedTx.type,
      updatedTx.toAccountId || '',
      updatedTx.toInvestmentId || '',
      updatedTx.createdAt || now,
      now,
    ]);

    if (oldAcc && newAcc && oldAcc.id === newAcc.id) {
      // Modifying transaction within the same account
      let bal = oldAcc.balance;

      // 1. Revert previous transaction effect
      if (oldAcc.type === 'credit_card' || oldAcc.type === 'paylater') {
        if (oldTx.type === 'expense' || oldTx.type === 'cc_debt') bal -= oldTx.amount;
        else if (oldTx.type === 'income') bal += oldTx.amount;
      } else {
        if (oldTx.type === 'expense' || oldTx.type === 'cc_debt') bal += oldTx.amount;
        else if (oldTx.type === 'income') bal -= oldTx.amount;
      }

      // 2. Apply new transaction effect
      if (oldAcc.type === 'credit_card' || oldAcc.type === 'paylater') {
        if (effectiveType === 'expense' || effectiveType === 'cc_debt') bal += newAmount;
        else if (effectiveType === 'income') bal -= newAmount;
      } else {
        if (effectiveType === 'expense' || effectiveType === 'cc_debt') bal -= newAmount;
        else if (effectiveType === 'income') bal += newAmount;
      }

      const modAcc = { ...oldAcc, balance: bal, updatedAt: now };
      updatedAccounts = updatedAccounts.map((a) => (a.id === modAcc.id ? modAcc : a));

      // Sync account update to Google Sheets
      syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', modAcc.id, [
        modAcc.id, modAcc.name, modAcc.type, modAcc.balance, 'IDR',
        modAcc.accountNumber || '', modAcc.creditLimit || 0, modAcc.billingDate || '', modAcc.dueDate || '', modAcc.cardNetwork || '', modAcc.last4Digits || '', modAcc.createdAt, modAcc.updatedAt
      ]);

      // Immediate optimistic update
      const nextTxs = transactions.map((t) => (t.id === id ? updatedTx : t));
      setAccounts(updatedAccounts);
      setTransactions(nextTxs);
      setStats(computeStats(updatedAccounts, nextTxs, investments, usdIdrRate));

      if (appsScriptUrl || spreadsheetId) {
        return;
      }

      if (isFirebase && user) {
        await Promise.all([
          firestoreService.saveTransaction(updatedTx),
          firestoreService.saveAccount(modAcc),
        ]);
        return;
      }
    } else {
      // Account was changed to a different one
      let modOldAcc = oldAcc ? { ...oldAcc } : null;
      let modNewAcc = newAcc ? { ...newAcc } : null;

      if (modOldAcc) {
        let bal = modOldAcc.balance;
        if (modOldAcc.type === 'credit_card' || modOldAcc.type === 'paylater') {
          if (oldTx.type === 'expense' || oldTx.type === 'cc_debt') bal -= oldTx.amount;
          else if (oldTx.type === 'income') bal += oldTx.amount;
        } else {
          if (oldTx.type === 'expense' || oldTx.type === 'cc_debt') bal += oldTx.amount;
          else if (oldTx.type === 'income') bal -= oldTx.amount;
        }
        modOldAcc.balance = bal;
        modOldAcc.updatedAt = now;

        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', modOldAcc.id, [
          modOldAcc.id, modOldAcc.name, modOldAcc.type, modOldAcc.balance, 'IDR',
          modOldAcc.accountNumber || '', modOldAcc.creditLimit || 0, modOldAcc.billingDate || '', modOldAcc.dueDate || '', modOldAcc.cardNetwork || '', modOldAcc.last4Digits || '', modOldAcc.createdAt, modOldAcc.updatedAt
        ]);
      }

      if (modNewAcc) {
        let bal = modNewAcc.balance;
        if (modNewAcc.type === 'credit_card' || modNewAcc.type === 'paylater') {
          if (effectiveType === 'expense' || effectiveType === 'cc_debt') bal += newAmount;
          else if (effectiveType === 'income') bal -= newAmount;
        } else {
          if (effectiveType === 'expense' || effectiveType === 'cc_debt') bal -= newAmount;
          else if (effectiveType === 'income') bal += newAmount;
        }
        modNewAcc.balance = bal;
        modNewAcc.updatedAt = now;

        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', modNewAcc.id, [
          modNewAcc.id, modNewAcc.name, modNewAcc.type, modNewAcc.balance, 'IDR',
          modNewAcc.accountNumber || '', modNewAcc.creditLimit || 0, modNewAcc.billingDate || '', modNewAcc.dueDate || '', modNewAcc.cardNetwork || '', modNewAcc.last4Digits || '', modNewAcc.createdAt, modNewAcc.updatedAt
        ]);
      }

      if (modOldAcc) {
        updatedAccounts = updatedAccounts.map((a) => (a.id === modOldAcc!.id ? modOldAcc! : a));
      }
      if (modNewAcc) {
        updatedAccounts = updatedAccounts.map((a) => (a.id === modNewAcc!.id ? modNewAcc! : a));
      }

      // Immediate optimistic update
      const nextTxs = transactions.map((t) => (t.id === id ? updatedTx : t));
      setAccounts(updatedAccounts);
      setTransactions(nextTxs);
      setStats(computeStats(updatedAccounts, nextTxs, investments, usdIdrRate));

      if (appsScriptUrl || spreadsheetId) {
        return;
      }

      if (isFirebase && user) {
        const promises: Promise<any>[] = [firestoreService.saveTransaction(updatedTx)];
        if (modOldAcc) promises.push(firestoreService.saveAccount(modOldAcc));
        if (modNewAcc) promises.push(firestoreService.saveAccount(modNewAcc));
        await Promise.all(promises);
        return;
      }
    }

    await api.updateTransaction(id, data);
    await refreshData();
  };

  const deleteTransaction = async (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    const lockStatus = isTransactionLocked(target, accounts);
    if (lockStatus.locked) {
      throw new Error(lockStatus.reason || 'This transaction is locked and cannot be deleted.');
    }

    const targetAcc = accounts.find((a) => a.id === target.accountId);
    let updatedAccounts = [...accounts];
    let modAcc: Account | null = null;

    if (targetAcc) {
      let newBal = targetAcc.balance;
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        newBal = (target.type === 'expense' || target.type === 'cc_debt') ? targetAcc.balance - target.amount : targetAcc.balance + target.amount;
      } else {
        newBal = (target.type === 'expense' || target.type === 'cc_debt') ? targetAcc.balance + target.amount : targetAcc.balance - target.amount;
      }
      modAcc = {
        ...targetAcc,
        balance: newBal,
        updatedAt: new Date().toISOString(),
      };
      updatedAccounts = updatedAccounts.map((a) => (a.id === modAcc!.id ? modAcc! : a));
    }

    // Immediate optimistic update
    const nextTxs = transactions.filter((t) => t.id !== id);
    setAccounts(updatedAccounts);
    setTransactions(nextTxs);
    const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot({
      accounts: updatedAccounts,
      transactions: nextTxs,
      investments,
      stats: nextStats,
    });

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'DELETE', id);
    if (modAcc) {
      syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', modAcc.id, [
        modAcc.id, modAcc.name, modAcc.type, modAcc.balance, 'IDR',
        modAcc.accountNumber || '', modAcc.creditLimit || 0, modAcc.billingDate || '', modAcc.dueDate || '', modAcc.cardNetwork || '', modAcc.last4Digits || '', modAcc.createdAt, modAcc.updatedAt
      ]);
    }

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id,
        type: 'transaction',
        action: 'delete',
        data: { id },
      });
      if (modAcc) {
        offlineSyncManager.queueItem({
          id: modAcc.id,
          type: 'account',
          action: 'update',
          data: modAcc,
        });
      }
      return;
    }

    if (isFirebase && user) {
      const promises: Promise<any>[] = [firestoreService.deleteTransaction(id)];
      if (modAcc) {
        promises.push(firestoreService.saveAccount(modAcc));
      }
      await Promise.all(promises);
      return;
    }

    await api.deleteTransaction(id);
    await refreshData();
  };

  // Transfers
  const transferFunds = async (data: {
    type: 'account_to_account' | 'bank_to_investment';
    fromAccountId: string;
    toAccountId?: string;
    toInvestmentId?: string;
    newInvestment?: {
      name: string;
      category: InvestmentCategory;
      currency?: 'IDR' | 'USD';
      platform?: string;
      units?: number;
      notes?: string;
    };
    amountIdr: number;
    amountUsd?: number;
    exchangeRate?: number;
    date?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const txId = 'tx_' + Date.now();

    if (data.type === 'account_to_account' && data.toAccountId) {
      const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
      const toAcc = accounts.find((a) => a.id === data.toAccountId);
      if (fromAcc && toAcc) {
        const updatedFrom = { ...fromAcc, balance: fromAcc.balance - data.amountIdr, updatedAt: now };
        const updatedTo = { ...toAcc, balance: toAcc.balance + data.amountIdr, updatedAt: now };
        const tx: Transaction = {
          id: txId,
          userId: user?.id || 'usr_local',
          type: 'transfer',
          amount: data.amountIdr,
          accountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          category: `Transfer to ${toAcc.name}`,
          date: data.date || now.split('T')[0],
          notes: data.notes,
          createdAt: now,
        };

        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedFrom.id, [
          updatedFrom.id, updatedFrom.name, updatedFrom.type, updatedFrom.balance, 'IDR',
          updatedFrom.accountNumber || '', updatedFrom.creditLimit || 0, updatedFrom.billingDate || '', updatedFrom.dueDate || '', updatedFrom.cardNetwork || '', updatedFrom.last4Digits || '', updatedFrom.createdAt, updatedFrom.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedTo.id, [
          updatedTo.id, updatedTo.name, updatedTo.type, updatedTo.balance, 'IDR',
          updatedTo.accountNumber || '', updatedTo.creditLimit || 0, updatedTo.billingDate || '', updatedTo.dueDate || '', updatedTo.cardNetwork || '', updatedTo.last4Digits || '', updatedTo.createdAt, updatedTo.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', tx.id, [
          tx.id, tx.date, tx.amount, tx.category, tx.notes || '', tx.accountId, tx.type, tx.toAccountId || '', tx.toInvestmentId || '', tx.createdAt, now
        ]);

        if (appsScriptUrl || spreadsheetId) {
          return;
        }

        if (isFirebase && user) {
          await firestoreService.saveAccount(updatedFrom);
          await firestoreService.saveAccount(updatedTo);
          await firestoreService.saveTransaction(tx);
          return;
        }
      }
    } else if (data.type === 'bank_to_investment') {
      const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
      if (!fromAcc) throw new Error('Source account not found');

      let targetInv = data.toInvestmentId ? investments.find((i) => i.id === data.toInvestmentId) : undefined;
      let targetInvId = data.toInvestmentId;

      if (!targetInv && data.newInvestment) {
        const targetCurrency = data.newInvestment.currency || ((data.newInvestment.category === 'USD' || data.newInvestment.category === 'ETF USA') ? 'USD' : 'IDR');
        const isUsd = targetCurrency === 'USD';
        let rate = data.exchangeRate || usdIdrRate;
        let initialCost = data.amountIdr;
        let amountUsd = undefined;

        if (isUsd) {
          const parsedUsd = Number(data.amountUsd);
          if (!isNaN(parsedUsd) && parsedUsd > 0) {
            initialCost = Number(parsedUsd.toFixed(2));
            amountUsd = initialCost;
            if (data.amountIdr > 0) {
              rate = data.exchangeRate || Number((data.amountIdr / initialCost).toFixed(2));
            }
          } else {
            initialCost = Number((data.amountIdr / rate).toFixed(2));
            amountUsd = initialCost;
          }
        }

        targetInvId = 'inv_' + Date.now();
        targetInv = {
          id: targetInvId,
          userId: user?.id || 'usr_local',
          name: data.newInvestment.name.trim(),
          category: data.newInvestment.category,
          currency: targetCurrency,
          amountInvested: initialCost,
          currentValue: initialCost,
          customExchangeRate: isUsd ? rate : undefined,
          createdAt: now,
          updatedAt: now,
          ...(data.newInvestment.units !== undefined ? { units: data.newInvestment.units } : {}),
          ...(data.newInvestment.platform?.trim() ? { platform: data.newInvestment.platform.trim() } : {}),
          ...(data.newInvestment.notes?.trim() ? { notes: data.newInvestment.notes.trim() } : {}),
        };

        const updatedFrom = { ...fromAcc, balance: fromAcc.balance - data.amountIdr, updatedAt: now };
        const tx: Transaction = {
          id: txId,
          userId: user?.id || 'usr_local',
          type: 'bank_to_investment',
          amount: data.amountIdr,
          accountId: data.fromAccountId,
          toInvestmentId: targetInvId,
          amountUsd: isUsd ? amountUsd : undefined,
          exchangeRate: isUsd ? rate : undefined,
          category: `Funded ${targetInv.name}`,
          date: data.date || now.split('T')[0],
          notes: data.notes || `Initial funding for ${targetInv.name} from ${fromAcc.name}`,
          createdAt: now,
        };

        syncToSheets(SHEET_TAB_NAMES.INVESTMENTS, 'CREATE', targetInv.id, [
          targetInv.id, targetInv.name, targetInv.category, targetInv.units || 1, targetInv.amountInvested, targetInv.currentValue, targetInv.currency || 'IDR', targetInv.customExchangeRate || '', targetInv.platform || '', targetInv.notes || '', targetInv.createdAt, targetInv.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedFrom.id, [
          updatedFrom.id, updatedFrom.name, updatedFrom.type, updatedFrom.balance, 'IDR', updatedFrom.accountNumber || '', updatedFrom.creditLimit || 0, updatedFrom.billingDate || '', updatedFrom.dueDate || '', updatedFrom.cardNetwork || '', updatedFrom.last4Digits || '', updatedFrom.createdAt, updatedFrom.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', tx.id, [
          tx.id, tx.date, tx.amount, tx.category, tx.notes || '', tx.accountId, tx.type, tx.toAccountId || '', tx.toInvestmentId || '', tx.createdAt, now
        ]);

        if (appsScriptUrl || spreadsheetId) {
          return;
        }

        if (isFirebase && user) {
          await firestoreService.saveInvestment(targetInv);
          await firestoreService.saveAccount(updatedFrom);
          await firestoreService.saveTransaction(tx);
          return;
        }
      } else if (fromAcc && targetInv) {
        const isUsd = targetInv.currency === 'USD';
        let rate = data.exchangeRate || targetInv.customExchangeRate || usdIdrRate;
        let addedCost = data.amountIdr;
        let addedVal = data.amountIdr;
        let amountUsd = undefined;

        if (isUsd) {
          const parsedUsd = Number(data.amountUsd);
          if (!isNaN(parsedUsd) && parsedUsd > 0) {
            addedCost = Number(parsedUsd.toFixed(2));
            addedVal = addedCost;
            amountUsd = addedCost;
            if (data.amountIdr > 0) {
              rate = data.exchangeRate || Number((data.amountIdr / addedCost).toFixed(2));
            }
          } else {
            addedCost = Number((data.amountIdr / rate).toFixed(2));
            addedVal = addedCost;
            amountUsd = addedCost;
          }
        }

        const updatedInv = {
          ...targetInv,
          amountInvested: targetInv.amountInvested + addedCost,
          currentValue: targetInv.currentValue + addedVal,
          customExchangeRate: isUsd ? rate : targetInv.customExchangeRate,
          updatedAt: now,
        };
        const updatedFrom = { ...fromAcc, balance: fromAcc.balance - data.amountIdr, updatedAt: now };
        const tx: Transaction = {
          id: txId,
          userId: user?.id || 'usr_local',
          type: 'bank_to_investment',
          amount: data.amountIdr,
          accountId: data.fromAccountId,
          toInvestmentId: data.toInvestmentId,
          amountUsd: isUsd ? amountUsd : undefined,
          exchangeRate: isUsd ? rate : undefined,
          category: `Funded ${targetInv.name}`,
          date: data.date || now.split('T')[0],
          notes: data.notes,
          createdAt: now,
        };

        syncToSheets(SHEET_TAB_NAMES.INVESTMENTS, 'UPDATE', updatedInv.id, [
          updatedInv.id, updatedInv.name, updatedInv.category, updatedInv.units || 1, updatedInv.amountInvested, updatedInv.currentValue, updatedInv.currency || 'IDR', updatedInv.customExchangeRate || '', updatedInv.platform || '', updatedInv.notes || '', updatedInv.createdAt, updatedInv.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.ACCOUNTS, 'UPDATE', updatedFrom.id, [
          updatedFrom.id, updatedFrom.name, updatedFrom.type, updatedFrom.balance, 'IDR', updatedFrom.accountNumber || '', updatedFrom.creditLimit || 0, updatedFrom.billingDate || '', updatedFrom.dueDate || '', updatedFrom.cardNetwork || '', updatedFrom.last4Digits || '', updatedFrom.createdAt, updatedFrom.updatedAt
        ]);
        syncToSheets(SHEET_TAB_NAMES.EXPENSES, 'CREATE', tx.id, [
          tx.id, tx.date, tx.amount, tx.category, tx.notes || '', tx.accountId, tx.type, tx.toAccountId || '', tx.toInvestmentId || '', tx.createdAt, now
        ]);

        if (appsScriptUrl || spreadsheetId) {
          return;
        }

        if (isFirebase && user) {
          await firestoreService.saveInvestment(updatedInv);
          await firestoreService.saveAccount(updatedFrom);
          await firestoreService.saveTransaction(tx);
          return;
        }
      }
    }

    if (data.type === 'bank_to_investment' && data.newInvestment) {
      const created = await api.createInvestment({
        name: data.newInvestment.name.trim(),
        category: data.newInvestment.category,
        currency: data.newInvestment.currency,
        amountInvested: 0,
        currentValue: 0,
        customExchangeRate: data.exchangeRate,
        platform: data.newInvestment.platform,
        units: data.newInvestment.units,
        notes: data.newInvestment.notes,
      });

      await api.executeTransfer({
        type: 'bank_to_investment',
        fromAccountId: data.fromAccountId,
        toInvestmentId: created.investment.id,
        amountIdr: data.amountIdr,
        amountUsd: data.amountUsd,
        exchangeRate: data.exchangeRate,
        date: data.date,
        notes: data.notes || `Initial funding for ${created.investment.name}`,
      });
      await refreshData();
      return;
    }

    await api.executeTransfer(data);
    await refreshData();
  };

  // Investments
  const addInvestment = async (data: {
    name: string;
    category: InvestmentCategory;
    currency?: 'IDR' | 'USD';
    amountInvested: number;
    currentValue?: number;
    customExchangeRate?: number;
    units?: number;
    platform?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const chosenCurrency = data.currency || (data.category === 'USD' || data.category === 'ETF USA' ? 'USD' : 'IDR');
    const newInv: Investment = {
      id: 'inv_' + Date.now(),
      userId: user?.id || 'usr_local',
      name: data.name,
      category: data.category,
      currency: chosenCurrency,
      amountInvested: data.amountInvested,
      currentValue: data.currentValue ?? data.amountInvested,
      customExchangeRate: data.customExchangeRate,
      createdAt: now,
      updatedAt: now,
      ...(data.units !== undefined ? { units: data.units } : {}),
      ...(data.platform?.trim() ? { platform: data.platform.trim() } : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    };

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.INVESTMENTS, 'CREATE', newInv.id, [
      newInv.id,
      newInv.name,
      newInv.category,
      newInv.units || 1,
      newInv.amountInvested,
      newInv.currentValue || newInv.amountInvested,
      newInv.currency || 'IDR',
      newInv.customExchangeRate || '',
      newInv.platform || '',
      newInv.notes || '',
      newInv.createdAt,
      newInv.updatedAt,
    ]);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (isFirebase && user) {
      await firestoreService.saveInvestment(newInv);
      return;
    }

    await api.createInvestment(data);
    await refreshData();
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    const target = investments.find((i) => i.id === id);
    if (target) {
      const nextCategory = data.category || target.category;
      const nextCurrency =
        data.currency ??
        target.currency ??
        (nextCategory === 'USD' || nextCategory === 'ETF USA' ? 'USD' : 'IDR');
      const updatedInv: Investment = {
        ...target,
        ...data,
        currency: nextCurrency,
        updatedAt: new Date().toISOString(),
      };

      // Auto sync to Google Sheets / Apps Script
      syncToSheets(SHEET_TAB_NAMES.INVESTMENTS, 'UPDATE', updatedInv.id, [
        updatedInv.id,
        updatedInv.name,
        updatedInv.category,
        updatedInv.units || 1,
        updatedInv.amountInvested,
        updatedInv.currentValue || updatedInv.amountInvested,
        updatedInv.currency || 'IDR',
        updatedInv.customExchangeRate || '',
        updatedInv.platform || '',
        updatedInv.notes || '',
        updatedInv.createdAt,
        updatedInv.updatedAt,
      ]);

      if (appsScriptUrl || spreadsheetId) {
        return;
      }

      if (isFirebase && user) {
        await firestoreService.saveInvestment(updatedInv);
        return;
      }
    }

    await api.updateInvestment(id, data);
    await refreshData();
  };

  const deleteInvestment = async (id: string) => {
    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.INVESTMENTS, 'DELETE', id);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (isFirebase) {
      await firestoreService.deleteInvestment(id);
      return;
    }

    await api.deleteInvestment(id);
    await refreshData();
  };

  // Holding Types Operations
  const addHoldingType = async (data: {
    id?: string;
    label: string;
    defaultCurrency: 'IDR' | 'USD';
    example?: string;
    badgeColor?: string;
  }) => {
    const res = await api.addHoldingType(data);
    setHoldingTypes((prev) => [...prev.filter((h) => h.id !== res.holdingType.id), res.holdingType]);
    await refreshData();
  };

  const updateHoldingType = async (id: string, data: Partial<HoldingType>) => {
    const res = await api.updateHoldingType(id, data);
    setHoldingTypes((prev) => prev.map((h) => (h.id === id ? res.holdingType : h)));
    await refreshData();
  };

  const deleteHoldingType = async (id: string) => {
    await api.deleteHoldingType(id);
    setHoldingTypes((prev) => prev.filter((h) => h.id !== id));
    await refreshData();
  };

  // ---------------- CUSTOM TRANSACTION CATEGORIES OPERATIONS ----------------
  const addCustomCategory = async (name: string, type: 'expense' | 'income', color: string = '#10b981') => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Please enter a category name');
    }

    const existingList = type === 'expense' ? expenseCategories : incomeCategories;
    if (existingList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Category "${trimmed}" already exists in ${type === 'expense' ? 'Expense' : 'Income'} categories`);
    }

    const newCat: CustomTransactionCategory = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      type,
      color,
      createdAt: new Date().toISOString(),
    };

    CATEGORY_COLORS[trimmed] = color;

    const nextCustom = [...customCategories, newCat];
    setCustomCategories(nextCustom);

    try {
      localStorage.setItem(
        `wealthtrack_custom_categories_${user?.id || 'default'}`,
        JSON.stringify(nextCustom)
      );
    } catch {}

    if (settings) {
      const nextSettings: UserSettings = {
        ...settings,
        customCategories: nextCustom,
      };
      setSettings(nextSettings);
      if (isFirebase && user) {
        await firestoreService.saveSettings(nextSettings).catch(() => {});
      } else {
        await api.updateSettings({ customCategories: nextCustom } as any).catch(() => {});
      }
    }
  };

  const deleteCustomCategory = async (id: string) => {
    const nextCustom = customCategories.filter((c) => c.id !== id);
    setCustomCategories(nextCustom);

    try {
      localStorage.setItem(
        `wealthtrack_custom_categories_${user?.id || 'default'}`,
        JSON.stringify(nextCustom)
      );
    } catch {}

    if (settings) {
      const nextSettings: UserSettings = {
        ...settings,
        customCategories: nextCustom,
      };
      setSettings(nextSettings);
      if (isFirebase && user) {
        await firestoreService.saveSettings(nextSettings).catch(() => {});
      } else {
        await api.updateSettings({ customCategories: nextCustom } as any).catch(() => {});
      }
    }
  };

  // ---------------- BUDGETING OPERATIONS ----------------
  const saveBudget = async (category: string, monthlyLimit: number, month?: string, id?: string) => {
    const budgetId = id || 'bgt_' + Date.now();
    const now = new Date().toISOString();
    const budgetItem: CategoryBudget = {
      id: budgetId,
      userId: user?.id || 'usr_local',
      category: category.trim(),
      monthlyLimit: Number(monthlyLimit) || 0,
      month: month || undefined,
      createdAt: now,
      updatedAt: now,
    };

    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === budgetId);
      const next = idx >= 0 ? [...prev] : [...prev, budgetItem];
      if (idx >= 0) next[idx] = budgetItem;
      offlineSyncManager.saveSnapshot({ budgets: next });
      return next;
    });

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.BUDGETS, 'CREATE', budgetItem.id, [
      budgetItem.id,
      budgetItem.category,
      budgetItem.monthlyLimit,
      budgetItem.month || '',
      budgetItem.createdAt,
      budgetItem.updatedAt,
    ]);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id: budgetId,
        type: 'budget',
        action: 'create',
        data: budgetItem,
      });
      return;
    }

    try {
      const res = await api.saveBudget({ id, category, monthlyLimit, month });
      if (isFirebase && user) {
        await firestoreService.saveBudget(res.budget);
      }
    } catch {
      offlineSyncManager.queueItem({
        id: budgetId,
        type: 'budget',
        action: 'create',
        data: budgetItem,
      });
    }
  };

  const deleteBudget = async (id: string) => {
    setBudgets((prev) => {
      const next = prev.filter((b) => b.id !== id);
      offlineSyncManager.saveSnapshot({ budgets: next });
      return next;
    });

    // Auto sync to Google Sheets / Apps Script
    syncToSheets(SHEET_TAB_NAMES.BUDGETS, 'DELETE', id);

    if (appsScriptUrl || spreadsheetId) {
      return;
    }

    if (!isOnline) {
      offlineSyncManager.queueItem({
        id,
        type: 'budget',
        action: 'delete',
        data: { id },
      });
      return;
    }

    try {
      await api.deleteBudget(id);
      if (isFirebase && user) {
        await firestoreService.deleteBudget(id);
      }
    } catch {
      offlineSyncManager.queueItem({
        id,
        type: 'budget',
        action: 'delete',
        data: { id },
      });
    }
  };

  const getBudgetProgressForMonth = useCallback(
    (targetMonthStr?: string) => {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = targetMonthStr || defaultMonth;

      // Compute previous month string YYYY-MM
      const [yNum, mNum] = month.split('-').map(Number);
      const prevDate = new Date(yNum || now.getFullYear(), (mNum || 1) - 2, 1);
      const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const roundSmartLimit = (rawAmount: number): number => {
        if (rawAmount <= 0) return 500000;
        return Math.max(100000, Math.ceil(rawAmount / 50000) * 50000);
      };

      // Group actual expenses for target month and previous month by category (excluding credit card / paylater usage)
      const spentByCat: Record<string, { total: number; count: number }> = {};
      const prevSpentByCat: Record<string, { total: number; count: number }> = {};
      let totalPrevMonthSpent = 0;

      transactions.forEach((tx) => {
        if (tx.type !== 'expense' || !tx.date) return;
        const acc = accounts.find((a) => a.id === tx.accountId);
        if (acc && (acc.type === 'credit_card' || acc.type === 'paylater')) return;

        const cat = tx.category || 'Other Expense';
        if (tx.date.startsWith(month)) {
          if (!spentByCat[cat]) spentByCat[cat] = { total: 0, count: 0 };
          spentByCat[cat].total += tx.amount;
          spentByCat[cat].count += 1;
        } else if (tx.date.startsWith(prevMonthStr)) {
          if (!prevSpentByCat[cat]) prevSpentByCat[cat] = { total: 0, count: 0 };
          prevSpentByCat[cat].total += tx.amount;
          prevSpentByCat[cat].count += 1;
          totalPrevMonthSpent += tx.amount;
        }
      });

      // Filter budgets that apply to this month
      const activeBudgets: CategoryBudget[] = [];
      const categorySeen = new Set<string>();
      const budgetByCatLower: Record<string, CategoryBudget> = {};

      // Month-specific budgets first
      budgets
        .filter((b) => b.month === month)
        .forEach((b) => {
          const key = b.category.toLowerCase();
          if (!categorySeen.has(key)) {
            activeBudgets.push(b);
            categorySeen.add(key);
            budgetByCatLower[key] = b;
          }
        });

      // Generic recurring budgets if not overridden for this month
      budgets
        .filter((b) => !b.month)
        .forEach((b) => {
          const key = b.category.toLowerCase();
          if (!categorySeen.has(key)) {
            activeBudgets.push(b);
            categorySeen.add(key);
            budgetByCatLower[key] = b;
          }
        });

      let totalBudgeted = 0;
      let totalSpent = 0;
      let overBudgetCount = 0;

      const items: BudgetProgress[] = activeBudgets.map((b) => {
        const catData = spentByCat[b.category] || { total: 0, count: 0 };
        const prevData = prevSpentByCat[b.category] || { total: 0, count: 0 };
        const spent = catData.total;
        const prevSpent = prevData.total;
        const limit = b.monthlyLimit;
        const remaining = limit - spent;
        const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;
        const status: 'safe' | 'warning' | 'danger' =
          spent > limit ? 'danger' : percentUsed >= 75 ? 'warning' : 'safe';

        if (status === 'danger') {
          overBudgetCount++;
        }

        totalBudgeted += limit;
        totalSpent += spent;

        const momDeltaAmount = spent - prevSpent;
        const momDeltaPercent = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
        const suggestedSmartLimit = roundSmartLimit(prevSpent > 0 ? prevSpent : spent * 1.15);

        return {
          category: b.category,
          budgetId: b.id,
          monthlyLimit: limit,
          actualSpent: spent,
          remaining,
          percentUsed,
          status,
          transactionCount: catData.count,
          prevMonthSpent: prevSpent,
          prevMonthTransactionCount: prevData.count,
          momDeltaAmount,
          momDeltaPercent,
          suggestedSmartLimit,
        };
      });

      // Any categories with expenses in current month that do not have a budget limit configured
      const unbudgetedItems: Array<{
        category: string;
        actualSpent: number;
        transactionCount: number;
        prevMonthSpent: number;
        suggestedSmartLimit: number;
      }> = [];

      Object.entries(spentByCat).forEach(([cat, data]) => {
        if (!categorySeen.has(cat.toLowerCase())) {
          const prevData = prevSpentByCat[cat] || { total: 0, count: 0 };
          const suggestedSmartLimit = roundSmartLimit(
            prevData.total > 0 ? prevData.total : data.total * 1.15
          );
          unbudgetedItems.push({
            category: cat,
            actualSpent: data.total,
            transactionCount: data.count,
            prevMonthSpent: prevData.total,
            suggestedSmartLimit,
          });
          totalSpent += data.total;
        }
      });

      // Build list of all categories from last month's expenses for Smart Monthly Budget comparison
      const allComparisonCats = new Set<string>([
        ...Object.keys(prevSpentByCat),
        ...Object.keys(spentByCat),
      ]);
      const prevMonthCategories = Array.from(allComparisonCats)
        .map((cat) => {
          const prev = prevSpentByCat[cat] || { total: 0, count: 0 };
          const curr = spentByCat[cat] || { total: 0, count: 0 };
          const existingBudget = budgetByCatLower[cat.toLowerCase()];
          const baseForSmart = prev.total > 0 ? prev.total : curr.total;
          return {
            category: cat,
            prevMonthSpent: prev.total,
            prevMonthCount: prev.count,
            currentSpent: curr.total,
            currentLimit: existingBudget?.monthlyLimit || 0,
            budgetId: existingBudget?.id,
            suggestedSmartLimit: roundSmartLimit(baseForSmart),
          };
        })
        .filter((c) => c.prevMonthSpent > 0 || c.currentSpent > 0)
        .sort((a, b) => b.prevMonthSpent - a.prevMonthSpent || b.currentSpent - a.currentSpent);

      // Sort items: danger first, then warning, then highest percentage
      items.sort((a, b) => {
        const order = { danger: 0, warning: 1, safe: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return b.percentUsed - a.percentUsed;
      });

      const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
      const overallPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
      const isOverBudget = totalBudgeted > 0 && totalSpent > totalBudgeted;
      const totalMomDeltaAmount = totalSpent - totalPrevMonthSpent;
      const totalMomDeltaPercent =
        totalPrevMonthSpent > 0
          ? ((totalSpent - totalPrevMonthSpent) / totalPrevMonthSpent) * 100
          : null;

      return {
        items,
        unbudgetedItems,
        prevMonthCategories,
        prevMonthStr,
        totalBudgeted,
        totalSpent,
        totalPrevMonthSpent,
        totalMomDeltaAmount,
        totalMomDeltaPercent,
        totalRemaining,
        overallPercent,
        isOverBudget,
        overBudgetCount,
      };
    },
    [budgets, transactions, accounts]
  );

  const applySmartBudgetsFromLastMonth = useCallback(
    async (
      targetMonthStr: string,
      multiplier: number = 1.0
    ): Promise<{ updatedCount: number; totalNewLimit: number }> => {
      const progress = getBudgetProgressForMonth(targetMonthStr);
      const candidates = progress.prevMonthCategories;
      if (candidates.length === 0) {
        return { updatedCount: 0, totalNewLimit: 0 };
      }

      let updatedCount = 0;
      let totalNewLimit = 0;

      for (const item of candidates) {
        const baseAmount = item.prevMonthSpent > 0 ? item.prevMonthSpent : item.currentSpent;
        if (baseAmount <= 0) continue;

        const smartLimit = Math.max(100000, Math.round((baseAmount * multiplier) / 50000) * 50000);
        // Find if there is already a month-specific budget for targetMonthStr
        const existingForMonth = budgets.find(
          (b) => b.category.toLowerCase() === item.category.toLowerCase() && b.month === targetMonthStr
        );
        await saveBudget(item.category, smartLimit, targetMonthStr, existingForMonth?.id);
        updatedCount += 1;
        totalNewLimit += smartLimit;
      }

      return { updatedCount, totalNewLimit };
    },
    [getBudgetProgressForMonth, budgets, saveBudget]
  );

  // Fetch latest rate from Google Finance / market feeds
  const fetchLatestRate = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRateFetching(true);
    }
    try {
      const res = await exchangeRateService.fetchUsdIdrRate();
      const newRate = res.rate;
      const src = res.source;
      const ts = res.timestamp;

      setUsdIdrRate(newRate);
      setRateSource(src);
      setRateLastUpdated(ts);

      // Recompute stats with new rate
      setStats((prevStats) => {
        if (!prevStats && accounts.length === 0 && investments.length === 0) return prevStats;
        return computeStats(accounts, transactions, investments, newRate);
      });

      if (isFirebase && user) {
        if (settings) {
          await firestoreService.saveSettings({
            ...settings,
            usdIdrRate: newRate,
            rateSource: src,
            rateLastUpdated: ts,
            autoUpdateRate: isRateAutoUpdate,
          });
        }
      } else {
        await api.updateSettings({
          usdIdrRate: newRate,
          rateSource: src,
          rateLastUpdated: ts,
          autoUpdateRate: isRateAutoUpdate,
        });
      }

      return { success: true, rate: newRate };
    } catch (err: any) {
      console.warn('Failed to fetch latest exchange rate:', err);
      return { success: false, error: err?.message || 'Failed to fetch rate' };
    } finally {
      setIsRateFetching(false);
    }
  }, [accounts, transactions, investments, isFirebase, user, settings, isRateAutoUpdate]);

  // Auto update every 12 hours from Google Finance / market feeds
  useEffect(() => {
    if (!isRateAutoUpdate) return;
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours

    // Check on mount if never fetched or older than 12 hours
    const checkOnMount = () => {
      const last = rateLastUpdated ? new Date(rateLastUpdated).getTime() : 0;
      const now = Date.now();
      if (now - last >= TWELVE_HOURS_MS) {
        fetchLatestRate({ silent: true });
      }
    };
    checkOnMount();

    // Set recurring 12-hour timer (43,200,000 ms)
    const intervalId = setInterval(() => {
      fetchLatestRate({ silent: true });
    }, TWELVE_HOURS_MS);

    // Refresh when tab gains focus if stale (> 12 hours)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const last = rateLastUpdated ? new Date(rateLastUpdated).getTime() : 0;
        if (Date.now() - last >= TWELVE_HOURS_MS) {
          fetchLatestRate({ silent: true });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRateAutoUpdate, rateLastUpdated, fetchLatestRate]);

  const setIsRateAutoUpdate = async (enabled: boolean) => {
    setIsRateAutoUpdateState(enabled);
    exchangeRateService.setAutoUpdateEnabled(enabled);

    if (isFirebase && user && settings) {
      await firestoreService.saveSettings({
        ...settings,
        autoUpdateRate: enabled,
      });
    } else {
      await api.updateSettings({ autoUpdateRate: enabled });
    }

    if (enabled) {
      fetchLatestRate();
    }
  };

  const updateRate = async (newRate: number, source: string = 'Manual Custom') => {
    const ts = new Date().toISOString();
    setUsdIdrRate(newRate);
    setRateSource(source);
    setRateLastUpdated(ts);
    exchangeRateService.saveLastRateInfo({ source, timestamp: ts });

    setStats((prevStats) => {
      if (!prevStats && accounts.length === 0 && investments.length === 0) return prevStats;
      return computeStats(accounts, transactions, investments, newRate);
    });

    if (isFirebase && user) {
      if (settings) {
        await firestoreService.saveSettings({
          ...settings,
          usdIdrRate: newRate,
          rateSource: source,
          rateLastUpdated: ts,
        });
      }
      return;
    }

    await api.updateSettings({
      usdIdrRate: newRate,
      rateSource: source,
      rateLastUpdated: ts,
    });
    await refreshData();
  };

  // ---------------- AUTOMATIC OFFLINE TO FIREBASE SYNCHRONIZATION ----------------
  const triggerManualSync = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await offlineSyncManager.syncPendingToFirebase();
      setPendingSyncCount(offlineSyncManager.getPendingQueue().length);
      if (res.syncedCount > 0) {
        showNotification({
          title: 'Sinkronisasi Berhasil',
          message: `${res.syncedCount} data perubahan offline berhasil disinkronkan ke Firebase.`,
          type: 'success',
          durationMs: 4000,
        });
      }
      if (isFirebase) {
        fetchLatestRate({ silent: true }).catch(() => {});
      }
    } catch (err) {
      console.warn('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, isFirebase, fetchLatestRate, showNotification]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncFirestoreOnline();

      // Automatically sync offline queued mutations to Firebase once the device is online
      if (user && isFirebase) {
        setIsSyncing(true);
        try {
          const res = await offlineSyncManager.syncPendingToFirebase();
          setPendingSyncCount(offlineSyncManager.getPendingQueue().length);
          if (res.syncedCount > 0) {
            showNotification({
              title: 'Online Kembali',
              message: `${res.syncedCount} data offline otomatis tersinkronisasi ke Firebase.`,
              type: 'info',
              durationMs: 4000,
            });
          }
          fetchLatestRate({ silent: true }).catch(() => {});
        } catch (err) {
          console.warn('Automatic online sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handlePendingChange = (e: any) => {
      if (e?.detail?.count !== undefined) {
        setPendingSyncCount(e.detail.count);
      } else {
        setPendingSyncCount(offlineSyncManager.getPendingQueue().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('wealthtrack:pending_sync_change', handlePendingChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('wealthtrack:pending_sync_change', handlePendingChange);
    };
  }, [user, isFirebase, fetchLatestRate, showNotification]);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        investments,
        stats,
        settings,
        usdIdrRate,
        rateSource,
        rateLastUpdated,
        isRateAutoUpdate,
        setIsRateAutoUpdate,
        isRateFetching,
        fetchLatestRate,
        isLoading,
        isPrivacyMode,
        togglePrivacyMode,
        theme,
        toggleTheme,
        setTheme,
        isOnline,
        isSyncing,
        pendingSyncCount,
        triggerManualSync,

        // Google Apps Script Storage & Sync
        appsScriptUrl,
        setAppsScriptUrl,
        disconnectAppsScript,
        isAppsScriptConnected,
        isAppsScriptSyncing,
        syncAppsScriptNow,
        pushAllDataToGoogleSheet,

        // Google Sheets Storage & Sync
        spreadsheetId,
        setSpreadsheetId,
        isSheetsConnected,
        pendingSheetsQueueCount,
        isSheetsSyncing,
        connectGoogleSheets,
        disconnectGoogleSheets,
        syncGoogleSheetsNow,
        isGoogleSheetSetupOpen,
        setIsGoogleSheetSetupOpen,
        activeTab,
        setActiveTab,
        tabHistory,
        goBack,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isMobileQuickMenuOpen,
        setIsMobileQuickMenuOpen,
        announcement,
        refreshAnnouncement,
        refreshData,
        addAccount,
        updateAccount,
        deleteAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        transferFunds,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        updateRate,
        payCreditCardBill,

        // Holding Types (Master Data)
        holdingTypes,
        addHoldingType,
        updateHoldingType,
        deleteHoldingType,

        // Transaction Categories (Default + Custom)
        customCategories,
        expenseCategories,
        incomeCategories,
        addCustomCategory,
        deleteCustomCategory,
        isCategoryModalOpen,
        setIsCategoryModalOpen,

        // Modal states
        isHoldingTypesModalOpen,
        setIsHoldingTypesModalOpen,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        transactionInitialType,
        setTransactionInitialType,
        isTransferOpen,
        setIsTransferOpen,
        transferInitialMode,
        setTransferInitialMode,
        isAddAccountOpen,
        setIsAddAccountOpen,
        isAddInvestmentOpen,
        setIsAddInvestmentOpen,
        editingAccount,
        setEditingAccount,
        editingInvestment,
        setEditingInvestment,
        editingTransaction,
        setEditingTransaction,
        isFirebaseSetupOpen,
        setIsFirebaseSetupOpen,
        isMobileAppModalOpen,
        setIsMobileAppModalOpen,
        isPayBillOpen,
        setIsPayBillOpen,
        payBillCard,
        setPayBillCard,

        // Budgeting
        budgets,
        saveBudget,
        deleteBudget,
        applySmartBudgetsFromLastMonth,
        isBudgetModalOpen,
        setIsBudgetModalOpen,
        editingBudget,
        setEditingBudget,
        getBudgetProgressForMonth,

        // Popup Notification
        notification,
        showNotification,
        closeNotification,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
