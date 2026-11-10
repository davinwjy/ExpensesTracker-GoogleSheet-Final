# Implementation Plan: Google Sheets Storage Integration (Preserving Firebase Login)

This plan integrates Google Sheets as the cloud storage destination for all financial data (expenses, accounts, investments, budgets) while preserving the current Firebase Authentication sign-in system without breaking existing user login workflows.

> [!IMPORTANT]
> **Key Revisions Based on User Feedback**:
> 1. **Preserve Current Sign-In System (100% Firebase Auth)**: The existing login mechanism, authentication screens, and Firebase Auth state remain completely unchanged.
> 2. **Targeted Data Storage Shift**: Only the data storage layer is replaced. All user input, update, and delete actions for expenses, accounts, investments, and budgets will target the user's Google Sheet instead of Firestore.
> 3. **Google Sheet Authorization & Binding**: When connected, the app uses Google OAuth (via Firebase Google Auth Provider or Google OAuth Access Token) to interact with the user's Google Sheet (`https://www.googleapis.com/auth/spreadsheets`).
> 4. **Offline-First & Auto-Sync**: Actions update local storage (`localDb`) immediately for instant UI feedback, and automatically sync queued updates to Google Sheets when online.

---

## 1. Architectural Overview & System Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        WealthTrack Pro Frontend Application                   │
│                                                                               │
│  ┌─────────────────────────────────┐      ┌────────────────────────────────┐  │
│  │   Existing Firebase Auth System │      │  Local DB (IndexedDB Caching)  │  │
│  │   (Login / Auth Modal - UNCHANGED)│    │  (Zero-latency local CRUD)     │  │
│  └────────────────┬────────────────┘      └───────────────┬────────────────┘  │
│                   │ Active User Session                   │                   │
│                   ▼                                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                  Google Sheets Storage & Sync Engine                    │  │
│  │  - Manages Google Sheets OAuth Access Token for Sheet API               │  │
│  │  - Syncs Expenses, Accounts, Investments, and Budgets to Sheet Tabs    │  │
│  │  - Handles offline sync queue (CREATE, UPDATE, DELETE)                  │  │
│  └───────────────────────────────────┬─────────────────────────────────────┘  │
└──────────────────────────────────────┼────────────────────────────────────────┘
                                       │ Google Sheets REST API
                                       │ Authorization: Bearer <Access_Token>
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           User's Personal Google Sheet                        │
│                           "WealthTrack Pro Finance Data"                      │
│                                                                               │
│  ┌─────────────────┬───────────────────┬───────────────────┬───────────────┐  │
│  │  Tab: Expenses  │   Tab: Accounts   │  Tab: Investments │ Tab: Budgets  │  │
│  └─────────────────┴───────────────────┴───────────────────┴───────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component & Service Blueprint

### A. Authentication Layer (Preserved)
- **Firebase Auth (`AuthContext.tsx`, `AuthModal.tsx`)**: Preserved as-is for logging users into WealthTrack Pro.
- **Google Sheets Authorization**: A "Connect Google Sheet" action allows the user to grant Google Sheets permission via a Google Popup / OAuth token grant, or input their Google Sheet ID directly.

### B. Google Sheets Service (`src/lib/googleSheetsService.ts`)
Executes direct REST calls to Google Sheets API:
1. `initSpreadsheet(sheetId)`: Verifies and formats the required sheet tabs:
   - **`Expenses`**: `ID, Date, Amount, Category, Description, AccountID, Type, CreatedAt, UpdatedAt`
   - **`Accounts`**: `ID, Name, Type, Balance, Currency, AccountNumber, CreatedAt, UpdatedAt`
   - **`Investments`**: `ID, Name, Category, Units, BuyPrice, CurrentPrice, Currency, CreatedAt, UpdatedAt`
   - **`Budgets`**: `ID, Category, LimitAmount, Period, CreatedAt, UpdatedAt`
2. `fetchSheetData(sheetId)`: Downloads all finance records on startup into `FinanceContext`.
3. `appendRow(sheetId, tabName, data)`: Appends newly created expenses/accounts/investments.
4. `updateRow(sheetId, tabName, id, data)`: Overwrites matching record row by ID.
5. `deleteRow(sheetId, tabName, id)`: Deletes matching record row by ID.

### C. Offline Sync Queue (`src/lib/sheetsSyncQueue.ts`)
- All write operations (`addExpense`, `updateAccount`, `deleteInvestment`, etc.) immediately write to `localDb`.
- Queues pending mutations when offline and automatically flushes them to Google Sheets upon network reconnection.

### D. UI Controls
- Adds a **"Google Sheet Storage"** section in Settings / Top Header:
  - Connect / Change Google Sheet ID.
  - Manual "Sync Now" button.
  - Connection indicator (`Connected to Google Sheet`, `Offline (Saved locally)`, `Needs Sheet Connection`).

---

## 3. Implementation Steps

1. **OAuth Scope Configuration**: Request Google Sheets API scopes (`spreadsheets` and `drive.file`) so Google API calls are authorized.
2. **Implement Google Sheets REST Client (`googleSheetsService.ts`)**: Built-in sheet creation, tab initialization, row mapping, and batch updates.
3. **Integrate with `FinanceContext.tsx`**: Route all data mutations to update local state + queue to Google Sheets.
4. **Offline Resilience**: Enforce background queue flushing via `sheetsSyncQueue.ts`.
5. **Verification**: Verify that sign in works unchanged, and creating/updating/deleting expenses or accounts updates the user's Google Sheet in real time.
