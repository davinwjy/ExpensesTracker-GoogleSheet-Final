import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { extractSpreadsheetId } from './googleSheetsService';

const SPREADSHEET_ID_STORAGE_KEY = 'wealthtrack_spreadsheet_id';

let cachedAccessToken: string | null = null;

export function getStoredSpreadsheetId(): string {
  try {
    return localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSpreadsheetId(inputUrlOrId: string): string {
  const cleanId = extractSpreadsheetId(inputUrlOrId);
  try {
    if (cleanId) {
      localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, cleanId);
    } else {
      localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return cleanId;
}

export function removeSpreadsheetId() {
  try {
    localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
  } catch {}
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

/**
 * Triggers Google Sign-In Popup to acquire OAuth Access Token for Google Sheets API.
 */
export async function requestGoogleSheetsAccess(): Promise<{ accessToken: string; userEmail?: string }> {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not initialized. Please ensure Firebase config is set.');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({
    prompt: 'consent',
  });

  const result = await signInWithPopup(firebaseAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error('Failed to acquire Google Sheets OAuth access token.');
  }

  cachedAccessToken = credential.accessToken;
  return {
    accessToken: credential.accessToken,
    userEmail: result.user?.email || undefined,
  };
}
