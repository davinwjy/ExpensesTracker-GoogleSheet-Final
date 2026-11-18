import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Delete,
  KeyRound,
  LogOut,
  X,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PinLockScreen: React.FC = () => {
  const {
    user,
    hasPin,
    isPinLocked,
    isChangePinOpen,
    verifyPin,
    savePin,
    closeChangePin,
    forgotPinRelogin,
    logout,
  } = useAuth();

  const mode: 'unlock' | 'setup' | 'change' = isChangePinOpen
    ? 'change'
    : !hasPin
    ? 'setup'
    : 'unlock';

  const [step, setStep] = useState<'unlock' | 'verify_current' | 'create_new' | 'confirm_new'>(
    mode === 'change' ? (hasPin ? 'verify_current' : 'create_new') : mode === 'setup' ? 'create_new' : 'unlock'
  );

  const [digits, setDigits] = useState<string>('');
  const [draftPin, setDraftPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    setDigits('');
    setDraftPin('');
    setErrorMsg('');
    setIsSaving(false);
    setIsSuccess(false);
    if (mode === 'change') {
      setStep(hasPin ? 'verify_current' : 'create_new');
    } else if (mode === 'setup') {
      setStep('create_new');
    } else {
      setStep('unlock');
    }
  }, [mode, hasPin]);

  const triggerError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setShakeKey((prev) => prev + 1);
    setTimeout(() => {
      setDigits('');
    }, 200);
  }, []);

  const handleCompleteFourDigits = useCallback(
    async (fullPin: string) => {
      if (isSaving || isSuccess) return;

      if (step === 'unlock') {
        const ok = verifyPin(fullPin);
        if (ok) {
          setIsSuccess(true);
        } else {
          triggerError('Incorrect PIN, try again');
        }
        return;
      }

      if (step === 'verify_current') {
        const ok = verifyPin(fullPin);
        if (ok) {
          setErrorMsg('');
          setDigits('');
          setStep('create_new');
        } else {
          triggerError('Current PIN is incorrect');
        }
        return;
      }

      if (step === 'create_new') {
        setDraftPin(fullPin);
        setErrorMsg('');
        setDigits('');
        setStep('confirm_new');
        return;
      }

      if (step === 'confirm_new') {
        if (fullPin !== draftPin) {
          triggerError('PIN confirmation does not match');
          return;
        }

        try {
          setIsSaving(true);
          setErrorMsg('');
          await savePin(fullPin);
          setIsSuccess(true);
        } catch (err: any) {
          triggerError(err?.message || 'Failed to save PIN');
          setIsSaving(false);
        }
      }
    },
    [step, draftPin, isSaving, isSuccess, verifyPin, savePin, triggerError]
  );

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (isSaving || isSuccess) return;
      if (errorMsg) setErrorMsg('');

      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          setTimeout(() => {
            handleCompleteFourDigits(next);
          }, 50);
        }
        return next;
      });
    },
    [isSaving, isSuccess, errorMsg, handleCompleteFourDigits]
  );

  const handleBackspace = useCallback(() => {
    if (isSaving || isSuccess) return;
    if (errorMsg) setErrorMsg('');
    setDigits((prev) => prev.slice(0, -1));
  }, [isSaving, isSuccess, errorMsg]);

  const handleClear = useCallback(() => {
    if (isSaving || isSuccess) return;
    setErrorMsg('');
    setDigits('');
  }, [isSaving, isSuccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' && mode === 'change') {
        e.preventDefault();
        closeChangePin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigitPress, handleBackspace, mode, closeChangePin]);

  if (!isPinLocked && hasPin && !isChangePinOpen) {
    return null;
  }

  const getHeaderTitle = () => {
    if (step === 'unlock') return 'Enter PIN';
    if (step === 'verify_current') return 'Verify Current PIN';
    if (step === 'create_new') {
      return mode === 'change' ? 'New 4-Digit PIN' : 'Set 4-Digit PIN';
    }
    return 'Confirm PIN';
  };

  const getHeaderSubtitle = () => {
    if (step === 'unlock') return user?.email || 'Enter your 4-digit security PIN';
    if (step === 'verify_current') return 'Enter your current 4-digit PIN';
    if (step === 'create_new') return 'Choose a 4-digit security PIN';
    return 'Re-enter the same 4-digit PIN';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="pin-modal-card relative w-full max-w-[356px] sm:max-w-[292px] rounded-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.65)] px-5 py-5 sm:px-4 sm:py-4 flex flex-col items-center"
      >
        {/* Top Minimalist Header Row */}
        <div className="w-full flex items-center justify-between mb-1">
          {step === 'confirm_new' ? (
            <button
              type="button"
              onClick={() => {
                setDigits('');
                setErrorMsg('');
                setStep('create_new');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-white transition-colors cursor-pointer py-0.5 px-1.5 -ml-1.5 rounded-md hover:bg-[#1d2230]"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Compact Center Icon + Title */}
          <div className="flex items-center gap-2 sm:gap-1.5">
            <div className="w-6 h-6 sm:w-5 sm:h-5 rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              {isSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-emerald-400" />
              ) : step === 'unlock' ? (
                <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-blue-400" />
              ) : (
                <KeyRound className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-blue-400" />
              )}
            </div>
            <h2 className="pin-modal-title text-base sm:text-sm font-bold tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>

          {mode === 'change' ? (
            <button
              type="button"
              onClick={closeChangePin}
              className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1d2230] transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="w-5" />
          )}
        </div>

        {/* Single-line compact subtitle */}
        <p className="text-xs sm:text-[11px] text-zinc-400 truncate max-w-[290px] sm:max-w-[240px] text-center mb-3.5 sm:mb-3">
          {getHeaderSubtitle()}
        </p>

        {/* Minimalist 4-Dot Indicator Pill */}
        <motion.div
          key={shakeKey}
          animate={
            shakeKey > 0 && errorMsg
              ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.32 }}
          className={`flex items-center justify-center gap-4 sm:gap-3.5 px-6 py-3 sm:px-5 sm:py-2.5 rounded-xl border transition-colors ${
            errorMsg
              ? 'bg-rose-500/15 border-rose-500/50'
              : 'bg-[#0b0d13] border-[#242a38]'
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < digits.length;
            const hasError = Boolean(errorMsg);
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 sm:w-3 sm:h-3 rounded-full transition-all duration-150 ${
                  hasError
                    ? 'bg-rose-400 scale-105 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : isFilled
                    ? 'bg-blue-400 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.85)]'
                    : 'bg-[#262d3d] border border-[#384157]'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Compact Status / Error Feedback */}
        <div className="h-5 flex items-center justify-center my-1 text-center">
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-medium"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving PIN...</span>
              </motion.div>
            ) : errorMsg ? (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-medium text-rose-400"
              >
                {errorMsg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* High-Contrast 3x4 Numeric Keypad (Larger ergonomic buttons on mobile, compact on desktop) */}
        <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSaving}
              onClick={() => handleDigitPress(num)}
              className="pin-key-btn h-14 sm:h-11 rounded-xl border font-mono text-2xl sm:text-lg font-bold flex items-center justify-center transition-all duration-100 active:scale-95 cursor-pointer shadow-sm touch-manipulation disabled:opacity-50"
            >
              <span>{num}</span>
            </button>
          ))}

          <button
            type="button"
            disabled={isSaving || digits.length === 0}
            onClick={handleClear}
            title="Reset"
            className="pin-key-action-btn h-14 sm:h-11 rounded-xl border text-xs sm:text-[11px] font-semibold flex items-center justify-center transition-all duration-100 active:scale-95 cursor-pointer touch-manipulation disabled:opacity-35"
          >
            <RotateCcw className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleDigitPress('0')}
            className="pin-key-btn h-14 sm:h-11 rounded-xl border font-mono text-2xl sm:text-lg font-bold flex items-center justify-center transition-all duration-100 active:scale-95 cursor-pointer shadow-sm touch-manipulation disabled:opacity-50"
          >
            <span>0</span>
          </button>

          <button
            type="button"
            disabled={isSaving || digits.length === 0}
            onClick={handleBackspace}
            title="Delete"
            className="pin-key-action-btn h-14 sm:h-11 rounded-xl border flex items-center justify-center transition-all duration-100 active:scale-95 cursor-pointer touch-manipulation disabled:opacity-35"
          >
            <Delete className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Footer Actions */}
        {(mode === 'unlock' || mode === 'setup') && (
          <div
            className={`w-full mt-4 pt-3 sm:mt-3 sm:pt-2.5 border-t border-[#222836] flex items-center text-xs sm:text-[11px] ${
              mode === 'unlock' ? 'justify-between' : 'justify-end'
            }`}
          >
            {mode === 'unlock' && (
              <button
                type="button"
                onClick={forgotPinRelogin}
                className="py-1 text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
              >
                Forgot PIN?
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="py-1 inline-flex items-center gap-1.5 sm:gap-1 text-zinc-400 hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
