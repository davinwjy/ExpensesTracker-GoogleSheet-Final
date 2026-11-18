import { ScannedReceiptResult } from '../types';

type TesseractWorker = import('tesseract.js').Worker;

let cachedWorkerPromise: Promise<TesseractWorker> | null = null;

async function getOcrWorker(): Promise<TesseractWorker> {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      const { createWorker, OEM } = await import('tesseract.js');
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        workerBlobURL: true,
      });
      await worker.setParameters({
        preserve_interword_spaces: '1',
      });
      return worker;
    })().catch((err) => {
      cachedWorkerPromise = null;
      throw err;
    });
  }
  return cachedWorkerPromise;
}

const KNOWN_MERCHANTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bindomaret\b/i, label: 'Indomaret' },
  { pattern: /\balfamart\b/i, label: 'Alfamart' },
  { pattern: /\balfamidi\b/i, label: 'Alfamidi' },
  { pattern: /\bsuperindo\b/i, label: 'Superindo' },
  { pattern: /\bhypermart\b/i, label: 'Hypermart' },
  { pattern: /\branch\s*market\b/i, label: 'Ranch Market' },
  { pattern: /\bfamily\s*mart\b/i, label: 'FamilyMart' },
  { pattern: /\blawson\b/i, label: 'Lawson' },
  { pattern: /\bcircle\s*k\b/i, label: 'Circle K' },
  { pattern: /\bstarbucks\b/i, label: 'Starbucks' },
  { pattern: /\bfore\s*coffee\b/i, label: 'Fore Coffee' },
  { pattern: /\bkenangan\b/i, label: 'Kopi Kenangan' },
  { pattern: /\bjanji\s*jiwa\b/i, label: 'Janji Jiwa' },
  { pattern: /\bhokben\b/i, label: 'HokBen' },
  { pattern: /\bmcdonald/i, label: "McDonald's" },
  { pattern: /\bkfc\b/i, label: 'KFC' },
  { pattern: /\bsolaria\b/i, label: 'Solaria' },
  { pattern: /\bmixue\b/i, label: 'Mixue' },
  { pattern: /\bgofood\b/i, label: 'GoFood' },
  { pattern: /\bgrabfood\b/i, label: 'GrabFood' },
  { pattern: /\bshopeefood\b/i, label: 'ShopeeFood' },
  { pattern: /\bgojek|goride|gocar\b/i, label: 'Gojek' },
  { pattern: /\bgrab\b/i, label: 'Grab' },
  { pattern: /\bblue\s*bird\b/i, label: 'Bluebird' },
  { pattern: /\bpertamina|spbu\b/i, label: 'Pertamina Fuel' },
  { pattern: /\bshell\b/i, label: 'Shell Fuel' },
  { pattern: /\blaundry|londri|cuci\s*setrika|dry\s*clean\b/i, label: 'Laundry' },
  { pattern: /\bkimia\s*farma\b/i, label: 'Kimia Farma' },
  { pattern: /\bk[\s-]?24\b/i, label: 'Apotek K-24' },
  { pattern: /\bguardian\b/i, label: 'Guardian' },
  { pattern: /\bwatsons\b/i, label: 'Watsons' },
  { pattern: /\bpln\b/i, label: 'PLN Electricity' },
  { pattern: /\bpdam\b/i, label: 'PDAM Water' },
  { pattern: /\bbpjs\b/i, label: 'BPJS' },
  { pattern: /\btelkomsel\b/i, label: 'Telkomsel' },
  { pattern: /\bshopee\b/i, label: 'Shopee' },
  { pattern: /\btokopedia\b/i, label: 'Tokopedia' },
  { pattern: /\buniglo|uniqlo\b/i, label: 'Uniqlo' },
  { pattern: /\bgramedia\b/i, label: 'Gramedia' },
  { pattern: /\bcinema\s*xxi|xxi\b/i, label: 'Cinema XXI' },
  { pattern: /\bcgv\b/i, label: 'CGV Cinema' },
  { pattern: /\bgopay\b/i, label: 'GoPay Payment' },
  { pattern: /\bovo\b/i, label: 'OVO Payment' },
  { pattern: /\bdana\b/i, label: 'DANA Payment' },
  { pattern: /\bqris\b/i, label: 'QRIS Payment' },
  { pattern: /\bbca\b/i, label: 'BCA Transfer / QRIS' },
  { pattern: /\bmandiri\b/i, label: 'Mandiri Payment' },
];

