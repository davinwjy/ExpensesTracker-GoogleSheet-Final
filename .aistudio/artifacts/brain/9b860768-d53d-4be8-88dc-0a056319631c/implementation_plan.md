# Implementation Plan: Fix Financial Numbers Glitching When Web App URL is Empty

## Root Cause Analysis
When the **Google Apps Script Web App URL is configured**, all financial data is fetched in a single atomic payload via `readAllData(appsScriptUrl)`, resulting in zero glitching.

However, when the **Web App URL is NOT filled**, the application falls back to Firestore real-time synchronization (`firestoreService.subscribeToUserData`). This triggers severe visual glitching of dashboard numbers (Net Worth, Investments, Expenses, and Inflow) due to three interacting issues:

1. **Unbatched Multi-Listener Race Conditions**:
   `firestoreService.subscribeToUserData` attaches 4 independent Firestore `onSnapshot` listeners (`accounts`, `transactions`, `investments`, and `settings`). Each listener immediately invoked `trigger()`. When `accounts` arrived first, `currentInvestments` and `currentTransactions` were still empty arrays (`[]`). `FinanceContext` immediately computed stats with `0` investments and `0` transactions, causing Net Worth and Investments to plunge to zero. Milliseconds later, `investments` arrived and jumped the numbers back up. Milliseconds later, `transactions` arrived and jumped monthly expenses and inflow from zero back up. This caused 3–4 rapid visible jumps within ~100ms.

2. **Re-subscription Loop via `usdIdrRate` in Effect Dependencies**:
   In `FinanceContext.tsx` line 949, the subscription `useEffect` included `usdIdrRate` in its dependency array `[isFirebase, user, appsScriptUrl, spreadsheetId, usdIdrRate]`. When Firestore settings updated `usdIdrRate`, the effect re-triggered, tore down all 4 listeners, re-subscribed, and restarted the empty-state flicker cycle.

3. **Loss of Cached Snapshot State During Asynchronous Handshake**:
   Even though `cachedSnapshot` is loaded on initial render, `subscribeToUserData` initialized its internal state with empty arrays (`let currentAccounts = []`), temporarily wiping out cached data before all snapshots settled.

---

## User Review Required

> [!NOTE]
> All existing functionality (Google Apps Script sync, offline caching, Firebase sync, and lock rules) will remain 100% intact. We are making data delivery atomic and smooth.

No functional breaking changes or configuration changes required from the user.

---

## Proposed Changes

### 1. Atomic Snapshot Synchronization & Debounce in `src/lib/firestoreService.ts`
- **Initial Load Barrier**: Track readiness of all 4 collections (`accountsReady`, `transactionsReady`, `investmentsReady`, `settingsReady`). Wait until all 4 initial snapshots have resolved (with a 120ms safety fallback timeout so an empty collection never blocks initial display) before emitting the first snapshot.
- **Microtask / Frame Debouncing**: Debounce `trigger()` by 16ms (1 animation frame) so that rapid consecutive snapshot events (e.g. initial burst or multi-document writes) coalesce into a single atomic update.
- **Initial State Seeding**: Pre-populate `currentAccounts`, `currentTransactions`, and `currentInvestments` from local snapshot cache if available so there is never an intermediate empty array emitted to React.

### 2. Stabilize Realtime Subscription in `src/context/FinanceContext.tsx`
- **Remove `usdIdrRate` from `useEffect` Dependencies**:
  Change `useEffect(..., [isFirebase, user, appsScriptUrl, spreadsheetId])` so exchange rate updates do not destroy and re-create Firestore subscriptions.
- **Atomic State Dispatch**:
  Apply incoming accounts, transactions, investments, and settings in a single coherent render pass using the incoming snapshot's rate directly for `computeStats`.
- **Preserve Non-Empty Data During Connection**:
  Guard against replacing existing populated cache with empty arrays unless the Firestore collection is confirmed empty by a fully resolved snapshot.

---

## Verification Plan

### Automated Verification
- Run `compile_applet` to ensure TypeScript compilation passes with zero errors.
- Run `lint_applet` to ensure ESLint passes with zero syntax or import errors.

### Manual / Browser Verification
1. Open the application with **no Apps Script URL** (default state).
2. Hard reload the page (F5 / browser refresh).
3. Verify that Net Worth, Liquid Cash, Total Investments, and Monthly Expenses appear smoothly from the cached snapshot and stay completely stable without any numbers jumping, flashing to 0, or flickering.
4. Verify that adding a transaction, updating an account, or connecting the Web App URL continues to work seamlessly.
