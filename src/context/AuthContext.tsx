import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { api, getAuthToken, removeAuthToken } from '../lib/api';
import { isFirebaseActive } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';

const PIN_STORAGE_PREFIX = 'wealthtrack_app_pin_uid_';
const PIN_EMAIL_STORAGE_PREFIX = 'wealthtrack_app_pin_email_';
const PIN_RESET_FLAG_KEY = 'wealthtrack_reset_pin_after_login';
const BACKGROUND_LOCK_MS = 2 * 60 * 1000; // 2 minutes in background
const INACTIVITY_LOCK_MS = 5 * 60 * 1000; // 5 minutes of idle inactivity

function getLocalCachedPin(userId?: string, email?: string): string {
  try {
    if (userId) {
      const byUid = localStorage.getItem(`${PIN_STORAGE_PREFIX}${userId}`);
      if (byUid && /^\d{4}$/.test(byUid.trim())) return byUid.trim();
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const byEmail = localStorage.getItem(`${PIN_EMAIL_STORAGE_PREFIX}${cleanEmail}`);
      if (byEmail && /^\d{4}$/.test(byEmail.trim())) return byEmail.trim();
    }
  } catch {
    // Ignore storage errors
  }
  return '';
}

function setLocalCachedPin(pin: string, userId?: string, email?: string): void {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{4}$/.test(cleanPin)) return;
  try {
    if (userId) {
      localStorage.setItem(`${PIN_STORAGE_PREFIX}${userId}`, cleanPin);
    }
    if (email) {
      localStorage.setItem(`${PIN_EMAIL_STORAGE_PREFIX}${email.trim().toLowerCase()}`, cleanPin);
    }
  } catch {
    // Ignore storage errors
  }
}