const CATEGORY_KEYWORD_RULES: Array<{ targets: string[]; pattern: RegExp }> = [
  {
    targets: ['Personal Care', 'Perawatan', 'Laundry'],
    pattern:
      /\b(laundry|londri|cuci|setrika|dry\s*clean|salon|barber|pangkas|spa|skincare|kosmetik|parfum|shampoo|sabun|toiletries|facial|haircut)\b/i,
  },
  {
    targets: ['Groceries', 'Belanja Harian', 'Minimarket', 'Supermarket'],
    pattern:
      /\b(indomaret|alfamart|alfamidi|superindo|hypermart|transmart|ranch\s*market|lotte|minimarket|supermarket|grocery|groceries|sembako|beras|galon|aqua|le\s*minerale|sayur|buah)\b/i,
  },
  {
    targets: ['Food & Dining', 'Food', 'Dining', 'Makan'],
    pattern:
      /\b(cafe|coffee|kopi|resto|restaurant|warung|bakery|roti|nasi|ayam|mie|bakso|soto|sate|gofood|grabfood|shopeefood|starbucks|mcdonald|kfc|hokben|solaria|mixue|fore|kenangan|janji\s*jiwa|makan|minum|boba|tea|kitchen|bistro|dine)\b/i,
  },
  {
    targets: ['Transportation', 'Transport', 'Transportasi'],
    pattern:
      /\b(grab|gojek|goride|gocar|bluebird|blue\s*bird|taxi|taksi|pertamina|spbu|shell|bensin|bbm|pertalite|pertamax|solar|tol|toll|parkir|parking|kai|kereta|tiket|pesawat|garuda|citilink|airasia|transjakarta|mrt|krl)\b/i,
  },
  {
    targets: ['Bills & Utilities', 'Bills', 'Utilities', 'Tagihan'],
    pattern:
      /\b(pln|listrik|token|kwh|pdam|wifi|indihome|biznet|myrepublic|first\s*media|telkomsel|indosat|xl\s*axiata|tri|smartfren|pulsa|paket\s*data|bpjs|tagihan|internet|netflix|spotify|youtube|icloud|google\s*one)\b/i,
  },
  {
    targets: ['Health & Fitness', 'Health', 'Kesehatan'],
    pattern:
      /\b(apotek|apotik|pharmacy|kimia\s*farma|k[\s-]?24|guardian|watsons|klinik|clinic|rumah\s*sakit|hospital|dokter|doctor|obat|vitamin|gym|fitness|pilates)\b/i,
  },
  {
    targets: ['Housing & Rent', 'Housing', 'Rent'],
    pattern:
      /\b(sewa|rent|kost|kosan|kontrakan|apartemen|apartment|ipl|service\s*charge|tukang|perbaikan|service\s*ac)\b/i,
  },
  {
    targets: ['Shopping', 'Belanja'],
    pattern:
      /\b(tokopedia|shopee|lazada|blibli|zalora|uniqlo|zara|matahari|ikea|ace\s*hardware|azko|mr\.?\s*diy|mall|store|outlet|fashion|apparel|elektronik)\b/i,
  },
  {
    targets: ['Entertainment', 'Hiburan'],
    pattern:
      /\b(cinema|xxi|cgv|cinepolis|bioskop|tiket\s*nonton|game|steam|playstation|nintendo|karaoke|billiard|wisata)\b/i,
  },
  {
    targets: ['Education', 'Pendidikan'],
    pattern: /\b(gramedia|buku|book|kursus|course|udemy|coursera|sekolah|kuliah|spp|tuition)\b/i,
  },
];

const IGNORE_AMOUNT_LINE_REGEX =
  /\b(tunai|cash|kembali|kembalian|change|sub\s*total|subtotal|hemat|diskon|discount|potongan|poin|point|saldo|balance|limit|no\.?\s*rek|rekening|va\b|card|kartu|telp|phone|hp\b|npwp|qty|item|pcs|kg|gram)\b/i;

const PRIORITY_TOTAL_LABEL_REGEX =
  /\b(grand\s*total|total\s*bayar|total\s*tagihan|total\s*pembayaran|total\s*belanja|total\s*harga|jumlah\s*bayar|nominal\s*transaksi|nominal\s*transfer|amount\s*paid|net\s*total)\b/i;

const SECONDARY_TOTAL_LABEL_REGEX =
  /\b(total|bayar|dibayar|tagihan|jumlah|nominal|pembayaran\s*berhasil|transaksi\s*berhasil|paid)\b/i;

