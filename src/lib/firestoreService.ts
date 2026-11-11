import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from './firebase';
import { User, Account, Transaction, Investment, UserSettings, CategoryBudget } from '../types';
import { isUserAdmin } from './admin';

/**
 * Recursively removes all properties with undefined values.
 * Firestore throws a runtime error if any field in a document is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const firestoreService = {
  // ---------------- AUTHENTICATION ----------------
  async register(email: string, password: string, name?: string): Promise<User> {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error('Firebase is not configured yet');
    }

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const fbUser = cred.user;

    const displayName = name ? name.trim() : email.split('@')[0];
    await updateProfile(fbUser, { displayName });

    const user: User = {
      id: fbUser.uid,
      email: fbUser.email || email,
      name: displayName,
      role: isUserAdmin({ id: fbUser.uid, email: fbUser.email || email, name: displayName }) ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    // Save user doc
    await setDoc(doc(firestoreDb, 'users', fbUser.uid), sanitizeForFirestore(user));

    // Create starter accounts & settings if new
    await this.seedInitialUserData(fbUser.uid);

    return user;
  },

  async login(email: string, password: string): Promise<User> {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error('Firebase is not configured yet');
    }

    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const fbUser = cred.user;

    const uEmail = fbUser.email || email;
    const uName = fbUser.displayName || email.split('@')[0];

    return {
      id: fbUser.uid,
      email: uEmail,
      name: uName,
      role: isUserAdmin({ id: fbUser.uid, email: uEmail, name: uName }) ? 'admin' : 'user',
      createdAt: fbUser.metadata.creationTime,
    };
  },

  async logout(): Promise<void> {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
  },

  onAuthChanged(callback: (user: User | null) => void): Unsubscribe {
    if (!firebaseAuth) {
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(firebaseAuth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const uEmail = fbUser.email || '';
        const uName = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
        callback({
          id: fbUser.uid,
          email: uEmail,
          name: uName,
          role: isUserAdmin({ id: fbUser.uid, email: uEmail, name: uName }) ? 'admin' : 'user',
          createdAt: fbUser.metadata.creationTime,
        });
      } else {
        callback(null);
      }
    });
  },

  // ---------------- SEED STARTER DATA ----------------
  async seedInitialUserData(userId: string): Promise<void> {
    if (!firestoreDb) return;

    // Check if user already has accounts
    const accSnap = await getDocs(query(collection(firestoreDb, 'accounts'), where('userId', '==', userId)));
    if (!accSnap.empty) return;

    const now = new Date().toISOString();
    const starterAccounts: Account[] = [
      {
        id: 'acc_' + Date.now() + '_1',
        userId,
        name: 'BCA Main',
        type: 'bank',
        balance: 10000000,
        accountNumber: '•••• 4821',
        color: '#3b82f6',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'acc_' + Date.now() + '_2',
        userId,
        name: 'Cash Wallet',
        type: 'cash',
        balance: 500000,
        color: '#10b981',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const acc of starterAccounts) {
      await setDoc(doc(firestoreDb, 'accounts', acc.id), sanitizeForFirestore(acc));
    }

    const initialSettings: UserSettings = {
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
      appsScriptUrl: '',
    };
    await setDoc(doc(firestoreDb, 'settings', userId), sanitizeForFirestore(initialSettings));
  },

  // ---------------- REALTIME DATA SUBSCRIPTION ----------------
  subscribeToUserData(
    userId: string,
    onData: (data: {
      accounts: Account[];
      transactions: Transaction[];
      investments: Investment[];
      settings: UserSettings;
    }) => void
  ): () => void {
    if (!firestoreDb) return () => {};

    // Pre-populate from existing cached snapshot if present to prevent 0-value glitch
    let cachedSnapshot: any = null;
    try {
      const raw = localStorage.getItem('wealthtrack_financial_snapshot_v1');
      if (raw) cachedSnapshot = JSON.parse(raw);
    } catch {
      // Ignore parse failure
    }

    let currentAccounts: Account[] = cachedSnapshot?.accounts || [];
    let currentTransactions: Transaction[] = cachedSnapshot?.transactions || [];
    let currentInvestments: Investment[] = cachedSnapshot?.investments || [];
    let currentSettings: UserSettings = cachedSnapshot?.settings || {
      userId,
      usdIdrRate: cachedSnapshot?.usdIdrRate || 15850,
      privacyModeDefault: false,
      theme: 'dark',
    };

    let accountsReady = false;
    let transactionsReady = false;
    let investmentsReady = false;
    let settingsReady = false;
    let initialSettled = false;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const emitData = () => {
      onData({
        accounts: [...currentAccounts],
        transactions: [...currentTransactions],
        investments: [...currentInvestments],
        settings: { ...currentSettings },
      });
    };

    const trigger = () => {
      // During initial load, only emit once all 4 collections have fired at least once,
      // or once initialSettled is true via fallback timer.
      if (!initialSettled) {
        if (accountsReady && transactionsReady && investmentsReady && settingsReady) {
          initialSettled = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
        } else {
          // Still waiting for initial batch of collections to resolve
          return;
        }
      }

      // Debounce updates by 16ms (1 animation frame) so rapid multi-listener events coalesce into 1 atomic render
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        emitData();
      }, 16);
    };

    // Safety fallback: if a collection is empty or takes longer to respond,
    // settle after 120ms so the user is never stuck without realtime data.
    fallbackTimer = setTimeout(() => {
      if (!initialSettled) {
        initialSettled = true;
        trigger();
      }
    }, 120);

    // 1. Accounts listener
    const qAccounts = query(collection(firestoreDb, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      currentAccounts = snapshot.docs.map((d) => d.data() as Account);
      accountsReady = true;
      trigger();
    });

    // 2. Transactions listener
    const qTransactions = query(collection(firestoreDb, 'transactions'), where('userId', '==', userId));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Transaction);
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      currentTransactions = list;
      transactionsReady = true;
      trigger();
    });

    // 3. Investments listener
    const qInvestments = query(collection(firestoreDb, 'investments'), where('userId', '==', userId));
    const unsubInvestments = onSnapshot(qInvestments, (snapshot) => {
      currentInvestments = snapshot.docs.map((d) => d.data() as Investment);
      investmentsReady = true;
      trigger();
    });

    // 4. Settings listener
    const docSettings = doc(firestoreDb, 'settings', userId);
    const unsubSettings = onSnapshot(docSettings, (snapshot) => {
      if (snapshot.exists()) {
        currentSettings = snapshot.data() as UserSettings;
      }
      settingsReady = true;
      trigger();
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      unsubAccounts();
      unsubTransactions();
      unsubInvestments();
      unsubSettings();
    };
  },

  // ---------------- FETCH ALL USER DATA FOR MIGRATION ----------------
  async fetchAllUserData(userId: string): Promise<{
    accounts: Account[];
    transactions: Transaction[];
    investments: Investment[];
    budgets: CategoryBudget[];
  }> {
    if (!firestoreDb) return { accounts: [], transactions: [], investments: [], budgets: [] };

    try {
      const [accSnap, txSnap, invSnap, bgtSnap] = await Promise.all([
        getDocs(query(collection(firestoreDb, 'accounts'), where('userId', '==', userId))),
        getDocs(query(collection(firestoreDb, 'transactions'), where('userId', '==', userId))),
        getDocs(query(collection(firestoreDb, 'investments'), where('userId', '==', userId))),
        getDocs(query(collection(firestoreDb, 'budgets'), where('userId', '==', userId))),
      ]);

      const accounts = accSnap.docs.map((d) => d.data() as Account);
      const transactions = txSnap.docs.map((d) => d.data() as Transaction);
      const investments = invSnap.docs.map((d) => d.data() as Investment);
      const budgets = bgtSnap.docs.map((d) => d.data() as CategoryBudget);

      return { accounts, transactions, investments, budgets };
    } catch (err) {
      console.warn('fetchAllUserData error:', err);
      return { accounts: [], transactions: [], investments: [], budgets: [] };
    }
  },

  // ---------------- CRUD ACTIONS ----------------
  async saveAccount(account: Account): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'accounts', account.id), sanitizeForFirestore(account));
  },

  async deleteAccount(accountId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'accounts', accountId));
  },

  async saveTransaction(transaction: Transaction): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'transactions', transaction.id), sanitizeForFirestore(transaction));
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'transactions', transactionId));
  },

  async saveInvestment(investment: Investment): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'investments', investment.id), sanitizeForFirestore(investment));
  },

  async deleteInvestment(investmentId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'investments', investmentId));
  },

  async saveBudget(budget: any): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'budgets', budget.id), sanitizeForFirestore(budget));
  },

  async deleteBudget(budgetId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'budgets', budgetId));
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'settings', settings.userId), sanitizeForFirestore(settings));
  },

  async saveUserAppsScriptUrl(userId: string, url: string): Promise<void> {
    if (!firestoreDb || !userId) return;
    const cleanUrl = (url || '').trim();
    try {
      // 1. Update settings doc
      await setDoc(
        doc(firestoreDb, 'settings', userId),
        sanitizeForFirestore({ appsScriptUrl: cleanUrl, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
      // 2. Also update users doc for fast auth-time retrieval
      await setDoc(
        doc(firestoreDb, 'users', userId),
        sanitizeForFirestore({ appsScriptUrl: cleanUrl, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to bind Apps Script URL to Firestore:', err);
    }
  },

  // ---------------- MIGRATE LOCAL DATA TO FIRESTORE ----------------
  async uploadLocalDataToFirestore(userId: string): Promise<number> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    const storeRaw = localStorage.getItem('wealthtrack_offline_db');
    if (!storeRaw) return 0;

    let count = 0;
    try {
      const store = JSON.parse(storeRaw);
      const accounts = (store.accounts || []).map((a: any) => ({ ...a, userId }));
      const transactions = (store.transactions || []).map((t: any) => ({ ...t, userId }));
      const investments = (store.investments || []).map((i: any) => ({ ...i, userId }));

      for (const a of accounts) {
        await setDoc(doc(firestoreDb, 'accounts', a.id), sanitizeForFirestore(a));
        count++;
      }
      for (const t of transactions) {
        await setDoc(doc(firestoreDb, 'transactions', t.id), sanitizeForFirestore(t));
        count++;
      }
      for (const i of investments) {
        await setDoc(doc(firestoreDb, 'investments', i.id), sanitizeForFirestore(i));
        count++;
      }
    } catch (err) {
      console.warn('Migration error:', err);
    }
    return count;
  },
};
