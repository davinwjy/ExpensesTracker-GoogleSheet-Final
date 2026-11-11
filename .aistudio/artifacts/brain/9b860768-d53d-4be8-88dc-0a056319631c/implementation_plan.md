# Mobile Responsive Layout Refactoring Plan (Dashboard, Expenses, Accounts)

## Objective
Refactor the primary container layouts and card structures across **Dashboard**, **Expenses (Transactions)**, and **Accounts** using responsive CSS Grid and Flexbox patterns (`min-w-0`, `flex-wrap`, and mobile-first breakpoints) so cards and metrics wrap, shrink, or stack cleanly on mobile viewports without horizontal overflow or text collision.

---

## Identified Mobile Layout Issues
1. **Viewport & Main Container (`src/App.tsx`)**:
   - The outer shell and `<main>` container lack `overflow-x-hidden` and strict `min-w-0` constraints, allowing wide child tables or long unbreakable currency strings to trigger horizontal page scrolling on mobile devices.
2. **Dashboard (`src/components/DashboardView.tsx`)**:
   - **Net Worth Quick Actions**: The 4 action buttons (`Add Expense`, `Add Income`, `Invest`, `Transfer`) wrap unevenly on narrow viewports instead of forming a balanced 2×2 mobile grid.
   - **Monthly Summary Cards**: `sm:grid-cols-3` squeezes 3 cards with large IDR currency values on small tablets/large phones; cards also lack `min-w-0` shrinkage guards.
   - **Budget Category Cards**: The bottom spent/limit row (`flex items-center justify-between`) can collide when IDR numbers are large, and the category title uses a hardcoded dark-mode color (`text-zinc-200`) instead of adaptive light/dark classes.
   - **Accounts & Wallets / Recent Transactions Workspace**:
     - Header rows with multiple action buttons (`+ Add Account`, `Manage`) don't wrap on narrow screens.
     - Credit card & PayLater rows inside the Dashboard Accounts list place `Remaining Limit (Used: Rp ...)` side-by-side with the account name, causing text collision on mobile screens.
3. **Expenses / Transactions (`src/components/ExpensesView.tsx`)**:
   - **Transactions Table**: Only renders a 7-column desktop `<table>`, forcing cramped horizontal scrolling on mobile screens instead of stacking into readable mobile transaction cards.
   - **Filter & Control Bar**: Period preset pills (`ALL TIME`, `TODAY`, `THIS MONTH`, `THIS YEAR`) and filtered summary totals (`EXPENSES`, `INFLOWS`, `NET CASH FLOW`) need responsive wrapping/stacking on small screens.
4. **Accounts (`src/components/AccountsView.tsx`)**:
   - **Header Action Bar**: The 3 action buttons (`Fund Investment`, `Transfer`, `Add Account`) need a structured mobile layout (`grid-cols-2 sm:flex`) so they don't clip or overflow.
   - **Overview Stat Cards**: `sm:grid-cols-3` cramps large IDR balances on intermediate screens; changing to `grid-cols-1 md:grid-cols-3` with `min-w-0` prevents overflow.
   - **Credit Card & PayLater Cards**: Internal `USED CREDIT` / `TOTAL LIMIT` sub-grids and `LIMIT` vs `% UTILIZED` rows lack `min-w-0` and `flex-wrap`, causing large IDR numbers to overflow their container on narrow mobile viewports.

---

## Proposed Changes

### 1. Global Shell Container (`src/App.tsx`)
- Add `overflow-x-hidden` to the root application wrapper and `min-w-0 overflow-x-hidden` to `<main>` so all child views remain strictly bounded within the mobile viewport width.

### 2. Dashboard Layout Refactor (`src/components/DashboardView.tsx`)
- **Privacy Shield Banner**: Switch to `flex flex-col sm:flex-row sm:items-center justify-between gap-2` so the reveal button stacks cleanly on mobile.
- **Net Worth Card**:
  - Add `min-w-0` to the flex children and format the 4 quick-action buttons as a `grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto` for equal-width touch targets on mobile.
- **Monthly Summary Metrics**:
  - Upgrade the 3-card grid to `grid grid-cols-1 md:grid-cols-3 gap-3` with `min-w-0` and `break-words` on currency values.
- **Budget Tracker & Category Cards**:
  - Add `min-w-0` to each category card, fix light-mode text contrast on category names (`text-slate-800 dark:text-zinc-200`), and add `flex-wrap gap-1` to the spent/limit footer row.
- **Accounts & Recent Transactions Dual Grid**:
  - Add `min-w-0` to both workspace panels and `flex-wrap gap-2` to card headers.
  - Refactor Account list rows to `flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3` so credit card "Remaining Limit (Used: ...)" stacks cleanly below the account title on mobile instead of colliding horizontally.
  - Refactor Recent Transaction rows to stack or wrap metadata gracefully with `min-w-0` and `shrink-0` on the right-hand amount column.

### 3. Expenses / Transactions Layout Refactor (`src/components/ExpensesView.tsx`)
- **Header & Filter Controls**:
  - Make the top action buttons (`Add Expense`, `Add Income`) full-width 2-column grid buttons on mobile (`grid grid-cols-2 sm:flex w-full sm:w-auto gap-2`).
  - Allow the Period preset buttons (`ALL TIME`, `TODAY`, `THIS MONTH`, `THIS YEAR`) to wrap cleanly (`flex flex-wrap items-center gap-1.5`).
  - Stack the Filtered Summary metrics (`EXPENSES`, `INFLOWS`, `NET CASH FLOW`) in a responsive grid on mobile (`grid grid-cols-1 sm:flex sm:flex-wrap gap-2 sm:gap-4`).
- **Responsive Mobile Card Stack + Desktop Table**:
  - Add a dedicated **Mobile Card Stack (`md:hidden divide-y`)** for viewports `< 768px`, rendering each transaction as a clean 2-row card (Top row: Category/Description, Type badge, and formatted Amount; Bottom row: Date, Account name, Notes preview, and Edit/Delete actions).
  - Keep the high-density 7-column `<table>` for tablet and desktop viewports (`hidden md:table`).

### 4. Accounts Layout Refactor (`src/components/AccountsView.tsx`)
- **Header Action Buttons**:
  - Refactor the 3 header buttons (`Fund Investment`, `Transfer`, `Add Account`) into a responsive `grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto` (with `Add Account` spanning 2 columns on mobile `col-span-2 sm:col-span-1`) so buttons never overflow horizontally.
- **Overview Metric Cards**:
  - Change the 3 summary cards (`Total Liquid Cash`, `Credit Card Debt`, `Paylater Debt`) from `sm:grid-cols-3` to `grid-cols-1 md:grid-cols-3 gap-3` with `min-w-0` on every card.
- **Credit Card, PayLater & Bank Card Grids**:
  - Add `min-w-0` to all card containers and title wrappers (`min-w-0 flex-1`), with `flex-wrap` on badge rows.
  - Update the `USED CREDIT` / `TOTAL LIMIT` inner grid inside Credit Card and PayLater cards to `grid grid-cols-1 sm:grid-cols-2 gap-2` with `min-w-0` and `break-words` so large IDR figures never overflow on narrow screens.
  - Add `flex-wrap gap-1` to the utilization progress bar label rows (`LIMIT` vs `% UTILIZED` and `Billing` vs `Due`).