function clearLocalCachedPin(userId?: string, email?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(`${PIN_STORAGE_PREFIX}${userId}`);
    }
    if (email) {
      localStorage.removeItem(`${PIN_EMAIL_STORAGE_PREFIX}${email.trim().toLowerCase()}`);
    }
  } catch {
    // Ignore storage errors
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebase: boolean;
  hasPin: boolean;
  isPinLocked: boolean;
  isPinChecking: boolean;
  isChangePinOpen: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: () => Promise<void>;
  verifyPin: (inputPin: string) => boolean;
  savePin: (newPin: string) => Promise<void>;
  lockApp: () => void;
  openChangePin: () => void;
  closeChangePin: () => void;
  forgotPinRelogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFirebase = isFirebaseActive();

  // 4-Digit App PIN State
  const [savedPin, setSavedPin] = useState<string>('');
  const [isPinLocked, setIsPinLocked] = useState<boolean>(true);
  const [isPinChecking, setIsPinChecking] = useState<boolean>(true);
  const [isChangePinOpen, setIsChangePinOpen] = useState<boolean>(false);

  // Tracks if the user just typed email/password in this session (vs opening the app already logged in)
  const justLoggedInWithCredentialsRef = useRef<boolean>(false);
  const hiddenTimestampRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Sync and resolve PIN whenever authenticated user changes
  useEffect(() => {
    let isMounted = true;

    async function resolveUserPin(currentUser: User | null) {
      if (!currentUser) {
        if (!isMounted) return;
        setSavedPin('');
        setIsPinLocked(true);
        setIsPinChecking(false);
        setIsChangePinOpen(false);
        return;
      }

      // Check if user clicked "Forgot PIN? Re-login" prior to logging in
      let isResetFlow = false;
      try {
        if (sessionStorage.getItem(PIN_RESET_FLAG_KEY) === 'true') {
          isResetFlow = true;
          sessionStorage.removeItem(PIN_RESET_FLAG_KEY);
        }
      } catch {
        // Ignore sessionStorage errors
      }

      if (isResetFlow) {
        clearLocalCachedPin(currentUser.id, currentUser.email);
        if (isMounted) {
          setSavedPin('');
          setIsPinLocked(true);
          setIsPinChecking(false);
        }
        justLoggedInWithCredentialsRef.current = false;
        return;
      }

      // 1. Instant 0ms check from local cache
      const localPin = getLocalCachedPin(currentUser.id, currentUser.email);
      const cameFromPasswordLogin = justLoggedInWithCredentialsRef.current;

      if (localPin) {
        if (isMounted) {
          setSavedPin(localPin);
          // If they opened the app already logged in, always lock with PIN.
          // If they just typed their password to log in and already have a PIN, unlock into workspace.
          setIsPinLocked(cameFromPasswordLogin ? false : true);
          setIsPinChecking(false);
        }
      } else {
        if (isMounted) {
          setIsPinChecking(true);
        }
      }

      // 2. Sync latest PIN from Cloud (Firestore)
      if (isFirebase) {
        try {
          const cloudPin = await Promise.race([
            firestoreService.getUserPin(currentUser.id, currentUser.email),
            new Promise<string>((resolve) => setTimeout(() => resolve(''), 2500)),
          ]);

          if (!isMounted) return;

          if (cloudPin && /^\d{4}$/.test(cloudPin)) {
            setLocalCachedPin(cloudPin, currentUser.id, currentUser.email);
            setSavedPin(cloudPin);
            if (!localPin) {
              setIsPinLocked(cameFromPasswordLogin ? false : true);
            }
          } else if (localPin) {
            // Backfill local PIN to Cloud if Cloud did not have it yet
            firestoreService.saveUserPin(currentUser.id, localPin, currentUser.email).catch(() => {});
          } else {
            // No PIN in local or Cloud -> user must set up their 4-digit PIN
            setSavedPin('');
            setIsPinLocked(true);
          }
        } catch {
          if (!isMounted) return;
          if (!localPin) {
            setSavedPin('');
            setIsPinLocked(true);
          }
        } finally {
          if (isMounted) {
            setIsPinChecking(false);
            justLoggedInWithCredentialsRef.current = false;
          }
        }
      } else {
        if (isMounted) {
          if (!localPin) {
            setSavedPin('');
            setIsPinLocked(true);
          }
          setIsPinChecking(false);
          justLoggedInWithCredentialsRef.current = false;
        }
      }
    }

    resolveUserPin(user);

    return () => {
      isMounted = false;
    };
  }, [user, isFirebase]);

  // Initial Auth Session Listener
  useEffect(() => {
    if (isFirebase) {
      const unsub = firestoreService.onAuthChanged((fbUser) => {
        setUser(fbUser);
        setIsLoading(false);
      });
      return () => unsub();
    }

    async function loadUser() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: fetchedUser } = await api.getCurrentUser();
        setUser(fetchedUser);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        removeAuthToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [isFirebase]);

  // Auto-Lock on Backgrounding (2 mins) & Idle Inactivity (5 mins)
  useEffect(() => {
    const hasConfiguredPin = /^\d{4}$/.test(savedPin);
    if (!user || !hasConfiguredPin || isPinLocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimestampRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (
          hiddenTimestampRef.current &&
          Date.now() - hiddenTimestampRef.current >= BACKGROUND_LOCK_MS
        ) {
          setIsPinLocked(true);
          setIsChangePinOpen(false);
        }
        hiddenTimestampRef.current = null;
        lastActivityRef.current = Date.now();
      }
    };

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const idleInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LOCK_MS) {
        setIsPinLocked(true);
        setIsChangePinOpen(false);
      }
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    return () => {
      clearInterval(idleInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [user, savedPin, isPinLocked]);

  const verifyPin = useCallback(
    (inputPin: string): boolean => {
      const cleanInput = String(inputPin || '').trim();
      if (savedPin && cleanInput === savedPin) {
        setIsPinLocked(false);
        lastActivityRef.current = Date.now();
        return true;
      }
      return false;
    },
    [savedPin]
  );

  const savePin = useCallback(
    async (newPin: string): Promise<void> => {
      const cleanPin = String(newPin || '').trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        throw new Error('PIN harus terdiri dari 4 angka.');
      }

      if (user) {
        setLocalCachedPin(cleanPin, user.id, user.email);
        setSavedPin(cleanPin);
        setIsPinLocked(false);
        setIsChangePinOpen(false);
        lastActivityRef.current = Date.now();

        if (isFirebase) {
          await firestoreService.saveUserPin(user.id, cleanPin, user.email);
        }
      }
    },
    [user, isFirebase]
  );

  const lockApp = useCallback(() => {
    if (/^\d{4}$/.test(savedPin)) {
      setIsChangePinOpen(false);
      setIsPinLocked(true);
    } else {
      // If no PIN set yet, open setup
      setIsPinLocked(true);
    }
  }, [savedPin]);

  const openChangePin = useCallback(() => {
    setIsChangePinOpen(true);
  }, []);

  const closeChangePin = useCallback(() => {
    setIsChangePinOpen(false);
  }, []);

  const login = async (email: string, password: string) => {
    justLoggedInWithCredentialsRef.current = true;
    if (isFirebase) {
      const u = await firestoreService.login(email, password);
      setUser(u);
      return;
    }

    const res = await api.login(email, password);
    setUser(res.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    justLoggedInWithCredentialsRef.current = true;
    if (isFirebase) {
      const u = await firestoreService.register(email, password, name);
      setUser(u);
      return;
    }

    const res = await api.register(email, password, name);
    setUser(res.user);
  };

  const logout = useCallback(() => {
    justLoggedInWithCredentialsRef.current = false;
    setIsChangePinOpen(false);
    setIsPinLocked(true);
    if (isFirebase) {
      firestoreService.logout();
      setUser(null);
      return;
    }

    removeAuthToken();
    setUser(null);
  }, [isFirebase]);

  const forgotPinRelogin = useCallback(() => {
    try {
      sessionStorage.setItem(PIN_RESET_FLAG_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    if (user) {
      clearLocalCachedPin(user.id, user.email);
    }
    logout();
  }, [user, logout]);

  const quickDemoLogin = async () => {
    const demoEmail = 'davin@wealthtrack.app';
    const demoPassword = 'password123';
    try {
      await login(demoEmail, demoPassword);
    } catch {
      await register(demoEmail, demoPassword, 'Davin Wijaya');
    }
  };

  const hasPin = /^\d{4}$/.test(savedPin);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isFirebase,
        hasPin,
        isPinLocked,
        isPinChecking,
        isChangePinOpen,
        login,
        register,
        logout,
        quickDemoLogin,
        verifyPin,
        savePin,
        lockApp,
        openChangePin,
        closeChangePin,
        forgotPinRelogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
