import { Account, Transaction, Investment, CategoryBudget } from '../types';
import { getLocalDateString } from './formatters';

export const APPS_SCRIPT_URL_STORAGE_KEY = 'wealthtrack_apps_script_url';

export const APPS_SCRIPT_TEMPLATE_CODE = `/**
 * WealthTrack Pro - Google Apps Script Backend Sync Engine
 * 
 * Instructions:
 * 1. Buka Google Sheet Anda.
 * 2. Klik menu "Extensions" -> "Apps Script".
 * 3. Hapus semua kode default dan PASTE kode di bawah ini.
 * 4. Klik "Save" (ikon disket).
 * 5. Klik "Deploy" -> "New deployment".
 * 6. Pilih type "Web app".
 * 7. Set "Execute as": "Me".
 * 8. Set "Who has access": "Anyone" (Penting agar web/mobile bisa akses).
 * 9. Klik "Deploy" dan COPY "Web app URL" (https://script.google.com/macros/s/.../exec).
 * 10. Paste URL tersebut di WealthTrack Pro!
 */

const SHEET_TABS = {
  EXPENSES: 'Expenses',
  ACCOUNTS: 'Accounts',
  INVESTMENTS: 'Investments',
  BUDGETS: 'Budgets'
};

const HEADERS = {
  Expenses: ['ID', 'Date', 'Amount', 'Category', 'Description', 'AccountID', 'Type', 'ToAccountID', 'ToInvestmentID', 'CreatedAt', 'UpdatedAt'],
  Accounts: ['ID', 'Name', 'Type', 'Balance', 'Currency', 'AccountNumber', 'CreditLimit', 'BillingDate', 'DueDate', 'CardNetwork', 'Last4Digits', 'CreatedAt', 'UpdatedAt'],
  Investments: ['ID', 'Name', 'Category', 'Units', 'AmountInvested', 'CurrentValue', 'Currency', 'CustomExchangeRate', 'Platform', 'Notes', 'CreatedAt', 'UpdatedAt'],
  Budgets: ['ID', 'Category', 'MonthlyLimit', 'Month', 'CreatedAt', 'UpdatedAt']
};

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  let body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    body = {};
  }
  return handleRequest(body);
}

function handleRequest(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = params.action || 'readAll';
  const tabName = params.tabName || 'Expenses';
  
  // Ensure all tabs and headers exist
  ensureTabs(ss);

  let result = { success: true };

  try {
    if (action === 'init') {
      result.message = 'Structure initialized successfully.';
    } else if (action === 'readAll') {
      result.data = {
        expenses: getTabData(ss, SHEET_TABS.EXPENSES),
        accounts: getTabData(ss, SHEET_TABS.ACCOUNTS),
        investments: getTabData(ss, SHEET_TABS.INVESTMENTS),
        budgets: getTabData(ss, SHEET_TABS.BUDGETS)
      };
    } else if (action === 'bulkUpload') {
      if (params.data) {
        if (params.data.expenses) replaceSheetData(ss, SHEET_TABS.EXPENSES, HEADERS.Expenses, params.data.expenses);
        if (params.data.accounts) replaceSheetData(ss, SHEET_TABS.ACCOUNTS, HEADERS.Accounts, params.data.accounts);
        if (params.data.investments) replaceSheetData(ss, SHEET_TABS.INVESTMENTS, HEADERS.Investments, params.data.investments);
        if (params.data.budgets) replaceSheetData(ss, SHEET_TABS.BUDGETS, HEADERS.Budgets, params.data.budgets);
        result.message = 'Bulk upload completed successfully.';
      }
    } else if (action === 'create' || action === 'append') {
      const sheet = ss.getSheetByName(tabName);
      if (sheet && params.values) {
        const recordId = params.id || (params.values && params.values[0]);
        if (recordId) {
          updateRowById(sheet, recordId, params.values);
        } else {
          sheet.appendRow(params.values);
        }
      }
    } else if (action === 'update') {
      const sheet = ss.getSheetByName(tabName);
      if (sheet && params.id && params.values) {
        updateRowById(sheet, params.id, params.values);
      }
    } else if (action === 'delete') {
      const sheet = ss.getSheetByName(tabName);
      if (sheet && params.id) {
        deleteRowById(sheet, params.id);
      }
    }
  } catch (err) {
    result.success = false;
    result.error = String(err);
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureTabs(ss) {
  Object.keys(HEADERS).forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[tabName]);
    }
  });
}

function getTabData(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const rows = range.getValues();
  const tz = ss.getSpreadsheetTimeZone();

  return rows
    .filter(function(row) {
      return row && row[0] !== undefined && row[0] !== '' && row[0] !== null;
    })
    .map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
        }
        return cell === null || cell === undefined ? '' : String(cell);
      });
    });
}

function updateRowById(sheet, id, values) {
  const data = sheet.getDataRange().getValues();
  let firstFoundIndex = -1;
  const duplicateRowIndices = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (firstFoundIndex === -1) {
        firstFoundIndex = i + 1;
      } else {
        duplicateRowIndices.push(i + 1);
      }
    }
  }

  if (firstFoundIndex !== -1) {
    sheet.getRange(firstFoundIndex, 1, 1, values.length).setValues([values]);
    // Delete any subsequent duplicate rows from bottom to top
    for (let d = duplicateRowIndices.length - 1; d >= 0; d--) {
      sheet.deleteRow(duplicateRowIndices[d]);
    }
    return;
  }
  sheet.appendRow(values);
}

function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  // Traverse backwards to safely delete all matching rows
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function replaceSheetData(ss, tabName, headers, rowArray) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  sheet.clear();
  sheet.appendRow(headers);
  if (rowArray && rowArray.length > 0) {
    sheet.getRange(2, 1, rowArray.length, headers.length).setValues(rowArray);
  }
}
`;

