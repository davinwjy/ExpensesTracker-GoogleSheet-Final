import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { isFirebaseActive, firebaseAuth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export const AuthModal: React.FC = () => {
  const { login, register, quickDemoLogin } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (mode === 'forgot_password') {
        setMode('login');
        setError('');
        setSuccessMsg('');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'forgot_password') {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      setIsSubmitting(true);
      try {
        let resetSent = false;
        if (isFirebaseActive() && firebaseAuth) {
          try {
            await sendPasswordResetEmail(firebaseAuth, cleanEmail);
            resetSent = true;
          } catch (fbErr: any) {
            console.warn('Firebase password reset failed or user not in Firebase auth, trying server API:', fbErr);
          }
        }

        if (!resetSent) {
          try {
            await api.forgotPassword(cleanEmail);
            resetSent = true;
          } catch (apiErr: any) {
            console.warn('Server password reset API failed:', apiErr);
          }
        }

        setSuccessMsg(
          `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox or spam folder.`
        );
      } catch (err: any) {
        setError(
          err?.message || 'Failed to send password reset email. Please ensure the email address is registered.'
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('Invalid email or password') ||
        msg.includes('not found') ||
        msg.includes('Authentication failed') ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password') ||
        msg.includes('user-not-found')
      ) {
        setError(
          'Invalid email or password. Please check your credentials or register a new account.'
        );
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too short. Please use at least 6 characters.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await quickDemoLogin();
    } catch (err: any) {
      setError(err?.message || 'Failed to start demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (targetMode: 'login' | 'register' | 'forgot_password') => {
    if (targetMode === 'forgot_password') {
      window.history.pushState({ authView: 'forgot_password' }, '');
    }
    setMode(targetMode);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#08090c] text-slate-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-200">
      {/* Subtle Ambient Glow & Architectural Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#64748b0d_1px,transparent_1px),linear-gradient(to_bottom,#64748b0d_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] bg-emerald-500/10 dark:bg-emerald-500/8 rounded-full blur-3xl" />

      <div className="w-full max-w-[420px] bg-white dark:bg-[#0d1017] border border-slate-200/90 dark:border-[#1b212e] rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-2xl dark:shadow-black/60 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Brand Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 items-center justify-center mb-4 shadow-xs">
            {mode === 'forgot_password' ? (
              <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            ) : (
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
              ? 'Create your account'
              : 'Reset your password'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            {mode === 'login'
              ? 'Sign in to manage your portfolio, cash flow, and budgets.'
              : mode === 'register'
              ? 'Get started with unified personal finance and investment tracking.'
              : 'Enter your registered email address and we will send you a password reset link.'}
          </p>
        </div>

        {/* Main Form Body */}
        <div className="px-6 pb-7">
          {/* Segmented Mode Switcher (Only for Login / Register) */}
          {mode !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#121620] rounded-xl border border-slate-200/80 dark:border-[#1d2332] text-xs font-semibold mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#1d2434] text-slate-900 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#1d2434] text-slate-900 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs leading-relaxed animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    className="w-full bg-slate-50/80 dark:bg-[#121620] border border-slate-200 dark:border-[#1f2637] focus:bg-white dark:focus:bg-[#151a26] focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus={mode === 'forgot_password'}
                  className="w-full bg-slate-50/80 dark:bg-[#121620] border border-slate-200 dark:border-[#1f2637] focus:bg-white dark:focus:bg-[#151a26] focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-slate-50/80 dark:bg-[#121620] border border-slate-200 dark:border-[#1f2637] focus:bg-white dark:focus:bg-[#151a26] focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {mode === 'forgot_password' ? 'Sending Reset Link...' : 'Authenticating...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? 'Sign In'
                      : mode === 'register'
                      ? 'Create Account'
                      : 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Footer Links */}
          {mode === 'forgot_password' ? (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#191f2d] text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#191f2d] text-center space-y-2.5">
              {mode === 'login' && (
                <div>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                >
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                <span>Just exploring?</span>
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={isSubmitting}
                  className="font-medium text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Try Demo Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
