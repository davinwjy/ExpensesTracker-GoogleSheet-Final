import { Account, Transaction, Investment, CategoryBudget } from '../types';
import { parseSheetDate } from './appsScriptService';

export interface SheetTabHeaders {
  expenses: string[];
  accounts: string[];
  investments: string[];
  budgets: string[];
}

export const SHEET_TAB_NAMES = {
  EXPENSES: 'Expenses',
  ACCOUNTS: 'Accounts',
  INVESTMENTS: 'Investments',
  BUDGETS: 'Budgets',
};

export const DEFAULT_SHEET_HEADERS = {
  [SHEET_TAB_NAMES.EXPENSES]: ['ID', 'Date', 'Amount', 'Category', 'Description', 'AccountID', 'Type', 'ToAccountID', 'ToInvestmentID', 'CreatedAt', 'UpdatedAt'],
  [SHEET_TAB_NAMES.ACCOUNTS]: ['ID', 'Name', 'Type', 'Balance', 'Currency', 'AccountNumber', 'CreditLimit', 'BillingDate', 'DueDate', 'CardNetwork', 'Last4Digits', 'CreatedAt', 'UpdatedAt'],
  [SHEET_TAB_NAMES.INVESTMENTS]: ['ID', 'Name', 'Category', 'Units', 'AmountInvested', 'CurrentValue', 'Currency', 'CustomExchangeRate', 'Platform', 'Notes', 'CreatedAt', 'UpdatedAt'],
  [SHEET_TAB_NAMES.BUDGETS]: ['ID', 'Category', 'MonthlyLimit', 'Month', 'CreatedAt', 'UpdatedAt'],
};

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Return raw trimmed ID if alphanumeric with hyphens/underscores
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