function parseIdrCandidatesFromLine(line: string): number[] {
  // Normalize common OCR typos in currency contexts (O -> 0 inside digit groups)
  const cleaned = line
    .replace(/(?<=\d)[Oo](?=[\d.,])/g, '0')
    .replace(/(?<=[\d.,])[Oo](?=\d)/g, '0')
    .replace(/[Il](?=\d{2,})/g, '1');

  const results: number[] = [];
  // Match formatted IDR numbers (e.g. "Rp 125.000", "45,000.00", "125.000", "85000")
  const regex = /(?:rp\.?|idr)?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{4,8})(?!\d)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    let rawToken = match[1];
    if (!rawToken) continue;

    // Strip decimal cents like ".00" or ",00" at the end
    const centMatch = rawToken.match(/^(.+?)([.,]\d{2})$/);
    if (centMatch) {
      const before = centMatch[1];
      // Only strip if the remaining part already has thousands grouping or is clearly cents
      if (/[.,]\d{3}/.test(before) || Number(before.replace(/[.,]/g, '')) >= 100) {
        rawToken = before;
      }
    }

    const hasSeparator = /[.,]/.test(rawToken);
    const digitsOnly = rawToken.replace(/[.,]/g, '');
    if (!/^\d+$/.test(digitsOnly)) continue;

    // Skip years like 2024, 2025, 2026 unless formatted with separator or Rp/IDR prefix
    const numVal = Number(digitsOnly);
    const hasCurrencyPrefix =
      /^(?:rp\.?|idr)/i.test(match[0]) ||
      /(?:rp\.?|idr)\s*$/i.test(cleaned.slice(Math.max(0, match.index - 6), match.index));

    if (!hasCurrencyPrefix && !hasSeparator && numVal >= 1990 && numVal <= 2035) {
      continue;
    }

    // Skip tiny or absurdly huge numbers (e.g., phone numbers, reference numbers)
    if (numVal < 500 || numVal > 500_000_000) continue;
    // Plain unseparated 8+ digit strings without Rp/IDR are usually timestamps/refs
    if (!hasCurrencyPrefix && !hasSeparator && digitsOnly.length >= 8) continue;

    results.push(numVal);
  }

  return results;
}

