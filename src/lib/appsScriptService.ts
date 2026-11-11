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
        sheet.appendRow(params.values);
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
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
      return;
    }
  }
  sheet.appendRow(values);
}

function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
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
export const PREFILLED_APPS_SCRIPT_URLS: Record<string, string> = {
  // Example: 'davinwijaya16@gmail.com': 'https://script.google.com/macros/s/AKfycb.../exec',
  'davinwijaya16@gmail.com': '', // <-- PASTE YOUR WEB APP URL HERE
};

export function getStoredAppsScriptUrl(userEmail?: string): string {
  try {
    const saved = localStorage.getItem(APPS_SCRIPT_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // ignore
  }

  // If localStorage is empty, check pre-filled configuration for the user
  if (userEmail) {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const prefilled = PREFILLED_APPS_SCRIPT_URLS[normalizedEmail];
    if (prefilled && prefilled.trim()) {
      try {
        localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, prefilled.trim());
      } catch {
        // ignore
      }
      return prefilled.trim();
    }
  }

  return '';
}

export function saveAppsScriptUrl(url: string): string {
  const trimmed = url.trim();
  try {
    if (trimmed) {
      localStorage.setItem(APPS_SCRIPT_URL_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return trimmed;
}

export function removeAppsScriptUrl() {
  try {
    localStorage.removeItem(APPS_SCRIPT_URL_STORAGE_KEY);
  } catch {}
}

export class AppsScriptService {
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
    const res = await this.sendRequest(scriptUrl, { action: 'readAll' });
    const data = res.data || {};

    const expensesRows: any[] = data.expenses || [];
    const accountsRows: any[] = data.accounts || [];
    const investmentsRows: any[] = data.investments || [];
    const budgetsRows: any[] = data.budgets || [];

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
    await this.sendRequest(scriptUrl, {
      action: 'create',
      tabName,
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
