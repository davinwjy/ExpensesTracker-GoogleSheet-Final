/**
 * Idempotency utilities for WealthTrack transactions.
 * Generates unique idempotency keys (hash of timestamp, amount, category, and account)
 * to prevent duplicate submissions across offline, online, Google Sheets, and backend data layers.
 */

export interface IdempotencyInput {
  timestamp?: string | number;
  date: string;
  amount: number | string;
  category: string;
  accountId: string;
  notes?: string;
  type?: string;
}

/**
 * Computes a SHA-256 hash or deterministic fallback from transaction core fields:
 * timestamp (or transaction date), amount, category, and funding account.
 */
export async function generateIdempotencyKey(data: IdempotencyInput): Promise<string> {
  const ts = data.timestamp ? String(data.timestamp).trim() : (data.date || '').trim();
  const amt = Math.abs(Number(data.amount));
  const cat = (data.category || '').trim().toLowerCase();
  const acc = (data.accountId || '').trim();
  const note = (data.notes || '').trim().toLowerCase();
  const type = (data.type || '').trim().toLowerCase();

  const raw = `idemp:${ts}:${amt}:${cat}:${acc}:${note}:${type}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(raw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `idemp_${hex.slice(0, 24)}`;
    } catch {
      // Fallback to synchronous hash below
    }
  }

  return generateIdempotencyKeySync(data);
}

/**
 * Synchronous version using a 64-bit deterministic hash (FNV-1a / Murmur variant).
 */
export function generateIdempotencyKeySync(data: IdempotencyInput): string {
  const ts = data.timestamp ? String(data.timestamp).trim() : (data.date || '').trim();
  const amt = Math.abs(Number(data.amount));
  const cat = (data.category || '').trim().toLowerCase();
  const acc = (data.accountId || '').trim();
  const note = (data.notes || '').trim().toLowerCase();
  const type = (data.type || '').trim().toLowerCase();

  const raw = `idemp:${ts}:${amt}:${cat}:${acc}:${note}:${type}`;

  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x100000001b3);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `idemp_${p1}${p2}`;
}