function extractAmountFromOcrText(text: string): number | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let bestAmount: number | null = null;
  let bestScore = -1;

  lines.forEach((line, idx) => {
    const isIgnoredLine = IGNORE_AMOUNT_LINE_REGEX.test(line);
    const isPriorityLabel = PRIORITY_TOTAL_LABEL_REGEX.test(line);
    const isSecondaryLabel = !isPriorityLabel && SECONDARY_TOTAL_LABEL_REGEX.test(line);
    const hasCurrency = /\b(rp|idr)\b/i.test(line);

    let candidates = parseIdrCandidatesFromLine(line);
    // Sometimes the label "TOTAL" is on line N and the amount "Rp 45.000" is on line N+1
    if (candidates.length === 0 && (isPriorityLabel || isSecondaryLabel) && idx + 1 < lines.length) {
      candidates = parseIdrCandidatesFromLine(lines[idx + 1]);
    }

    for (const val of candidates) {
      let score = 0;
      if (isPriorityLabel) score += 100;
      else if (isSecondaryLabel) score += 60;
      if (hasCurrency) score += 25;
      // Receipt totals are typically near the lower half of the receipt
      if (idx >= Math.floor(lines.length * 0.4)) score += 10;
      if (isIgnoredLine && !isPriorityLabel) score -= 90;
      // Slight preference for realistic IDR bill totals >= 1,000
      if (val >= 1000 && val % 100 === 0) score += 8;

      if (score > bestScore || (score === bestScore && bestAmount !== null && val > bestAmount)) {
        bestScore = score;
        bestAmount = val;
      }
    }
  });

  return bestScore >= 0 ? bestAmount : null;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  januari: '01',
  feb: '02',
  february: '02',
  februari: '02',
  mar: '03',
  march: '03',
  maret: '03',
  apr: '04',
  april: '04',
  may: '05',
  mei: '05',
  jun: '06',
  june: '06',
  juni: '06',
  jul: '07',
  july: '07',
  juli: '07',
  aug: '08',
  august: '08',
  agu: '08',
  agt: '08',
  agustus: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  okt: '10',
  oktober: '10',
  nov: '11',
  november: '11',
  nop: '11',
  dec: '12',
  december: '12',
  des: '12',
  desember: '12',
};

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 2015 || year > 2035 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function extractDateFromOcrText(text: string, fallbackToday: string): string {
  // 1. YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (isValidYmd(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY
  const dmyMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    let y = Number(dmyMatch[3]);
    if (y < 100) y += 2000;
    if (isValidYmd(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. DD Mon YYYY (English or Indonesian)
  const namedMonthRegex =
    /\b(\d{1,2})\s+(jan(?:uary|uari)?|feb(?:ruary|ruari)?|mar(?:ch|et)?|apr(?:il)?|may|mei|jun(?:e|i)?|jul(?:y|i)?|aug(?:ust)?|agu(?:stus)?|agt|sep(?:t|tember)?|oct(?:ober)?|okt(?:ober)?|nov(?:ember)?|nop|dec(?:ember)?|des(?:ember)?)[,]?\s+(20\d{2})\b/i;
  const namedMatch = text.match(namedMonthRegex);
  if (namedMatch) {
    const d = Number(namedMatch[1]);
    const mStr = MONTH_MAP[namedMatch[2].toLowerCase()];
    const y = Number(namedMatch[3]);
    if (mStr && isValidYmd(y, Number(mStr), d)) {
      return `${y}-${mStr}-${String(d).padStart(2, '0')}`;
    }
  }

  return fallbackToday;
}

function extractNotesFromOcrText(text: string): string {
  for (const merchant of KNOWN_MERCHANTS) {
    if (merchant.pattern.test(text)) {
      return merchant.label;
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[^\p{L}\p{N}\s&'./-]/gu, '').trim())
    .filter((l) => l.length >= 3 && l.length <= 50);

  const boilerplateRegex =
    /^(struk|receipt|invoice|nota|pembayaran|transaksi|bukti|selamat|terima\s*kasih|thank\s*you|jl\.|jalan|telp|npwp|tanggal|date|waktu|time|kasir|cashier)/i;

  for (const line of lines.slice(0, 6)) {
    const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
    const digitCount = (line.match(/\d/g) || []).length;
    if (letterCount >= 3 && letterCount >= digitCount && !boilerplateRegex.test(line)) {
      return line.slice(0, 60);
    }
  }

  return 'Scanned Receipt';
}

function matchCategoryFromOcrText(text: string, categories: string[]): string {
  if (!categories || categories.length === 0) return 'Other Expense';

  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.pattern.test(text)) {
      const matched = categories.find((cat) =>
        rule.targets.some((target) => cat.toLowerCase().includes(target.toLowerCase()))
      );
      if (matched) return matched;
    }
  }

  // Fallback: match custom category words directly in OCR text
  const lowerText = text.toLowerCase();
  for (const cat of categories) {
    const words = cat
      .toLowerCase()
      .split(/[\s&/,-]+/)
      .filter((w) => w.length >= 4 && w !== 'other' && w !== 'expense');
    if (words.some((w) => lowerText.includes(w))) {
      return cat;
    }
  }

  return (
    categories.find((c) => /other|lain/i.test(c)) || categories[categories.length - 1]
  );
}

function dataUrlToBlobIfNonStandard(dataUrl: string): string | Blob {
  if (/^data:image\/[a-zA-Z]+;base64,/i.test(dataUrl)) {
    return dataUrl;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return dataUrl;
  try {
    const mime = match[1].startsWith('image/') ? match[1] : 'image/jpeg';
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return dataUrl;
  }
}

/**
 * On-device OCR fallback when the live Express/Gemini backend is unavailable
 * (e.g., standalone Capacitor Android APK, GitHub Pages, or offline PWA mode).
 */
export async function scanReceiptLocally(data: {
  imageDataUrl: string;
  categories: string[];
  todayDate: string;
}): Promise<{ result: ScannedReceiptResult }> {
  const worker = await getOcrWorker();
  const imageInput = dataUrlToBlobIfNonStandard(data.imageDataUrl);
  const { data: ocrData } = await worker.recognize(imageInput);
  const rawText = (typeof ocrData?.text === 'string' ? ocrData.text : String(ocrData?.text || '')).trim();

  if (!rawText || rawText.length < 4) {
    throw new Error('Could not read any text from this image. Please try a clearer photo.');
  }

  const amount = extractAmountFromOcrText(rawText);
  if (!amount || amount <= 0) {
    throw new Error(
      'Could not detect a valid total amount on this image. Please take a sharper, closer photo of the total.'
    );
  }

  const notes = extractNotesFromOcrText(rawText);
  const category = matchCategoryFromOcrText(`${notes}\n${rawText}`, data.categories);
  const date = extractDateFromOcrText(rawText, data.todayDate);
  const ocrConfidence = typeof ocrData?.confidence === 'number' ? ocrData.confidence : 60;

  return {
    result: {
      isReceiptOrPayment: true,
      amount,
      category,
      date,
      notes,
      confidence: ocrConfidence >= 75 ? 'high' : ocrConfidence >= 50 ? 'medium' : 'low',
      source: 'ocr',
    },
  };
}