export class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  private async fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData?.error?.message || `Google Sheets API Error (${res.status}: ${res.statusText})`;
      throw new Error(message);
    }

    return res.json();
  }

  /**
   * Checks spreadsheet metadata, creates missing worksheets (Expenses, Accounts, Investments, Budgets) and sets header rows.
   */
  async ensureSpreadsheetStructure(spreadsheetId: string, accessToken: string): Promise<{ success: boolean; createdTabs: string[] }> {
    const metaUrl = `${this.baseUrl}/${spreadsheetId}?fields=sheets.properties.title`;
    const metadata = await this.fetchWithAuth(metaUrl, accessToken);

    const existingSheetTitles: string[] = (metadata.sheets || []).map((s: any) => s.properties?.title || '');
    const requiredTabs = [
      SHEET_TAB_NAMES.EXPENSES,
      SHEET_TAB_NAMES.ACCOUNTS,
      SHEET_TAB_NAMES.INVESTMENTS,
      SHEET_TAB_NAMES.BUDGETS,
    ];

    const missingTabs = requiredTabs.filter((tab) => !existingSheetTitles.includes(tab));
    const createdTabs: string[] = [];

    // Add missing worksheets
    if (missingTabs.length > 0) {
      const requests = missingTabs.map((title) => ({
        addSheet: {
          properties: {
            title,
          },
        },
      }));

      await this.fetchWithAuth(`${this.baseUrl}/${spreadsheetId}:batchUpdate`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
      createdTabs.push(...missingTabs);
    }

    // Write header rows for each tab if needed
    for (const tabName of requiredTabs) {
      const headers = DEFAULT_SHEET_HEADERS[tabName];
      const range = `${tabName}!A1:${String.fromCharCode(64 + headers.length)}1`;
      
      try {
        const headerCheckUrl = `${this.baseUrl}/${spreadsheetId}/values/${range}`;
        const headerData = await this.fetchWithAuth(headerCheckUrl, accessToken);
        
        if (!headerData.values || headerData.values.length === 0 || !headerData.values[0] || headerData.values[0].length === 0) {
          // Write headers
          const writeUrl = `${this.baseUrl}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
          await this.fetchWithAuth(writeUrl, accessToken, {
            method: 'PUT',
            body: JSON.stringify({
              range,
              majorDimension: 'ROWS',
              values: [headers],
            }),
          });
        }
      } catch (err) {
        console.warn(`Could not verify header for ${tabName}:`, err);
      }
    }

    return { success: true, createdTabs };
  }

  /**
   * Reads all financial data from the Google Sheet into structured app models.
   */
  async readAllSheetData(spreadsheetId: string, accessToken: string): Promise<{
    accounts: Account[];
    transactions: Transaction[];
    investments: Investment[];
    budgets: CategoryBudget[];
  }> {
    const ranges = [
      `${SHEET_TAB_NAMES.EXPENSES}!A2:K`,
      `${SHEET_TAB_NAMES.ACCOUNTS}!A2:M`,
      `${SHEET_TAB_NAMES.INVESTMENTS}!A2:L`,
      `${SHEET_TAB_NAMES.BUDGETS}!A2:F`,
    ];

    const batchUrl = `${this.baseUrl}/${spreadsheetId}/values:batchGet?${ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')}`;
    const response = await this.fetchWithAuth(batchUrl, accessToken);

    const valueRanges = response.valueRanges || [];
    const expensesRows = valueRanges[0]?.values || [];
    const accountsRows = valueRanges[1]?.values || [];
    const investmentsRows = valueRanges[2]?.values || [];
    const budgetsRows = valueRanges[3]?.values || [];

    // 1. Map Expenses / Transactions
    const transactions: Transaction[] = expensesRows
      .filter((row: any[]) => row && row[0])
      .map((row: any[]) => ({
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
        userId: 'usr_sheets',
      }));

    // 2. Map Accounts
    const accounts: Account[] = accountsRows
      .filter((row: any[]) => row && row[0])
      .map((row: any[]) => ({
        id: String(row[0]),
        name: String(row[1] || 'Account'),
        type: String(row[2] || 'bank') as any,
        balance: Number(row[3]) || 0,
        currency: (row[4] || 'IDR') as 'IDR' | 'USD',
        accountNumber: String(row[5] || ''),
        createdAt: String(row[6] || new Date().toISOString()),
        updatedAt: String(row[7] || new Date().toISOString()),
        userId: 'usr_sheets',
      }));

    // 3. Map Investments
    const investments: Investment[] = investmentsRows
      .filter((row: any[]) => row && row[0])
      .map((row: any[]) => ({
        id: String(row[0]),
        name: String(row[1] || 'Investment'),
        category: String(row[2] || 'Saham') as any,
        units: Number(row[3]) || 1,
        amountInvested: Number(row[4]) || 0,
        currentValue: Number(row[5]) || Number(row[4]) || 0,
        currency: (row[6] || 'IDR') as 'IDR' | 'USD',
        createdAt: String(row[7] || new Date().toISOString()),
        updatedAt: String(row[8] || new Date().toISOString()),
        userId: 'usr_sheets',
      }));

    // 4. Map Budgets
    const budgets: CategoryBudget[] = budgetsRows
      .filter((row: any[]) => row && row[0])
      .map((row: any[]) => ({
        id: String(row[0]),
        category: String(row[1] || 'General'),
        monthlyLimit: Number(row[2]) || 0,
        month: String(row[3] || new Date().toISOString().slice(0, 7)),
        createdAt: String(row[4] || new Date().toISOString()),
        updatedAt: String(row[5] || new Date().toISOString()),
        userId: 'usr_sheets',
      }));

    return { accounts, transactions, investments, budgets };
  }

  /**
   * Appends a new record row to a sheet tab.
   */
  async appendRow(spreadsheetId: string, accessToken: string, tabName: string, values: any[]): Promise<void> {
    const range = `${tabName}!A:A`;
    const url = `${this.baseUrl}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    await this.fetchWithAuth(url, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [values],
      }),
    });
  }

  /**
   * Updates an existing record row matching ID in column A.
   */
  async updateRowById(spreadsheetId: string, accessToken: string, tabName: string, id: string, newValues: any[]): Promise<void> {
    // 1. Fetch column A to locate row index
    const fetchColUrl = `${this.baseUrl}/${spreadsheetId}/values/${tabName}!A:A`;
    const colData = await this.fetchWithAuth(fetchColUrl, accessToken);

    const rows = colData.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r && String(r[0]) === String(id));

    if (rowIndex === -1) {
      // Row not found, fallback to append
      await this.appendRow(spreadsheetId, accessToken, tabName, newValues);
      return;
    }

    const rowNum = rowIndex + 1; // 1-indexed
    const range = `${tabName}!A${rowNum}:${String.fromCharCode(64 + newValues.length)}${rowNum}`;
    const updateUrl = `${this.baseUrl}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

    await this.fetchWithAuth(updateUrl, accessToken, {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [newValues],
      }),
    });
  }

  /**
   * Clears a record row matching ID in column A.
   */
  async deleteRowById(spreadsheetId: string, accessToken: string, tabName: string, id: string): Promise<void> {
    const fetchColUrl = `${this.baseUrl}/${spreadsheetId}/values/${tabName}!A:A`;
    const colData = await this.fetchWithAuth(fetchColUrl, accessToken);

    const rows = colData.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r && String(r[0]) === String(id));

    if (rowIndex === -1) return;

    const rowNum = rowIndex + 1;
    const range = `${tabName}!A${rowNum}:Z${rowNum}`;
    const clearUrl = `${this.baseUrl}/${spreadsheetId}/values/${range}:clear`;

    await this.fetchWithAuth(clearUrl, accessToken, {
      method: 'POST',
    });
  }
}

export const googleSheetsService = new GoogleSheetsService();
