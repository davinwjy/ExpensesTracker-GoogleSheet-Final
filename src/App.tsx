import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/DashboardView';
import { GlobalAnnouncementBanner } from './components/GlobalAnnouncementBanner';
import { AuthModal } from './components/AuthModal';
import { GlobalNotificationPopup } from './components/GlobalNotificationPopup';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { PullToRefresh } from './components/PullToRefresh';
import { Wallet, Loader2 } from 'lucide-react';

const TAB_ORDER = [
  'dashboard',
  'expenses',
  'budgeting',
  'accounts',
  'investments',
  'stats',
  'admin',
] as const;

const tabTransitionVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    y: 8,
    x: direction * 10,
    scale: 0.994,
  }),
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: -4,
    x: direction * -6,
    scale: 0.996,
    transition: {
      duration: 0.13,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  }),
};

// Lazy-loaded secondary views for faster initial bundle parse and first paint
const ExpensesView = lazy(() =>
  import('./components/ExpensesView').then((m) => ({ default: m.ExpensesView }))
);
const AccountsView = lazy(() =>
  import('./components/AccountsView').then((m) => ({ default: m.AccountsView }))
);
const InvestmentsView = lazy(() =>
  import('./components/InvestmentsView').then((m) => ({ default: m.InvestmentsView }))
);
const BudgetingView = lazy(() =>
  import('./components/BudgetingView').then((m) => ({ default: m.BudgetingView }))
);
const StatsView = lazy(() =>
  import('./components/StatsView').then((m) => ({ default: m.StatsView }))
);
const AdminView = lazy(() =>
  import('./components/AdminView').then((m) => ({ default: m.AdminView }))
);

// Lazy-loaded global modals
const AddExpenseModal = lazy(() =>
  import('./components/Modals/AddExpenseModal').then((m) => ({ default: m.AddExpenseModal }))
);
const TransferModal = lazy(() =>
  import('./components/Modals/TransferModal').then((m) => ({ default: m.TransferModal }))
);
const AccountModal = lazy(() =>
  import('./components/Modals/AccountModal').then((m) => ({ default: m.AccountModal }))
);
const InvestmentModal = lazy(() =>
  import('./components/Modals/InvestmentModal').then((m) => ({ default: m.InvestmentModal }))
);
const HoldingTypesModal = lazy(() =>
  import('./components/Modals/HoldingTypesModal').then((m) => ({ default: m.HoldingTypesModal }))
);
const PayBillModal = lazy(() =>
  import('./components/Modals/PayBillModal').then((m) => ({ default: m.PayBillModal }))
);
const BudgetModal = lazy(() =>
  import('./components/Modals/BudgetModal').then((m) => ({ default: m.BudgetModal }))
);
const FirebaseSetupModal = lazy(() =>
  import('./components/Modals/FirebaseSetupModal').then((m) => ({ default: m.FirebaseSetupModal }))
);
const GoogleSheetSetupModal = lazy(() =>
  import('./components/Modals/GoogleSheetSetupModal').then((m) => ({
    default: m.GoogleSheetSetupModal,
  }))
);
const MobileAppModal = lazy(() =>
  import('./components/Modals/MobileAppModal').then((m) => ({ default: m.MobileAppModal }))
);

const ViewLoadingSkeleton: React.FC = () => (
  <div className="space-y-4 py-2 animate-pulse">
    <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-[#131722]" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-24 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e]" />
      <div className="h-24 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e]" />
      <div className="h-24 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e]" />
    </div>
    <div className="h-64 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e]" />
  </div>
);

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    activeTab,
    isFirebaseSetupOpen,
    setIsFirebaseSetupOpen,
    isMobileAppModalOpen,
    setIsMobileAppModalOpen,
    isGoogleSheetSetupOpen,
    setIsGoogleSheetSetupOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useFinance();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('wealthtrack_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wealthtrack_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const mainRef = useRef<HTMLElement | null>(null);
  const prevTabIdxRef = useRef<number>(0);

  const currentTabIdx = Math.max(0, TAB_ORDER.indexOf(activeTab));
  const tabDirection =
    currentTabIdx === prevTabIdxRef.current
      ? 0
      : currentTabIdx > prevTabIdxRef.current
      ? 1
      : -1;

  useEffect(() => {
    prevTabIdxRef.current = currentTabIdx;
  }, [currentTabIdx]);

  // Automatically scroll viewport and container to top whenever menu/page changes
  useEffect(() => {
    // 1. Immediate scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
    } catch {}

    // 2. Post-render frame tick to guarantee top position after React DOM replacement
    const rafId = requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (mainRef.current) {
          mainRef.current.scrollTop = 0;
        }
      } catch {}
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
          <Wallet className="w-6 h-6 text-slate-950 font-bold" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Synchronizing WealthTrack session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#08090c] text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-150">
      {/* Modern Desktop Left Sidebar & Contextual Header */}
      <div className="flex flex-row min-h-screen w-full min-w-0">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
          <GlobalAnnouncementBanner />
          <TopHeader
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
          <OfflineSyncBanner />

          <PullToRefresh>
            <main ref={mainRef} className="flex-1 max-w-[1520px] w-full min-w-0 overflow-x-hidden mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5 pb-24 lg:pb-10">
              <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
                <motion.div
                  key={activeTab}
                  custom={tabDirection}
                  variants={tabTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full min-w-0"
                >
                  {activeTab === 'dashboard' && <DashboardView />}
                  <Suspense fallback={<ViewLoadingSkeleton />}>
                    {activeTab === 'expenses' && <ExpensesView />}
                    {activeTab === 'budgeting' && <BudgetingView />}
                    {activeTab === 'accounts' && <AccountsView />}
                    {activeTab === 'investments' && <InvestmentsView />}
                    {activeTab === 'stats' && <StatsView />}
                    {activeTab === 'admin' && <AdminView />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
          </PullToRefresh>
        </div>
      </div>

      {/* Mobile Floating Bottom Dock */}
      <MobileNav />

      {/* Global Modals (Lazy-loaded via Suspense) */}
      <Suspense fallback={null}>
        <AddExpenseModal />
        <TransferModal />
        <AccountModal />
        <InvestmentModal />
        <HoldingTypesModal />
        <PayBillModal />
        <BudgetModal />
        <FirebaseSetupModal
          isOpen={isFirebaseSetupOpen}
          onClose={() => setIsFirebaseSetupOpen(false)}
        />
        <GoogleSheetSetupModal
          isOpen={isGoogleSheetSetupOpen}
          onClose={() => setIsGoogleSheetSetupOpen(false)}
        />
        <MobileAppModal
          isOpen={isMobileAppModalOpen}
          onClose={() => setIsMobileAppModalOpen(false)}
        />
      </Suspense>

      {/* Global Success & Toast Popup Notification */}
      <GlobalNotificationPopup />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainAppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