export function parseSheetDate(rawDate: any): string {
  if (!rawDate) return getLocalDateString();
  const str = String(rawDate).trim();

  // If clean YYYY-MM-DD string
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Parse ISO timestamps or formatted date strings into local YYYY-MM-DD
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Fallback if string starts with YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  return str;
}

/**
 * Pre-filled Google Apps Script Web App URLs by account email.
 * Whenever an account (e.g. davinwijaya16@gmail.com) logs in on a new device or browser,
 * the Web App URL will automatically be pre-filled so they don't have to re-enter it.
 *
 * 👉 PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
 */
export const APPS_SCRIPT_URLS_BY_EMAIL_KEY = 'wealthtrack_apps_script_urls_by_email';

export const PREFILLED_APPS_SCRIPT_URLS: Record<string, string> = {
  // Example: 'davinwijaya16@gmail.com': 'https://script.google.com/macros/s/AKfycb.../exec',
  'davinwijaya16@gmail.com': '',
};

function getEmailUrlMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(APPS_SCRIPT_URLS_BY_EMAIL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveEmailUrlMap(map: Record<string, string>) {
  try {
    localStorage.setItem(APPS_SCRIPT_URLS_BY_EMAIL_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function isEmailExplicitlyDisconnected(email?: string): boolean {
  if (!email) return false;
  try {
    const clean = email.toLowerCase().trim();
    return localStorage.getItem(`wealthtrack_disconnected_${clean}`) === 'true';
  } catch {
    return false;
  }
}

function markEmailDisconnected(email: string) {
  try {
    const clean = email.toLowerCase().trim();
    localStorage.setItem(`wealthtrack_disconnected_${clean}`, 'true');
  } catch {}
}

function clearEmailDisconnected(email: string) {
  try {
    const clean = email.toLowerCase().trim();
    localStorage.removeItem(`wealthtrack_disconnected_${clean}`);
  } catch {}
}

export function getStoredAppsScriptUrl(userEmail?: string): string {
  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : '';

  // Demo account or explicitly disconnected accounts should never inherit or keep a personal Google Sheet URL
  if (normalizedEmail === 'demo@wealthtrack.pro' || isEmailExplicitlyDisconnected(normalizedEmail)) {
    return '';
  }

  // 1. Check per-email persistent storage first if userEmail is known
  if (normalizedEmail) {
    const map = getEmailUrlMap();
    const byEmail = map[normalizedEmail];
    if (byEmail && byEmail.trim().startsWith('https://script.google.com')) {
      try {
        localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, byEmail.trim());
      } catch {}
      return byEmail.trim();
    }

    // 2. Check static pre-filled configuration for the user
    const prefilled = PREFILLED_APPS_SCRIPT_URLS[normalizedEmail];
    if (prefilled && prefilled.trim()) {
      const clean = prefilled.trim();
      try {
        localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, clean);
        const map = getEmailUrlMap();
        map[normalizedEmail] = clean;
        saveEmailUrlMap(map);
      } catch {
        // ignore
      }
      return clean;
    }

    // For any other authenticated/registered user without an explicit URL saved, return blank.
    return '';
  }

  // 3. Check active storage key only when userEmail is not provided (guest/anonymous mode)
  try {
    const saved = localStorage.getItem(APPS_SCRIPT_URL_STORAGE_KEY);
    if (saved && saved.trim().startsWith('https://script.google.com')) {
      return saved.trim();
    }
  } catch {
    // ignore
  }

  return '';
}

export function saveAppsScriptUrl(url: string, userEmail?: string): string {
  const trimmed = url.trim();
  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : '';
  try {
    if (trimmed) {
      if (normalizedEmail) {
        clearEmailDisconnected(normalizedEmail);
      }
      localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, trimmed);
      if (normalizedEmail && normalizedEmail !== 'demo@wealthtrack.pro') {
        const map = getEmailUrlMap();
        map[normalizedEmail] = trimmed;
        saveEmailUrlMap(map);
      }
    } else {
      localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return trimmed;
}

export function removeAppsScriptUrl(userEmail?: string, explicitDisconnect = false) {
  try {
    localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
    if (userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();
      if (explicitDisconnect) {
        markEmailDisconnected(normalizedEmail);
      }
      const map = getEmailUrlMap();
      delete map[normalizedEmail];
      saveEmailUrlMap(map);
    }
    // Also clean local snapshot cache if it holds an old appsScriptUrl
    try {
      const rawSnap = localStorage.getItem('wealthtrack_financial_snapshot_v1');
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        if (snap?.settings?.appsScriptUrl) {
          snap.settings.appsScriptUrl = '';
          localStorage.setItem('wealthtrack_financial_snapshot_v1', JSON.stringify(snap));
        }
      }
    } catch {}
  } catch {}
}

export async function saveServerAppsScriptUrl(userEmail?: string, url?: string): Promise<void> {
  if (!userEmail) return;
  const normalizedEmail = userEmail.toLowerCase().trim();
  if (!normalizedEmail || normalizedEmail === 'demo@wealthtrack.pro') return;
  try {
    await fetch('/api/user/apps-script-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, url: (url || '').trim() }),
    });
  } catch {
    // ignore offline/network errors
  }
}

export async function fetchServerAppsScriptUrl(userEmail?: string): Promise<string> {
  if (!userEmail) return '';
  const normalizedEmail = userEmail.toLowerCase().trim();
  if (!normalizedEmail || normalizedEmail === 'demo@wealthtrack.pro') return '';
  try {
    const res = await fetch(`/api/user/apps-script-url?email=${encodeURIComponent(normalizedEmail)}`);
    if (!res.ok) return '';
    const data = await res.json();
    const url = (data?.url || '').trim();
    if (url && url.startsWith('https://script.google.com')) {
      return url;
    }
  } catch {
    // ignore
  }
  return '';
}

export interface AppsScriptQueueItem {
  id: string;
  scriptUrl: string;
  tabName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  recordId: string;
  values?: any[];
  attempts: number;
  createdAt: number;
}

const APPS_SCRIPT_QUEUE_KEY = 'wealthtrack_apps_script_queue_v1';

export class AppsScriptService {
  private isFlushing = false;
  private flushPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.flushQueue();
      });
      // Flush any leftover queued items from a previous session after startup
      setTimeout(() => {
        void this.flushQueue();
      }, 1500);
    }
  }

  private getQueue(): AppsScriptQueueItem[] {
    try {
      const raw = localStorage.getItem(APPS_SCRIPT_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: AppsScriptQueueItem[]): void {
    try {
      localStorage.setItem(APPS_SCRIPT_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore storage quota errors
    }
  }

  public getPendingCount(): number {
    return this.getQueue().length;
  }

  /**
   * Zero-latency background queue for Google Apps Script CRUD mutations.
   * Coalesces consecutive updates to the same record ID so rapid UI edits
   * or smart-budget batch operations complete in 0ms on the main thread.
   */
  public enqueueSync(
    scriptUrl: string,
    tabName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    recordId: string,
    values?: any[]
  ): void {
    if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) return;

    const queue = this.getQueue();
    const existingIdx = queue.findIndex(
      (item) => item.scriptUrl === scriptUrl && item.tabName === tabName && item.recordId === recordId
    );

    if (existingIdx >= 0) {
      const existing = queue[existingIdx];
      if (action === 'DELETE') {
        if (existing.action === 'CREATE') {
          // Created then deleted before flushing -> cancel out both
          queue.splice(existingIdx, 1);
          this.saveQueue(queue);
          return;
        } else {
          queue[existingIdx] = {
            ...existing,
            action: 'DELETE',
            values: undefined,
            attempts: 0,
          };
        }
      } else if (action === 'UPDATE' && values) {
        // Preserve 'CREATE' if not yet flushed, just update payload values
        queue[existingIdx] = {
          ...existing,
          values,
          attempts: 0,
        };
      } else if (action === 'CREATE' && values) {
        queue[existingIdx] = {
          ...existing,
          action: 'CREATE',
          values,
          attempts: 0,
        };
      }
    } else {
      queue.push({
        id: `asq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        scriptUrl,
        tabName,
        action,
        recordId,
        values,
        attempts: 0,
        createdAt: Date.now(),
      });
    }

    this.saveQueue(queue);
    void this.flushQueue();
  }

  public async flushQueue(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isFlushing = true;
    this.flushPromise = (async () => {
      try {
        while (true) {
          const currentQueue = this.getQueue();
          if (currentQueue.length === 0) break;
          if (typeof navigator !== 'undefined' && !navigator.onLine) break;

          const item = currentQueue[0];
          try {
            if (item.action === 'CREATE' && item.values) {
              await this.createRecord(item.scriptUrl, item.tabName, item.values);
            } else if (item.action === 'UPDATE' && item.values) {
              await this.updateRecord(item.scriptUrl, item.tabName, item.recordId, item.values);
            } else if (item.action === 'DELETE') {
              await this.deleteRecord(item.scriptUrl, item.tabName, item.recordId);
            }
            // Remove processed head item
            const updated = this.getQueue().filter((q) => q.id !== item.id);
            this.saveQueue(updated);
          } catch (err) {
            const nextAttempts = (item.attempts || 0) + 1;
            const updated = this.getQueue();
            const idx = updated.findIndex((q) => q.id === item.id);
            if (idx >= 0) {
              if (nextAttempts >= 3) {
                // Drop after 3 failed attempts to avoid blocking queue forever
                updated.splice(idx, 1);
              } else {
                updated[idx].attempts = nextAttempts;
              }
              this.saveQueue(updated);
            }
            // Exponential backoff pause before next retry
            await new Promise((r) => setTimeout(r, Math.min(4000, 600 * Math.pow(2, nextAttempts))));
            break;
          }
        }
      } finally {
        this.isFlushing = false;
        this.flushPromise = null;
      }
    })();

    return this.flushPromise;
  }

  private async sendRequest(scriptUrl: string, payload: any): Promise<any> {
    if (!scriptUrl) {
      throw new Error('Google Apps Script URL belum diatur.');
    }

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Apps Script HTTP Error (${res.status})`);
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: true, text };
    }
  }

  async initStructure(scriptUrl: string): Promise<boolean> {
    const res = await this.sendRequest(scriptUrl, { action: 'init' });
    return res.success !== false;
  }

  async readAllData(scriptUrl: string): Promise<{
    accounts: Account[];
    transactions: Transaction[];
    investments: Investment[];
    budgets: CategoryBudget[];
  }> {
    // Ensure any pending or in-flight local mutations are flushed before reading remote sheet state
    await this.flushQueue();

    const res = await this.sendRequest(scriptUrl, { action: 'readAll' });
    const data = res.data || {};

    const applyPendingRows = (rows: any[], tabName: string): any[] => {
      const pending = this.getQueue().filter((q) => q.scriptUrl === scriptUrl && q.tabName === tabName);
      if (pending.length === 0) return rows;
      const result = [...rows];
      for (const item of pending) {
        const idx = result.findIndex((r) => r && String(r[0]) === String(item.recordId));
        if (item.action === 'DELETE') {
          if (idx >= 0) result.splice(idx, 1);
        } else if ((item.action === 'CREATE' || item.action === 'UPDATE') && item.values) {
          if (idx >= 0) {
            result[idx] = item.values;
          } else {
            result.push(item.values);
          }
        }
      }
      return result;
    };

    const expensesRows: any[] = applyPendingRows(data.expenses || [], 'Expenses');
    const accountsRows: any[] = applyPendingRows(data.accounts || [], 'Accounts');
    const investmentsRows: any[] = applyPendingRows(data.investments || [], 'Investments');
    const budgetsRows: any[] = applyPendingRows(data.budgets || [], 'Budgets');

    // Map Expenses / Transactions
    const transactions: Transaction[] = expensesRows
      .filter((row) => row && row[0])
      .map((row) => ({
        id: String(row[0]),
        date: parseSheetDate(row[1]),
        amount: Number(row[2]) || 0,
        category: String(row[3] || 'General'),
        notes: String(row[4] || ''),
        accountId: String(row[5] || ''),
        type: (row[6] || 'expense') as any,
        toAccountId: row[7] ? String(row[7]) : undefined,
        toInvestmentId: row[8] ? String(row[8]) : undefined,
        createdAt: String(row[9] || new Date().toISOString()),
        userId: 'usr_script',
        idempotencyKey: row[11] ? String(row[11]) : undefined,
      }));

    // Map Accounts
    const accounts: Account[] = accountsRows
      .filter((row) => row && row[0])
      .map((row) => ({
        id: String(row[0]),
        name: String(row[1] || 'Account'),
        type: String(row[2] || 'bank') as any,
        balance: Number(row[3]) || 0,
        currency: (row[4] || 'IDR') as 'IDR' | 'USD',
        accountNumber: row[5] ? String(row[5]) : undefined,
        creditLimit: row[6] ? Number(row[6]) : undefined,
        billingDate: row[7] ? Number(row[7]) : undefined,
        dueDate: row[8] ? Number(row[8]) : undefined,
        cardNetwork: row[9] ? String(row[9]) : undefined,
        last4Digits: row[10] ? String(row[10]) : undefined,
        createdAt: String(row[11] || new Date().toISOString()),
        updatedAt: String(row[12] || new Date().toISOString()),
        userId: 'usr_script',
      }));

    // Map Investments
    const investments: Investment[] = investmentsRows
      .filter((row) => row && row[0])
      .map((row) => ({
        id: String(row[0]),
        name: String(row[1] || 'Investment'),
        category: String(row[2] || 'Saham') as any,
        units: Number(row[3]) || 1,
        amountInvested: Number(row[4]) || 0,
        currentValue: Number(row[5]) || Number(row[4]) || 0,
        currency: (row[6] || 'IDR') as 'IDR' | 'USD',
        customExchangeRate: row[7] ? Number(row[7]) : undefined,
        platform: row[8] ? String(row[8]) : undefined,
        notes: row[9] ? String(row[9]) : undefined,
        createdAt: String(row[10] || new Date().toISOString()),
        updatedAt: String(row[11] || new Date().toISOString()),
        userId: 'usr_script',
      }));

    // Map Budgets
    const budgets: CategoryBudget[] = budgetsRows
      .filter((row) => row && row[0])
      .map((row) => ({
        id: String(row[0]),
        category: String(row[1] || 'General'),
        monthlyLimit: Number(row[2]) || 0,
        month: String(row[3] || new Date().toISOString().slice(0, 7)),
        createdAt: String(row[4] || new Date().toISOString()),
        updatedAt: String(row[5] || new Date().toISOString()),
        userId: 'usr_script',
      }));

    return { accounts, transactions, investments, budgets };
  }

  async createRecord(scriptUrl: string, tabName: string, values: any[]): Promise<void> {
    const recordId = values && values[0] ? String(values[0]) : undefined;
    await this.sendRequest(scriptUrl, {
      action: 'create',
      tabName,
      id: recordId,
      values,
    });
  }

  async updateRecord(scriptUrl: string, tabName: string, id: string, values: any[]): Promise<void> {
    await this.sendRequest(scriptUrl, {
      action: 'update',
      tabName,
      id,
      values,
    });
  }

  async deleteRecord(scriptUrl: string, tabName: string, id: string): Promise<void> {
    await this.sendRequest(scriptUrl, {
      action: 'delete',
      tabName,
      id,
    });
  }

  async bulkUploadData(
    scriptUrl: string,
    payload: {
      expenses?: any[][];
      accounts?: any[][];
      investments?: any[][];
      budgets?: any[][];
    }
  ): Promise<void> {
    await this.sendRequest(scriptUrl, {
      action: 'bulkUpload',
      data: payload,
    });
  }
}

export const appsScriptService = new AppsScriptService();
