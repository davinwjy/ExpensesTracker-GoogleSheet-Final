import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, FileSpreadsheet, CheckCircle2, ArrowDown, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
  const {
    appsScriptUrl,
    isAppsScriptConnected,
    syncAppsScriptNow,
    isAppsScriptSyncing,
    spreadsheetId,
    isSheetsConnected,
    syncGoogleSheetsNow,
    isSheetsSyncing,
    refreshData,
    showNotification,
    isAddExpenseOpen,
    isTransferOpen,
    isAddAccountOpen,
    isAddInvestmentOpen,
    isBudgetModalOpen,
    isPayBillOpen,
    isHoldingTypesModalOpen,
    isCategoryModalOpen,
    isGoogleSheetSetupOpen,
    isFirebaseSetupOpen,
    isMobileAppModalOpen,
    isMobileMenuOpen,
    isMobileQuickMenuOpen,
  } = useFinance();

  const isAnyModalOpen = Boolean(
    isAddExpenseOpen ||
      isTransferOpen ||
      isAddAccountOpen ||
      isAddInvestmentOpen ||
      isBudgetModalOpen ||
      isPayBillOpen ||
      isHoldingTypesModalOpen ||
      isCategoryModalOpen ||
      isGoogleSheetSetupOpen ||
      isFirebaseSetupOpen ||
      isMobileAppModalOpen ||
      isMobileMenuOpen ||
      isMobileQuickMenuOpen
  );

  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pulling' | 'threshold' | 'refreshing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const hasTriggeredHaptic = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 65; // px needed to trigger sync
  const MAX_PULL = 95; // max visual pull distance

  const playSoftCompletionChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // First tone (C5 - 523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Second tone (E5 - 659.25 Hz) slightly offset for a gentle arpeggio chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.14, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close();
        } catch {}
      }, 450);
    } catch {
      // Audio playback restrictions or unhandled context
    }
  }, []);

  const performSync = useCallback(async () => {
    setIsRefreshing(true);
    setSyncStatus('refreshing');
    setStatusMessage('Menyinkronkan Google Sheet...');

    try {
      if (isAppsScriptConnected || (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com'))) {
        await syncAppsScriptNow();
        setSyncStatus('success');
        setStatusMessage('Google Sheet tersinkronisasi!');
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([20, 40, 20]);
          }
        } catch {}
        playSoftCompletionChime();
      } else if (isSheetsConnected || spreadsheetId) {
        await syncGoogleSheetsNow();
        setSyncStatus('success');
        setStatusMessage('Google Sheet tersinkronisasi!');
        try {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([20, 40, 20]);
          }
        } catch {}
        playSoftCompletionChime();
      } else {
        // Fallback: Google Sheet not yet connected
        await refreshData();
        setSyncStatus('info' as any);
        setStatusMessage('Data lokal diperbarui');
        playSoftCompletionChime();
      }
    } catch (err: any) {
      console.warn('Pull-to-refresh sync failed:', err);
      setSyncStatus('error');
      setStatusMessage('Gagal menyinkronkan data');
      showNotification({
        type: 'error',
        title: 'Gagal Sinkronisasi Google Sheet',
        message: err?.message || 'Pastikan Web App URL valid dan koneksi internet stabil.',
      });
    } finally {
      // Hold status message briefly for smooth UI feedback
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setSyncStatus('idle');
        setStatusMessage('');
      }, 750);
    }
  }, [
    isAppsScriptConnected,
    appsScriptUrl,
    syncAppsScriptNow,
    isSheetsConnected,
    spreadsheetId,
    syncGoogleSheetsNow,
    refreshData,
    showNotification,
    playSoftCompletionChime,
  ]);

  // Touch event listeners
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Don't intercept if already refreshing or if any modal/drawer is open
      if (isRefreshing || isAnyModalOpen || document.querySelector('[role="dialog"]')) return;

      // Only activate when at the very top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 5) return;

      // Check if touch is inside an input, textarea, or open modal dialog
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select') ||
          target.closest('[role="dialog"]') ||
          target.closest('.no-pull-to-refresh'))
      ) {
        return;
      }

      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isDragging.current = true;
      hasTriggeredHaptic.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY.current;
      const deltaX = currentX - touchStartX.current;

      // If user is swiping horizontally more than vertically, ignore
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;

      // Only pull down when pulling downwards from the top of the viewport
      if (deltaY > 0 && scrollTop <= 2) {
        // Non-linear damping for smooth natural rubber-banding
        const damped = Math.min(MAX_PULL, Math.pow(deltaY, 0.85) * 0.65);
        setPullDistance(damped);
        setIsPulling(true);

        if (damped >= THRESHOLD) {
          setSyncStatus('threshold');
          setStatusMessage('Lepas untuk sinkronisasi Google Sheet');

          if (!hasTriggeredHaptic.current) {
            try {
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(12);
              }
            } catch {}
            hasTriggeredHaptic.current = true;
          }
        } else {
          setSyncStatus('pulling');
          setStatusMessage('Tarik ke bawah untuk refresh');
          hasTriggeredHaptic.current = false;
        }

        // Prevent native overscroll browser bounce if dragging past threshold
        if (deltaY > 15 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsPulling(false);

      if (pullDistance >= THRESHOLD && !isRefreshing) {
        // Snap to refresh position and perform sync
        setPullDistance(52);
        performSync();
      } else {
        // Snap back
        setPullDistance(0);
        setSyncStatus('idle');
      }
    };

    const handleTouchCancel = () => {
      isDragging.current = false;
      setIsPulling(false);
      if (!isRefreshing) {
        setPullDistance(0);
        setSyncStatus('idle');
      }
    };

    // Mouse drag support for desktop/testing
    const handleMouseDown = (e: MouseEvent) => {
      if (isRefreshing || isAnyModalOpen || e.button !== 0 || document.querySelector('[role="dialog"]')) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 5) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select') ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('[role="dialog"]') ||
          target.closest('.no-pull-to-refresh'))
      ) {
        return;
      }

      touchStartY.current = e.clientY;
      touchStartX.current = e.clientX;
      isDragging.current = true;
      hasTriggeredHaptic.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || isRefreshing) return;
      const deltaY = e.clientY - touchStartY.current;
      const deltaX = e.clientX - touchStartX.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
        isDragging.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (deltaY > 0 && scrollTop <= 2) {
        const damped = Math.min(MAX_PULL, Math.pow(deltaY, 0.85) * 0.65);
        setPullDistance(damped);
        setIsPulling(true);

        if (damped >= THRESHOLD) {
          setSyncStatus('threshold');
          setStatusMessage('Lepas untuk sinkronisasi Google Sheet');
        } else {
          setSyncStatus('pulling');
          setStatusMessage('Tarik ke bawah untuk refresh');
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsPulling(false);

      if (pullDistance >= THRESHOLD && !isRefreshing) {
        setPullDistance(52);
        performSync();
      } else {
        setPullDistance(0);
        setSyncStatus('idle');
      }
    };

    // Attach non-passive touchmove so we can cancel native bounce when pulling
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRefreshing, isAnyModalOpen, pullDistance, performSync]);

  const rotationDeg = Math.min(180, (pullDistance / THRESHOLD) * 180);
  const showPill = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Floating Pull-to-Refresh Indicator Pill */}
      <div
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none ${
          showPill
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full shadow-xl backdrop-blur-md border text-xs font-medium tracking-tight bg-white/95 dark:bg-[#0d1017]/95 text-slate-800 dark:text-zinc-100 border-emerald-500/30 shadow-emerald-500/10">
          {syncStatus === 'refreshing' || isAppsScriptSyncing || isSheetsSyncing ? (
            <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />
          ) : syncStatus === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : syncStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          ) : syncStatus === 'threshold' ? (
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
          ) : (
            <div
              className="transition-transform duration-100 flex-shrink-0"
              style={{ transform: `rotate(${rotationDeg}deg)` }}
            >
              <ArrowDown className="w-4 h-4 text-emerald-500" />
            </div>
          )}

          <span className="truncate max-w-[220px]">
            {statusMessage ||
              (syncStatus === 'threshold'
                ? 'Lepas untuk sinkronisasi Google Sheet'
                : 'Tarik untuk refresh')}
          </span>
        </div>
      </div>

      {/* Main Content with subtle natural downward translation while pulling */}
      <div
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.35}px, 0)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
