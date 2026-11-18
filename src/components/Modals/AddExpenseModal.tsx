import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  RotateCcw,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Plus,
  Wallet,
  Tag,
  Calendar,
  FileText,
  Camera,
  Upload,
  ClipboardPaste,
  ScanLine,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  formatIdr,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getLocalDateString,
} from '../../lib/formatters';
import { api } from '../../lib/api';
import {
  compressReceiptImage,
  compressVideoFrame,
  isSupportedImageBlob,
  type CompressedReceiptImage,
} from '../../lib/imageUtils';

export const AddExpenseModal: React.FC = () => {
  const { user } = useAuth();
  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    transactionInitialType,
    transactionInitialScanOpen,
    setTransactionInitialScanOpen,
    accounts,
    addTransaction,
    editingTransaction,
    setEditingTransaction,
    updateTransaction,
    showNotification,
    expenseCategories,
    incomeCategories,
    setIsCategoryModalOpen,
  } = useFinance();

  const cameraInputId = 'wt-receipt-camera-input';
  const uploadInputId = 'wt-receipt-upload-input';

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState<string>(getLocalDateString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Bill & Payment Scanner State
  const [isScannerExpanded, setIsScannerExpanded] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'compressing' | 'scanning' | 'success' | 'error'>('idle');
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');
  const [scanConfidence, setScanConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [scanSource, setScanSource] = useState<'ai' | 'ocr' | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showReceiptPreviewModal, setShowReceiptPreviewModal] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isLiveCameraReady, setIsLiveCameraReady] = useState(false);
  const [isPasteBoxOpen, setIsPasteBoxOpen] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pasteBoxRef = useRef<HTMLDivElement | null>(null);
  const lastCompressedImageRef = useRef<CompressedReceiptImage | null>(null);
  const scanGenerationRef = useRef<number>(0);

  const isTouchMobile = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }, []);

  const getSelectableAccountsForType = React.useCallback(
    (targetType: 'expense' | 'income') => {
      if (targetType === 'expense') {
        return accounts;
      }
      return accounts.filter((acc) => {
        if (acc.type === 'credit_card' || acc.type === 'paylater') {
          if (
            editingTransaction &&
            editingTransaction.accountId === acc.id &&
            editingTransaction.type === 'income'
          ) {
            return true;
          }
          return (Number(acc.balance) || 0) > 0;
        }
        return true;
      });
    },
    [accounts, editingTransaction]
  );

  const selectableAccounts = React.useMemo(
    () => getSelectableAccountsForType(type),
    [getSelectableAccountsForType, type]
  );

  const wasOpenRef = React.useRef(false);
  const lastEditingTxIdRef = React.useRef<string | null | undefined>(undefined);

  const stopLiveCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraReady(false);
    setIsLiveCameraOpen(false);
  }, []);

  const clearScanState = useCallback(() => {
    scanGenerationRef.current += 1;
    stopLiveCamera();
    setScanStatus('idle');
    setScanPreviewUrl('');
    setScanError('');
    setScanConfidence(null);
    setScanSource(null);
    setIsDragOver(false);
    setShowReceiptPreviewModal(false);
    setIsPasteBoxOpen(false);
    lastCompressedImageRef.current = null;
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }, [stopLiveCamera]);

  // Clean form ONLY on modal open or when editingTransaction changes, preserving typed inputs during background sync
  useEffect(() => {
    if (isAddExpenseOpen) {
      const isFreshOpen = !wasOpenRef.current;
      const currentEditingId = editingTransaction ? editingTransaction.id : null;
      const isEditingTxChanged = currentEditingId !== lastEditingTxIdRef.current;

      if (isFreshOpen || isEditingTxChanged) {
        setIsSubmitting(false);
        wasOpenRef.current = true;
        lastEditingTxIdRef.current = currentEditingId;
        clearScanState();
        setIsScannerExpanded(!editingTransaction && Boolean(transactionInitialScanOpen));

        if (editingTransaction) {
          const txType = editingTransaction.type === 'income' ? 'income' : 'expense';
          setType(txType);
          setAmount(editingTransaction.amount.toString());
          setAccountId(editingTransaction.accountId);
          const fallbackCat =
            txType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
          setCategory(editingTransaction.category || fallbackCat);
          setDate(editingTransaction.date);
          setNotes(editingTransaction.notes || '');
        } else {
          const initType = transactionInitialScanOpen ? 'expense' : transactionInitialType || 'expense';
          const validAccs = getSelectableAccountsForType(initType);
          const defaultAcc = validAccs.length > 0 ? validAccs[0] : undefined;
          setType(initType);
          setAmount('');
          setAccountId(defaultAcc ? defaultAcc.id : '');
          if (initType === 'income') {
            const isCreditAcc =
              defaultAcc &&
              (defaultAcc.type === 'credit_card' || defaultAcc.type === 'paylater');
            setCategory(isCreditAcc ? 'Cashback & Refunds' : INCOME_CATEGORIES[0]);
          } else {
            setCategory(EXPENSE_CATEGORIES[0]);
          }
          setDate(getLocalDateString());
          setNotes('');
        }
        setError('');
      }
    } else {
      wasOpenRef.current = false;
      lastEditingTxIdRef.current = undefined;
      clearScanState();
      setIsScannerExpanded(false);
    }
  }, [
    isAddExpenseOpen,
    editingTransaction,
    transactionInitialType,
    transactionInitialScanOpen,
    getSelectableAccountsForType,
    clearScanState,
  ]);

  // If modal opened while accounts were still empty and sync finishes, bind default account without resetting user inputs
  useEffect(() => {
    if (isAddExpenseOpen && !accountId && selectableAccounts.length > 0) {
      setAccountId(selectableAccounts[0].id);
    }
  }, [isAddExpenseOpen, accountId, selectableAccounts]);

  const runReceiptExtraction = useCallback(
    async (compressed: CompressedReceiptImage) => {
      const requestGen = scanGenerationRef.current;
      setScanStatus('scanning');
      setScanError('');
      setError('');

      try {
        const categoriesToMatch =
          expenseCategories.length > 0 ? expenseCategories : [...EXPENSE_CATEGORIES];
        const { result } = await api.scanReceiptImage({
          imageBase64: compressed.base64,
          mimeType: compressed.mimeType,
          categories: categoriesToMatch,
          todayDate: getLocalDateString(),
          userEmail: user?.email,
          userId: user?.id,
          previewDataUrl: compressed.previewDataUrl,
        });

        if (requestGen !== scanGenerationRef.current) return;

        // Scope: expenses only — ensure modal switches cleanly to expense mode
        setType('expense');
        const validExpenseAccs = getSelectableAccountsForType('expense');
        if (validExpenseAccs.length > 0 && !validExpenseAccs.some((a) => a.id === accountId)) {
          setAccountId(validExpenseAccs[0].id);
        }

        if (result.amount && result.amount > 0) {
          setAmount(String(Math.round(result.amount)));
        }
        if (result.category) {
          setCategory(result.category);
        }
        if (result.date && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
          setDate(result.date);
        }
        if (result.notes) {
          setNotes(result.notes);
        }

        setScanConfidence(result.confidence || 'medium');
        setScanSource(result.source || 'ai');
        setScanStatus('success');
      } catch (err: any) {
        if (requestGen !== scanGenerationRef.current) return;
        setScanError(err?.message || 'Failed to read receipt image. Try a clearer photo.');
        setScanStatus('error');
      }
    },
    [expenseCategories, getSelectableAccountsForType, accountId, user?.email]
  );

  const processReceiptBlob = useCallback(
    async (blob: Blob) => {
      if (isSubmitting) return;
      const requestGen = ++scanGenerationRef.current;
      setScanStatus('compressing');
      setScanError('');
      setError('');
      setScanConfidence(null);

      try {
        let sourceBlob: Blob = blob;
        const normalizedMime =
          blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';

        // Copy bytes when supported so resetting the input element cannot invalidate WebKit File references,
        // while falling back directly to the Blob if an Android content:// URI rejects arrayBuffer().
        if (typeof blob.arrayBuffer === 'function') {
          try {
            const buffer = await blob.arrayBuffer();
            if (buffer.byteLength > 0) {
              sourceBlob = new File([buffer], (blob as File).name || 'receipt.jpg', {
                type: normalizedMime,
              });
            }
          } catch {
            sourceBlob = blob;
          }
        }

        const compressed = await compressReceiptImage(sourceBlob);
        if (requestGen !== scanGenerationRef.current) return;
        lastCompressedImageRef.current = compressed;
        setScanPreviewUrl(compressed.previewDataUrl);
        await runReceiptExtraction(compressed);
      } catch (err: any) {
        if (requestGen !== scanGenerationRef.current) return;
        setScanError(err?.message || 'Could not process the selected image.');
        setScanStatus('error');
      } finally {
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (uploadInputRef.current) uploadInputRef.current.value = '';
      }
    },
    [isSubmitting, runReceiptExtraction]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      void processReceiptBlob(file);
    }
  };

  const handleCameraButtonClick = async () => {
    if (isSubmitting) return;
    setScanError('');

    // Try live camera preview first on non-mobile or when getUserMedia is supported cleanly;
    // fall back immediately to native camera/file picker if unavailable or blocked.
    if (
      !isTouchMobile &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        setIsLiveCameraReady(false);
        setIsLiveCameraOpen(true);
        return;
      } catch {
        stopLiveCamera();
        // Fall back to file/camera input cleanly
      }
    }

    cameraInputRef.current?.click();
  };

  // Attach MediaStream once the live camera video element mounts
  useEffect(() => {
    if (isLiveCameraOpen && videoRef.current && mediaStreamRef.current) {
      const video = videoRef.current;
      video.srcObject = mediaStreamRef.current;
      void video.play().catch(() => {});
    }
  }, [isLiveCameraOpen]);

  const handleSnapLiveCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    let compressed: CompressedReceiptImage;
    try {
      compressed = compressVideoFrame(video);
    } catch {
      stopLiveCamera();
      setScanError('Failed to capture photo from camera.');
      setScanStatus('error');
      return;
    }

    stopLiveCamera();

    const requestGen = ++scanGenerationRef.current;
    lastCompressedImageRef.current = compressed;
    setScanPreviewUrl(compressed.previewDataUrl);
    if (requestGen === scanGenerationRef.current) {
      void runReceiptExtraction(compressed);
    }
  };

  // Ensure camera stream stops if modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const dataUrlToBlob = useCallback((dataUrl: string): Blob | null => {
    try {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/i);
      if (!match) return null;
      const mime = match[1];
      const binaryStr = atob(match[2]);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch {
      return null;
    }
  }, []);

  const extractImageBlobFromSrc = useCallback(
    async (src: string): Promise<Blob | null> => {
      if (!src) return null;
      if (src.startsWith('data:image/')) {
        return dataUrlToBlob(src);
      }
      if (src.startsWith('blob:')) {
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          return isSupportedImageBlob(blob) ? blob : null;
        } catch {
          return null;
        }
      }
      return null;
    },
    [dataUrlToBlob]
  );

  const extractImageFromDataTransfer = useCallback(
    async (dt: DataTransfer | null | undefined): Promise<Blob | null> => {
      if (!dt) return null;

      if (dt.items) {
        for (let i = 0; i < dt.items.length; i++) {
          const item = dt.items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && isSupportedImageBlob(file)) {
              return file;
            }
          }
        }
      }

      if (dt.files && dt.files.length > 0) {
        for (let i = 0; i < dt.files.length; i++) {
          const candidate = dt.files[i];
          if (isSupportedImageBlob(candidate)) {
            return candidate;
          }
        }
      }

      // Some mobile/desktop apps paste an image as HTML (<img src="data:image/..."> or blob:)
      try {
        const html = dt.getData('text/html');
        if (html) {
          const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch?.[1]) {
            const blob = await extractImageBlobFromSrc(imgMatch[1]);
            if (blob) return blob;
          }
        }
        const plain = dt.getData('text/plain')?.trim();
        if (plain && plain.startsWith('data:image/')) {
          const blob = dataUrlToBlob(plain);
          if (blob) return blob;
        }
      } catch {
        // Ignore clipboard getData restrictions
      }

      return null;
    },
    [dataUrlToBlob, extractImageBlobFromSrc]
  );

  // Focus mobile paste zone automatically when opened so Gboard/Samsung clipboard & long-press Paste work immediately
  useEffect(() => {
    if (isPasteBoxOpen && pasteBoxRef.current) {
      const timer = setTimeout(() => {
        pasteBoxRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isPasteBoxOpen]);

  const handleClipboardButtonPaste = async () => {
    if (isSubmitting) return;
    setScanError('');
    setScanStatus('idle');

    // 1. Try direct Clipboard API read (works on Chrome desktop & Android Chrome when permission granted)
    if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            setIsPasteBoxOpen(false);
            await processReceiptBlob(blob);
            return;
          }
          if (item.types.includes('text/html')) {
            const htmlBlob = await item.getType('text/html');
            const html = await htmlBlob.text();
            const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch?.[1]) {
              const imgBlob = await extractImageBlobFromSrc(imgMatch[1]);
              if (imgBlob) {
                setIsPasteBoxOpen(false);
                await processReceiptBlob(imgBlob);
                return;
              }
            }
          }
        }
      } catch {
        // Blocked by browser/WebView/iframe permission policy -> open mobile tap-and-paste zone below
      }
    }

    // 2. Fallback to interactive Paste Box (enables mobile long-press "Paste" & Android Gboard/Samsung keyboard clipboard strip)
    setIsScannerExpanded(true);
    setIsPasteBoxOpen(true);
  };

  const handlePasteZonePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const imageBlob = await extractImageFromDataTransfer(e.clipboardData);
    if (pasteBoxRef.current) {
      pasteBoxRef.current.innerHTML = '';
    }
    if (imageBlob) {
      setIsPasteBoxOpen(false);
      await processReceiptBlob(imageBlob);
    } else {
      setScanError('Clipboard contains text only — copy an image/screenshot first, then paste.');
      setScanStatus('error');
    }
  };

  const handlePasteZoneBeforeInput = async (e: React.FormEvent<HTMLDivElement>) => {
    const inputEvt = e.nativeEvent as unknown as InputEvent & { dataTransfer?: DataTransfer | null };
    if (inputEvt?.dataTransfer) {
      const imageBlob = await extractImageFromDataTransfer(inputEvt.dataTransfer);
      if (imageBlob) {
        e.preventDefault();
        if (pasteBoxRef.current) pasteBoxRef.current.innerHTML = '';
        setIsPasteBoxOpen(false);
        await processReceiptBlob(imageBlob);
      }
    }
  };

  const handlePasteZoneInput = async () => {
    const el = pasteBoxRef.current;
    if (!el) return;
    const imgEl = el.querySelector('img');
    if (imgEl?.src) {
      const src = imgEl.src;
      el.innerHTML = '';
      const blob = await extractImageBlobFromSrc(src);
      if (blob) {
        setIsPasteBoxOpen(false);
        await processReceiptBlob(blob);
        return;
      }
    }
    // Strip any typed text so the paste box stays clean
    el.innerHTML = '';
  };

  // Global clipboard paste support while modal is open for new transactions
  useEffect(() => {
    if (!isAddExpenseOpen || editingTransaction) return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      // If paste target is inside the dedicated paste zone, its own handler handles it
      if (pasteBoxRef.current && e.target instanceof Node && pasteBoxRef.current.contains(e.target)) {
        return;
      }
      const imageBlob = await extractImageFromDataTransfer(e.clipboardData);
      if (imageBlob) {
        e.preventDefault();
        setIsScannerExpanded(true);
        setIsPasteBoxOpen(false);
        void processReceiptBlob(imageBlob);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isAddExpenseOpen, editingTransaction, extractImageFromDataTransfer, processReceiptBlob]);

  const resetForm = () => {
    setIsSubmitting(false);
    clearScanState();
    const initType = transactionInitialType || 'expense';
    const validAccs = getSelectableAccountsForType(initType);
    const defaultAcc = validAccs.length > 0 ? validAccs[0] : undefined;
    setType(initType);
    setAmount('');
    setAccountId(defaultAcc ? defaultAcc.id : '');
    if (initType === 'income') {
      const isCreditAcc =
        defaultAcc &&
        (defaultAcc.type === 'credit_card' || defaultAcc.type === 'paylater');
      setCategory(isCreditAcc ? 'Cashback & Refunds' : INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
    setDate(getLocalDateString());
    setNotes('');
    setError('');
  };

  const handleTypeChange = (newType: 'expense' | 'income') => {
    if (newType === type) return;
    setType(newType);
    const validAccs = getSelectableAccountsForType(newType);
    let nextAcc = validAccs.find((a) => a.id === accountId);
    if (!nextAcc) {
      nextAcc = validAccs.length > 0 ? validAccs[0] : undefined;
      setAccountId(nextAcc ? nextAcc.id : '');
    }

    if (newType === 'income') {
      const isCreditAcc =
        nextAcc && (nextAcc.type === 'credit_card' || nextAcc.type === 'paylater');
      if (isCreditAcc) {
        setCategory('Cashback & Refunds');
      } else if (!incomeCategories.includes(category)) {
        setCategory(incomeCategories[0] || INCOME_CATEGORIES[0]);
      }
    } else {
      if (!expenseCategories.includes(category)) {
        setCategory(expenseCategories[0] || EXPENSE_CATEGORIES[0]);
      }
    }
  };

  const handleAccountChange = (newAccountId: string) => {
    setAccountId(newAccountId);
    const nextAcc = accounts.find((a) => a.id === newAccountId);
    if (
      type === 'income' &&
      nextAcc &&
      (nextAcc.type === 'credit_card' || nextAcc.type === 'paylater')
    ) {
      setCategory('Cashback & Refunds');
    }
  };

  const handleClose = () => {
    resetForm();
    setEditingTransaction(null);
    setTransactionInitialScanOpen(false);
    setIsAddExpenseOpen(false);
  };

  const handleQuickAdd = (inc: number) => {
    const current = Number(amount) || 0;
    setAmount((current + inc).toString());
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const availableBalance = React.useMemo(() => {
    if (!selectedAccount) return 0;
    if (
      selectedAccount.type === 'credit_card' ||
      selectedAccount.type === 'paylater'
    ) {
      if (selectedAccount.creditLimit === undefined) return 0;
      let revertedDebt = selectedAccount.balance;
      if (
        editingTransaction &&
        editingTransaction.accountId === selectedAccount.id &&
        (editingTransaction.type === 'expense' ||
          editingTransaction.type === 'cc_debt')
      ) {
        revertedDebt = Math.max(0, revertedDebt - editingTransaction.amount);
      }
      return Math.max(0, selectedAccount.creditLimit - revertedDebt);
    }
    let revertedBal = selectedAccount.balance;
    if (
      editingTransaction &&
      editingTransaction.accountId === selectedAccount.id &&
      (editingTransaction.type === 'expense' ||
        editingTransaction.type === 'cc_debt')
    ) {
      revertedBal += editingTransaction.amount;
    }
    return revertedBal;
  }, [selectedAccount, editingTransaction]);

  const refundableDebt = React.useMemo(() => {
    if (!selectedAccount) return 0;
    if (
      selectedAccount.type === 'credit_card' ||
      selectedAccount.type === 'paylater'
    ) {
      let currentUsedDebt = Number(selectedAccount.balance) || 0;
      if (
        editingTransaction &&
        editingTransaction.accountId === selectedAccount.id &&
        editingTransaction.type === 'income'
      ) {
        currentUsedDebt += editingTransaction.amount;
      }
      return Math.max(0, currentUsedDebt);
    }
    return 0;
  }, [selectedAccount, editingTransaction]);

  const parsedNumAmount = Number(amount);
  const isInsufficientBalance = Boolean(
    type === 'expense' &&
      selectedAccount &&
      !isNaN(parsedNumAmount) &&
      parsedNumAmount > 0 &&
      parsedNumAmount > availableBalance
  );

  const isExceedingRefundableDebt = Boolean(
    type === 'income' &&
      selectedAccount &&
      (selectedAccount.type === 'credit_card' ||
        selectedAccount.type === 'paylater') &&
      !isNaN(parsedNumAmount) &&
      parsedNumAmount > 0 &&
      parsedNumAmount > refundableDebt
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setIsSubmitting(false);
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      setIsSubmitting(false);
      return;
    }

    if (type === 'expense' && selectedAccount) {
      if (parsedAmount > availableBalance) {
        if (
          selectedAccount.type === 'credit_card' ||
          selectedAccount.type === 'paylater'
        ) {
          setError(
            `Credit limit insufficient (${formatIdr(
              availableBalance
            )}). Expense amount ${formatIdr(parsedAmount)} cannot be submitted.`
          );
        } else {
          setError(
            `Insufficient balance (${formatIdr(
              availableBalance
            )}). Expense amount ${formatIdr(parsedAmount)} cannot be submitted.`
          );
        }
        setIsSubmitting(false);
        return;
      }
    }

    if (
      type === 'income' &&
      selectedAccount &&
      (selectedAccount.type === 'credit_card' ||
        selectedAccount.type === 'paylater')
    ) {
      if (parsedAmount > refundableDebt) {
        setError(
          `Refund amount (${formatIdr(
            parsedAmount
          )}) cannot exceed used credit limit (${formatIdr(refundableDebt)}).`
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      } else {
        await addTransaction({
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      }

      const targetAcc = accounts.find((a) => a.id === accountId);
      const accName = targetAcc ? targetAcc.name : 'Account';
      const isCreditRefund =
        type === 'income' &&
        targetAcc &&
        (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater');
      showNotification({
        type: 'success',
        txType: type,
        title: editingTransaction
          ? isCreditRefund
            ? 'Credit Refund Updated'
            : type === 'expense'
            ? 'Expense Updated'
            : 'Income Updated'
          : isCreditRefund
          ? 'Credit Card Refund Recorded'
          : type === 'expense'
          ? 'Expense Recorded'
          : 'Income Recorded',
        message: notes?.trim() ? notes.trim() : undefined,
        amount: parsedAmount,
        category,
        accountName: accName,
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
      setIsSubmitting(false);
    }
  };

  if (!isAddExpenseOpen) return null;

  const activeCategories: readonly string[] =
    type === 'income' ? incomeCategories : expenseCategories;
  const categoryOptions = activeCategories.includes(category)
    ? [...activeCategories]
    : [category, ...activeCategories];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="no-pull-to-refresh fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0b1020] border-t sm:border border-slate-200/90 dark:border-[#1b2540] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[86vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-1.5 pb-0.5 shrink-0">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-[#18223a] shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
              {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              {editingTransaction
                ? 'Update details and account balance'
                : 'Record an expense or income'}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              title="Reset form"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="expense-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-3.5 space-y-2.5 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Type Selector */}
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-[#0f1629] rounded-lg border border-slate-200/70 dark:border-[#1e2946]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTypeChange('expense')}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'expense'
                  ? 'bg-white dark:bg-[#18233e] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a3960]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight
                className={`w-3.5 h-3.5 ${
                  type === 'expense' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                }`}
              />
              <span>Expense</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTypeChange('income')}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'income'
                  ? 'bg-white dark:bg-[#18233e] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-[#2a3960]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowDownRight
                className={`w-3.5 h-3.5 ${
                  type === 'income' ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <span>Income</span>
            </button>
          </div>

          {/* Compact AI Bill & Payment Receipt Scanner (Expenses only, new transactions) */}
          {!editingTransaction && type === 'expense' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile && isSupportedImageBlob(droppedFile)) {
                  void processReceiptBlob(droppedFile);
                } else if (droppedFile) {
                  setScanError('Please drop a valid image file (PNG, JPG, WebP, or HEIC).');
                  setScanStatus('error');
                }
              }}
              className={`rounded-xl border transition-colors ${
                isDragOver
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500'
                  : scanStatus === 'error'
                  ? 'bg-rose-500/5 border-rose-500/30'
                  : scanStatus === 'success'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-slate-50/80 dark:bg-[#0f1629] border-dashed border-slate-300/90 dark:border-[#243252]'
              } px-2.5 py-2 space-y-2`}
            >
              {scanStatus === 'compressing' || scanStatus === 'scanning' ? (
                <div className="flex items-center gap-2.5">
                  {scanPreviewUrl ? (
                    <img
                      src={scanPreviewUrl}
                      alt="Scanning receipt"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#243252] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <ScanLine className="w-4 h-4 text-indigo-500 animate-pulse" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
                      <span className="truncate">
                        {scanStatus === 'compressing'
                          ? 'Preparing image...'
                          : 'AI reading receipt details...'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      Detecting total amount, category, date & merchant
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearScanState}
                    title="Cancel scan"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1a2645] cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : scanStatus === 'success' ? (
                <div className="flex items-center gap-2.5">
                  {scanPreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setShowReceiptPreviewModal(true)}
                      title="View bill image"
                      className="relative w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/35 shrink-0 group cursor-pointer"
                    >
                      <img
                        src={scanPreviewUrl}
                        alt="Scanned bill"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </span>
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>
                        {scanSource === 'ocr'
                          ? 'On-Device Scan — Review & Save'
                          : 'AI Filled — Review & Save'}
                      </span>
                      {(scanConfidence === 'low' || scanSource === 'ocr') && (
                        <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                          (Verify digits)
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      Tap thumbnail to inspect or pick another bill
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label
                      htmlFor={uploadInputId}
                      title="Scan another bill"
                      className="h-7 px-2 rounded-md text-[10px] font-medium bg-white dark:bg-[#131d35] border border-slate-200 dark:border-[#243252] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a2645] cursor-pointer inline-flex items-center select-none"
                    >
                      Rescan
                    </label>
                    <button
                      type="button"
                      onClick={clearScanState}
                      title="Clear scanned image"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1a2645] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ScanLine className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        AI Scan Bill<span className="hidden sm:inline"> / Payment</span>
                      </span>
                      <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                        · Ctrl+V to paste
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isTouchMobile ? (
                        <label
                          htmlFor={cameraInputId}
                          title="Take photo with camera"
                          className={`h-7 px-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer select-none ${
                            isSubmitting ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Camera className="w-3 h-3 shrink-0" />
                          <span>Camera</span>
                        </label>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleCameraButtonClick}
                          title="Take photo with camera"
                          className="h-7 px-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="w-3 h-3 shrink-0" />
                          <span>Camera</span>
                        </button>
                      )}
                      <label
                        htmlFor={uploadInputId}
                        title="Upload image or payment screenshot"
                        className={`h-7 px-2 rounded-md bg-white dark:bg-[#131d35] hover:bg-slate-100 dark:hover:bg-[#1a2645] text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-[#243252] text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer select-none ${
                          isSubmitting ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <Upload className="w-3 h-3 shrink-0" />
                        <span>Upload</span>
                      </label>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleClipboardButtonPaste}
                        title="Paste screenshot from clipboard"
                        aria-label="Paste screenshot from clipboard"
                        className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
                          isPasteBoxOpen
                            ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                            : 'bg-white dark:bg-[#131d35] hover:bg-slate-100 dark:hover:bg-[#1a2645] text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-[#243252]'
                        }`}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {isPasteBoxOpen && (
                    <div className="relative rounded-lg border border-indigo-500/45 bg-indigo-500/8 px-2.5 py-2 flex items-center gap-2">
                      <div
                        ref={pasteBoxRef}
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        aria-label="Tap and paste receipt image here"
                        onPaste={handlePasteZonePaste}
                        onBeforeInput={handlePasteZoneBeforeInput}
                        onInput={handlePasteZoneInput}
                        className="flex-1 min-h-[28px] flex items-center text-[11px] text-indigo-700 dark:text-indigo-200 outline-none select-text cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-indigo-600/80 dark:empty:before:text-indigo-300/85"
                        data-placeholder={
                          isTouchMobile
                            ? 'Tap or long-press here to Paste image from keyboard / clipboard'
                            : 'Press Ctrl+V / Cmd+V here to paste your receipt image'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasteBoxOpen(false)}
                        title="Close paste box"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-indigo-400 hover:text-indigo-600 dark:hover:text-white shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isScannerExpanded && scanStatus === 'idle' && !isPasteBoxOpen && (
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Snap a paper bill, upload a QRIS/transfer proof, or tap Paste to insert a copied screenshot.
                    </p>
                  )}

                  {scanStatus === 'error' && scanError && (
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-rose-600 dark:text-rose-300">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span className="truncate sm:whitespace-normal">{scanError}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {lastCompressedImageRef.current && (
                          <button
                            type="button"
                            onClick={() => {
                              if (lastCompressedImageRef.current) {
                                void runReceiptExtraction(lastCompressedImageRef.current);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-[10px] font-semibold text-rose-700 dark:text-rose-200 cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={clearScanState}
                          title="Dismiss error"
                          className="p-0.5 text-rose-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hero Amount Card */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1629] border border-slate-200/80 dark:border-[#1e2946] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <label htmlFor="tx-amount-input" className="font-medium text-slate-700 dark:text-zinc-300">
                {type === 'expense' ? 'Expense Amount' : 'Income Amount'}
              </label>
              {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    type === 'expense'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatIdr(Number(amount))}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-zinc-500 select-none">
                Rp
              </span>
              <input
                id="tx-amount-input"
                type="number"
                min="0"
                step="any"
                disabled={isSubmitting}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className={`w-full bg-white dark:bg-[#080d1a] border rounded-lg pl-8.5 pr-3 py-1.5 text-base font-bold tracking-tight text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none tabular-nums font-mono transition-colors disabled:opacity-60 ${
                  isInsufficientBalance || isExceedingRefundableDebt
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-slate-200 dark:border-[#243252] focus:border-indigo-500'
                }`}
                required
                autoFocus={!isTouchMobile && !transactionInitialScanOpen}
              />
            </div>

            {/* Quick Add Chips */}
            <div className="flex flex-wrap gap-1">
              {[10000, 50000, 100000, 250000, 500000, 1000000, 5000000].map(
                (inc) => (
                  <button
                    key={inc}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleQuickAdd(inc)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 dark:bg-[#131d35] dark:hover:bg-[#1a2645] text-[10px] font-medium text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-[#243252] transition-colors cursor-pointer tabular-nums font-mono disabled:opacity-40"
                  >
                    +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}k`}
                  </button>
                )
              )}
            </div>

            {/* Balance / Limit Warning */}
            {isInsufficientBalance && (
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Exceeds available balance by{' '}
                  <strong className="font-mono tabular-nums">
                    {formatIdr(parsedNumAmount - availableBalance)}
                  </strong>
                </span>
              </div>
            )}

            {isExceedingRefundableDebt && (
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Refund exceeds used credit limit (max{' '}
                  <strong className="font-mono tabular-nums">
                    {formatIdr(refundableDebt)}
                  </strong>
                  )
                </span>
              </div>
            )}
          </div>

          {/* Account Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-slate-400" />
                <span>{type === 'expense' ? 'From Account' : 'To Account'}</span>
              </label>

              {selectedAccount && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {selectedAccount.type === 'credit_card' ||
                  selectedAccount.type === 'paylater'
                    ? type === 'income'
                      ? 'Used Debt: '
                      : 'Available: '
                    : 'Balance: '}
                  <strong
                    className={`font-mono tabular-nums ${
                      isInsufficientBalance || isExceedingRefundableDebt
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatIdr(
                      (selectedAccount.type === 'credit_card' ||
                        selectedAccount.type === 'paylater') &&
                        type === 'income'
                        ? refundableDebt
                        : availableBalance
                    )}
                  </strong>
                </span>
              )}
            </div>

            <select
              value={accountId}
              disabled={isSubmitting}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
              required
            >
              {selectableAccounts.length === 0 && (
                <option value="">No accounts found — add one first</option>
              )}
              {selectableAccounts.map((acc) => {
                const isCredit =
                  acc.type === 'credit_card' || acc.type === 'paylater';
                const avail = isCredit
                  ? Math.max(0, (acc.creditLimit || 0) - acc.balance)
                  : acc.balance;
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} —{' '}
                    {isCredit
                      ? type === 'income'
                        ? `Used: ${formatIdr(acc.balance)}`
                        : `Avail: ${formatIdr(avail)}`
                      : formatIdr(acc.balance)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Category</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Manage</span>
              </button>
            </div>

            <select
              value={category}
              disabled={isSubmitting}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Note Row (Side-by-side even on mobile) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                disabled={isSubmitting}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2 text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-none transition-colors disabled:opacity-60"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Note</span>
              </label>
              <input
                type="text"
                value={notes}
                disabled={isSubmitting}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  type === 'income'
                    ? 'Salary, bonus...'
                    : 'Lunch, coffee...'
                }
                className="w-full h-9 bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-[#1e2946] focus:border-indigo-500 rounded-lg px-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60"
              />
            </div>
          </div>
        </form>

        {/* Compact Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-slate-50/70 dark:bg-[#080d1a] border-t border-slate-100 dark:border-[#18223a] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#151f38] transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="expense-modal-form"
            disabled={
              isSubmitting ||
              scanStatus === 'compressing' ||
              scanStatus === 'scanning' ||
              isInsufficientBalance ||
              isExceedingRefundableDebt
            }
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs select-none ${
              isSubmitting || scanStatus === 'compressing' || scanStatus === 'scanning'
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-not-allowed opacity-60'
                : isInsufficientBalance || isExceedingRefundableDebt
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>
                  {isInsufficientBalance
                    ? 'Insufficient Balance'
                    : isExceedingRefundableDebt
                    ? 'Exceeds Used Limit'
                    : editingTransaction
                    ? 'Save Changes'
                    : type === 'expense'
                    ? 'Save Expense'
                    : 'Save Income'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Receipt Lightbox Overlay inside Modal */}
        {showReceiptPreviewModal && scanPreviewUrl && (
          <div
            onClick={() => setShowReceiptPreviewModal(false)}
            className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setShowReceiptPreviewModal(false)}
              aria-label="Close receipt preview"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={scanPreviewUrl}
              alt="Scanned bill preview"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[75vh] max-w-full rounded-xl object-contain border border-white/15 shadow-2xl"
            />
          </div>
        )}

        {/* Live Camera Capture Overlay (Desktop/WebView Webcam with Native File Fallback) */}
        {isLiveCameraOpen && (
          <div className="absolute inset-0 z-30 bg-[#090b10] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Snap Bill or Receipt</span>
              </div>
              <button
                type="button"
                onClick={stopLiveCamera}
                aria-label="Close camera"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setIsLiveCameraReady(true)}
                className="w-full h-full object-contain"
              />
              {!isLiveCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Starting camera...</span>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-[#12151d] border-t border-white/10 flex items-center justify-between gap-2">
              <label
                htmlFor={uploadInputId}
                onClick={() => stopLiveCamera()}
                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose File</span>
              </label>

              <button
                type="button"
                disabled={!isLiveCameraReady}
                onClick={handleSnapLiveCamera}
                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture & Scan</span>
              </button>
            </div>
          </div>
        )}

        {/* Accessible sr-only file inputs outside <form> for reliable activation across Android, iOS & desktop */}
        <input
          id={cameraInputId}
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onClick={(e) => {
            e.currentTarget.value = '';
          }}
          onChange={handleFileInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-label="Capture bill photo with camera"
        />
        <input
          id={uploadInputId}
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onClick={(e) => {
            e.currentTarget.value = '';
          }}
          onChange={handleFileInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload bill or payment screenshot"
        />
      </div>
    </div>
  );
};
