# Alignment of PayLater with Credit Card Mechanics (`cc_debt` & Bill Payment)

Align PayLater accounts to operate identically to Credit Card accounts across WealthTrack Pro. When spending via PayLater, transactions will be categorized as `cc_debt` (increasing debt liability, excluded from cash expenses and monthly budget totals). When paying off PayLater bills via the Pay Bill modal, out-of-pocket payments from bank/cash accounts will be registered as actual cash `expense` (including settlement admin fees).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All PayLater spending will now be categorized as `cc_debt` and excluded from cash expense totals. Only paying off PayLater bills from a bank or cash wallet will count as actual cash expense.

- **Confirmed Requirement 1**: PayLater spending (`paylater`) uses `cc_debt` type instead of `expense`, increasing PayLater debt liability without deducting from cash expenses or monthly budgets.
- **Confirmed Requirement 2**: Paying PayLater bills from bank/cash accounts creates an `expense` transaction (plus any optional admin fee), which correctly records out-of-pocket cash outflow.
- **Confirmed Requirement 3**: Enable "Pay Bill" UI action button on both Credit Card and PayLater account cards in the Accounts view and quick navigation drawers.

---

## 1. Overview & Core Concept

- **Goal**: Standardize liability account mechanics across Credit Cards and PayLater accounts (e.g. GoPayLater, ShopeePayLater, Kredivo, Akulaku).
- **Behavior Breakdown**:
  - **PayLater Purchase / Spending**: Registers as `cc_debt` (debt balance increase). Does NOT decrease cash balance or count toward cash expenses.
  - **PayLater Bill Payment**: Registers as `expense` from a liquid funding account (BCA, Mandiri, Cash, etc.) to settle PayLater debt, recording actual cash outflow.

---

## 2. User Experience & Visual Design

- **Accounts View**:
  - Show "Pay Bill" action button for both `credit_card` and `paylater` account cards.
  - Display used credit limit vs remaining credit limit for PayLater accounts with limit caps.
- **Pay Bill Modal**:
  - Title adapts dynamically: "Pay Credit Card / PayLater Bill".
  - Select dropdown displays all active Credit Card and PayLater accounts needing bill settlement.
  - Dynamic memo & category generation ("PayLater Payment (Kredivo)" or "Credit Card Payment (BCA Visa)").
- **Transactions & Dashboard View**:
  - Render `CC DEBT` badge in amber/purple pill format for PayLater spending.
  - Sort transactions newest date first.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Shared `cc_debt` Transaction Type**:
  - *Chosen Approach*: Reuse `cc_debt` transaction type for both Credit Card and PayLater spending rather than creating a duplicate `paylater_debt` type.
  - *Why*: Maintains clean schema compatibility with Google Sheets, Apps Script backend, and existing analytics without requiring database migration.

- **Decision 2: Universal Liability Bill Payment Handler**:
  - *Chosen Approach*: Extend `payCreditCardBill` to accept both `credit_card` and `paylater` accounts.
  - *Why*: Avoids duplicating bill payment state management while ensuring consistent admin fee calculation and sheet synchronization.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           PAYLATER WORKFLOW ENGINE                             │
└────────────────────────────────────────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
 ┌───────────────┐                                              ┌───────────────┐
 │ PAYLATER SPEND│                                              │ PAYLATER BILL │
 └───────────────┘                                              └───────────────┘
        │                                                               │
        ▼                                                               ▼
  Type: cc_debt                                                  Type: expense
  Debt Balance += Amount                                         Bank Cash -= (Amount + Admin)
  Excludes from Cash Expenses                                    PayLater Debt -= Amount
  Synced to Sheets (Column 7)                                    Counts in Cash Expenses
```

### Component & File Mapping

1. `src/context/FinanceContext.tsx`:
   - Verify `addTransaction` and `updateTransaction` automatically resolve `effectiveType = 'cc_debt'` for `targetAcc.type === 'paylater' || targetAcc.type === 'credit_card'` when type is spending/expense.
   - Update `payCreditCardBill` validation to allow target account type `credit_card` OR `paylater`.
   - Update sheet sync and Firestore persistence for PayLater bill settlements.

2. `src/lib/localDb.ts`:
   - Update `payCreditCardBill` in `localDb` to validate and process bill payments for both `credit_card` and `paylater` accounts.

3. `src/components/Modals/PayBillModal.tsx`:
   - Filter selectable liability accounts to include `a.type === 'credit_card' || a.type === 'paylater'`.
   - Adapt title, helper text, and notes placeholder for PayLater bill settlements.

4. `src/components/AccountsView.tsx`:
   - Display "Pay Bill" button for PayLater cards alongside Credit Cards.
