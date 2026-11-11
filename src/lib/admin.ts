import { User } from '../types';

export const PRIMARY_ADMIN_EMAIL = 'davinwijaya16@gmail.com';

export const DEFAULT_ADMIN_EMAILS = [
  PRIMARY_ADMIN_EMAIL,
];

const ADMIN_EMAILS_STORAGE_KEY = 'wealthtrack_admin_emails';

export function getCustomAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_EMAILS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((e: string) => String(e).toLowerCase().trim())
          .filter(Boolean);
        return Array.from(new Set([PRIMARY_ADMIN_EMAIL, ...cleaned]));
      }
    }
  } catch {
    // ignore storage parse errors
  }
  return [...DEFAULT_ADMIN_EMAILS];
}

export function saveAdminEmails(emails: string[]): string[] {
  const clean = Array.from(
    new Set([
      PRIMARY_ADMIN_EMAIL,
      ...emails.map((e) => String(e).toLowerCase().trim()).filter(Boolean),
    ])
  );
  try {
    localStorage.setItem(ADMIN_EMAILS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage errors
  }
  return clean;
}

export function addCustomAdminEmail(email: string): string[] {
  const clean = String(email).toLowerCase().trim();
  if (!clean) return getCustomAdminEmails();
  const current = getCustomAdminEmails();
  return saveAdminEmails([...current, clean]);
}

export function removeCustomAdminEmail(email: string): string[] {
  const clean = String(email).toLowerCase().trim();
  if (clean === PRIMARY_ADMIN_EMAIL) {
    return getCustomAdminEmails();
  }
  const current = getCustomAdminEmails().filter((e) => e.toLowerCase() !== clean);
  return saveAdminEmails(current);
}

export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;

  const email = user.email.toLowerCase().trim();
  if (email === PRIMARY_ADMIN_EMAIL || DEFAULT_ADMIN_EMAILS.includes(email)) return true;
  if (user.role === 'admin') return true;

  const allowed = getCustomAdminEmails();
  return allowed.includes(email);
}
