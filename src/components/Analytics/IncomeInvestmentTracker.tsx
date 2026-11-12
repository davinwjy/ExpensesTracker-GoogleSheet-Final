import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Layers,
  ChevronDown,
  Table as TableIcon,
  LineChart as LineChartIcon,
  BarChart3,
  Sparkles,
  Wallet,
  MousePointer,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMasked } from '../../lib/formatters';

export function formatCompactIdr(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} jt`;
  }
  if (abs >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return `Rp ${Math.round(amount)}`;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface MonthlyPoint {
  type: 'month';
  monthIndex: number;
  monthName: string;
  fullMonthName: string;
  year: number;
  income: number;
  expense: number;
  investment: number;
  accountBalance: number;
  incomeCount: number;
  expenseCount: number;
  investmentCount: number;
}

export interface YearlyPoint {
  type: 'year';
  year: number;
  income: number;
  expense: number;
  investment: number;
  accountBalance: number;
  incomeCount: number;
  expenseCount: number;
  investmentCount: number;
}

export type ChartPoint = MonthlyPoint | YearlyPoint;

// Generate clean linear SVG path connecting points directly without curve overshoots
function generateLinearPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

// Generate closed area path for gradients
function generateAreaPath(points: { x: number; y: number }[], bottomY: number): string {
  if (points.length === 0) return '';
  const linePath = generateLinearPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;
}

// Safe popup positioning for mobile phones and desktop (never cuts off at screen borders)
function getSafePopupPosition(xPct: number): React.CSSProperties {
  if (xPct <= 22) {
    return { left: '8px', right: 'auto', transform: 'none' };
  }
  if (xPct >= 78) {
    return { right: '8px', left: 'auto', transform: 'none' };
  }
  return { left: `${xPct}%`, transform: 'translateX(-50%)' };
}

export const IncomeInvestmentTracker: React.FC = () => {
  const { accounts, transactions, investments, usdIdrRate, isPrivacyMode } = useFinance();

  // Mode: 'month' or 'year' (single active chart, never stacked)
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  // Chart visual style: default is 'line'
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  // Metric filter: 'all' (all 4 lines!), 'income', 'expense', 'investment', or 'account'
  const [viewMetric, setViewMetric] = useState<'all' | 'income' | 'expense' | 'investment' | 'account'>('all');
  const [showTable, setShowTable] = useState(false);

  // Responsive viewport detection so SVG coordinate space is 1:1 proportional on mobile and desktop (never squished/gepeng)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const svgW = isMobile ? 380 : 760;
  const svgH = isMobile ? 250 : 330;
  const svgPad = useMemo(
    () =>
      isMobile
        ? { top: 28, bottom: 30, left: 16, right: 16 }
        : { top: 32, bottom: 40, left: 28, right: 28 },
    [isMobile]
  );

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const todayStr = new Date().toISOString().split('T')[0];

  // Active month index for tooltip & indicator (defaults to current month, never null so data is immediately visible)
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(currentMonthIdx);
  const [, setIsMonthHovered] = useState<boolean>(false);

  // Active year index for tooltip & indicator
  const [activeYearIdx, setActiveYearIdx] = useState<number | null>(null);
  const [, setIsYearHovered] = useState<boolean>(false);

  // Current liquid cash balance across bank, cash & e-wallet accounts (excluding credit cards / paylater debt)
  const currentTotalAccountBalance = useMemo(() => {
    return accounts
      .filter((a) => a.type !== 'credit_card' && a.type !== 'paylater')
      .reduce((acc, a) => acc + (a.balance || 0), 0);
  }, [accounts]);

  // Detect all recorded years
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(currentYear);
    yearSet.add(currentYear - 1);

    transactions.forEach((tx) => {
      if (tx.date) {
        const y = parseInt(tx.date.split('-')[0], 10);
        if (!isNaN(y) && y > 2000 && y < 2100) yearSet.add(y);
      }
    });

    investments.forEach((inv) => {
      if (inv.createdAt) {
        const y = new Date(inv.createdAt).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearSet.add(y);
      }
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions, investments, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || currentYear);

  // -------------------------------------------------------------
  // DATA EXTRACTION & HISTORICAL BALANCE RECONSTRUCTION
  // -------------------------------------------------------------
  const { monthlyData, yearlyData, ytdStats } = useMemo(() => {
    // 1. Monthly array for selectedYear
    const months: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
      type: 'month' as const,
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      fullMonthName: FULL_MONTH_NAMES[i],
      year: selectedYear,
      income: 0,
      expense: 0,
      investment: 0,
      accountBalance: 0,
      incomeCount: 0,
      expenseCount: 0,
      investmentCount: 0,
    }));

    // 2. Yearly map
    const yearMap: Record<number, YearlyPoint> = {};
    availableYears.forEach((y) => {
      yearMap[y] = {
        type: 'year' as const,
        year: y,
        income: 0,
        expense: 0,
        investment: 0,
        accountBalance: 0,
        incomeCount: 0,
        expenseCount: 0,
        investmentCount: 0,
      };
    });

    // 3. Process transactions
    const bankToInvTotalPerInv: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const parts = tx.date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;

      if (isNaN(y) || isNaN(m)) return;

      if (!yearMap[y]) {
        yearMap[y] = {
          type: 'year' as const,
          year: y,
          income: 0,
          expense: 0,
          investment: 0,
          accountBalance: 0,
          incomeCount: 0,
          expenseCount: 0,
          investmentCount: 0,
        };
      }

      // Check Income (Exclude credit card/paylater debt refunds; only count liquid bank/cash/ewallet income)
      if (tx.type === 'income') {
        const acc = accounts.find((a) => a.id === tx.accountId);
        if (!acc || (acc.type !== 'credit_card' && acc.type !== 'paylater')) {
          const amt = tx.amount || 0;
          if (y === selectedYear && m >= 0 && m < 12) {
            months[m].income += amt;
            months[m].incomeCount += 1;
          }
          yearMap[y].income += amt;
          yearMap[y].incomeCount += 1;
        }
      }

      // Check Expenses (Exclude credit card usage; only count bank/cash expenses & CC bill payments)
      if (tx.type === 'expense') {
        const acc = accounts.find((a) => a.id === tx.accountId);
        if (!acc || (acc.type !== 'credit_card' && acc.type !== 'paylater')) {
          const amt = tx.amount || 0;
          if (y === selectedYear && m >= 0 && m < 12) {
            months[m].expense += amt;
            months[m].expenseCount += 1;
          }
          yearMap[y].expense += amt;
          yearMap[y].expenseCount += 1;
        }
      }

      // Check Investment Inflows:
      if (tx.type === 'bank_to_investment') {
        const amt = tx.amount || 0;
        if (y === selectedYear && m >= 0 && m < 12) {
          months[m].investment += amt;
          months[m].investmentCount += 1;
        }
        yearMap[y].investment += amt;
        yearMap[y].investmentCount += 1;

        if (tx.toInvestmentId) {
          bankToInvTotalPerInv[tx.toInvestmentId] = (bankToInvTotalPerInv[tx.toInvestmentId] || 0) + amt;
        }
      } else if (
        (tx.type === 'expense' || tx.type === 'transfer') &&
        (tx.category?.toLowerCase().includes('invest') ||
          tx.category?.toLowerCase().includes('saham') ||
          tx.category?.toLowerCase().includes('reksadana') ||
          tx.category?.toLowerCase().includes('crypto') ||
          tx.toInvestmentId)
      ) {
        const amt = tx.amount || 0;
        if (y === selectedYear && m >= 0 && m < 12) {
          months[m].investment += amt;
          months[m].investmentCount += 1;
        }
        yearMap[y].investment += amt;
        yearMap[y].investmentCount += 1;
      }
    });

    // 4. Attribute initial investment cost basis (if created directly)
    investments.forEach((inv) => {
      const invDate = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!invDate || isNaN(invDate.getTime())) return;

      const y = invDate.getFullYear();
      const m = invDate.getMonth();

      const costIdr =
        inv.currency === 'USD'
          ? (inv.amountInvested || 0) * (usdIdrRate || 15850)
          : inv.amountInvested || 0;

      const alreadyCovered = bankToInvTotalPerInv[inv.id] || 0;
      const remainderCost = Math.max(0, costIdr - alreadyCovered);

      if (remainderCost > 0) {
        if (!yearMap[y]) {
          yearMap[y] = {
            type: 'year' as const,
            year: y,
            income: 0,
            expense: 0,
            investment: 0,
            accountBalance: 0,
            incomeCount: 0,
            expenseCount: 0,
            investmentCount: 0,
          };
        }
        if (y === selectedYear && m >= 0 && m < 12) {
          months[m].investment += remainderCost;
          months[m].investmentCount += 1;
        }
        yearMap[y].investment += remainderCost;
        yearMap[y].investmentCount += 1;
      }
    });

    // 4b. CUMULATIVE MONTHLY INVESTMENT RECONSTRUCTION (Carry forward to subsequent months)
    let cumulativeInvestSum = 0;
    const startOfSelYear = `${selectedYear}-01-01`;

    transactions.forEach((tx) => {
      if (!tx.date || tx.date >= startOfSelYear) return;
      if (
        tx.type === 'bank_to_investment' ||
        ((tx.type === 'expense' || tx.type === 'transfer') &&
          (tx.category?.toLowerCase().includes('invest') ||
            tx.category?.toLowerCase().includes('saham') ||
            tx.category?.toLowerCase().includes('reksadana') ||
            tx.category?.toLowerCase().includes('crypto') ||
            tx.toInvestmentId))
      ) {
        cumulativeInvestSum += (tx.amount || 0);
      }
    });

    investments.forEach((inv) => {
      const invDateStr = inv.createdAt ? inv.createdAt.split('T')[0] : '';
      if (!invDateStr || invDateStr >= startOfSelYear) return;
      const costIdr =
        inv.currency === 'USD'
          ? (inv.amountInvested || 0) * (usdIdrRate || 15850)
          : inv.amountInvested || 0;
      cumulativeInvestSum += costIdr;
    });

    months.forEach((mObj) => {
      const thisMonthNew = mObj.investment;
      cumulativeInvestSum += thisMonthNew;
      mObj.investment = cumulativeInvestSum;
    });

    // 5. RECONSTRUCT HISTORICAL ACCOUNT AMOUNT / LIQUID CASH TRAJECTORY
    months.forEach((mObj, idx) => {
      const lastDayOfMonth = new Date(selectedYear, idx + 1, 0);
      const targetIsoDate = lastDayOfMonth.toISOString().split('T')[0];

      if (selectedYear > currentYear || (selectedYear === currentYear && idx > currentMonthIdx)) {
        mObj.accountBalance = Math.max(0, currentTotalAccountBalance);
      } else if (selectedYear === currentYear && idx === currentMonthIdx) {
        mObj.accountBalance = Math.max(0, currentTotalAccountBalance);
      } else {
        let balanceDelta = 0;
        transactions.forEach((tx) => {
          if (!tx.date || tx.date <= targetIsoDate || tx.date > todayStr) return;
          if (tx.type === 'income') {
            balanceDelta -= tx.amount;
          } else if (tx.type === 'expense' || tx.type === 'bank_to_investment') {
            balanceDelta += tx.amount;
          }
        });
        mObj.accountBalance = Math.max(0, currentTotalAccountBalance + balanceDelta);
      }
    });

    // Reconstruct year-end account balances
    availableYears.forEach((yr) => {
      if (!yearMap[yr]) return;
      if (yr > currentYear) {
        yearMap[yr].accountBalance = currentTotalAccountBalance;
      } else if (yr === currentYear) {
        yearMap[yr].accountBalance = currentTotalAccountBalance;
      } else {
        const yearEndIso = `${yr}-12-31`;
        let balanceDelta = 0;
        transactions.forEach((tx) => {
          if (!tx.date || tx.date <= yearEndIso || tx.date > todayStr) return;
          if (tx.type === 'income') {
            balanceDelta -= tx.amount;
          } else if (tx.type === 'expense' || tx.type === 'bank_to_investment') {
            balanceDelta += tx.amount;
          }
        });
        yearMap[yr].accountBalance = Math.max(0, currentTotalAccountBalance + balanceDelta);
      }
    });

    const sortedYears = Object.values(yearMap).sort((a, b) => a.year - b.year);

    // CUMULATIVE YEARLY INVESTMENT RECONSTRUCTION (Carry forward to subsequent years)
    const earliestYear = sortedYears.length > 0 ? sortedYears[0].year : currentYear;
    let cumulativeYearlyInvest = 0;
    const startOfEarliestYear = `${earliestYear}-01-01`;

    transactions.forEach((tx) => {
      if (!tx.date || tx.date >= startOfEarliestYear) return;
      if (
        tx.type === 'bank_to_investment' ||
        ((tx.type === 'expense' || tx.type === 'transfer') &&
          (tx.category?.toLowerCase().includes('invest') ||
            tx.category?.toLowerCase().includes('saham') ||
            tx.category?.toLowerCase().includes('reksadana') ||
            tx.category?.toLowerCase().includes('crypto') ||
            tx.toInvestmentId))
      ) {
        cumulativeYearlyInvest += (tx.amount || 0);
      }
    });

    investments.forEach((inv) => {
      const invDateStr = inv.createdAt ? inv.createdAt.split('T')[0] : '';
      if (!invDateStr || invDateStr >= startOfEarliestYear) return;
      const costIdr =
        inv.currency === 'USD'
          ? (inv.amountInvested || 0) * (usdIdrRate || 15850)
          : inv.amountInvested || 0;
      cumulativeYearlyInvest += costIdr;
    });

    sortedYears.forEach((yObj) => {
      const newThisYear = yObj.investment;
      cumulativeYearlyInvest += newThisYear;
      yObj.investment = cumulativeYearlyInvest;
    });

    // Selected Year Stats
    const totalYearIncome = months.reduce((acc, m) => acc + m.income, 0);
    const totalYearExpense = months.reduce((acc, m) => acc + m.expense, 0);
    const totalYearInvest = months.reduce((acc, m) => acc + m.investment, 0);
    const yearInvestRate = totalYearIncome > 0 ? (totalYearInvest / totalYearIncome) * 100 : 0;
    const yearSavings = totalYearIncome - totalYearExpense - totalYearInvest;

    const prevYearData = yearMap[selectedYear - 1];
    let yoyIncomeGrowth: number | null = null;
    let yoyExpenseGrowth: number | null = null;
    let yoyInvestGrowth: number | null = null;

    if (prevYearData && prevYearData.income > 0) {
      yoyIncomeGrowth = ((totalYearIncome - prevYearData.income) / prevYearData.income) * 100;
    }
    if (prevYearData && prevYearData.expense > 0) {
      yoyExpenseGrowth = ((totalYearExpense - prevYearData.expense) / prevYearData.expense) * 100;
    }
    if (prevYearData && prevYearData.investment > 0) {
      yoyInvestGrowth = ((totalYearInvest - prevYearData.investment) / prevYearData.investment) * 100;
    }

    return {
      monthlyData: months,
      yearlyData: sortedYears,
      ytdStats: {
        totalIncome: totalYearIncome,
        totalExpense: totalYearExpense,
        totalInvestment: totalYearInvest,
        currentAccountBalance: currentTotalAccountBalance,
        investmentRate: yearInvestRate,
        netSavings: yearSavings,
        yoyIncomeGrowth,
        yoyExpenseGrowth,
        yoyInvestGrowth,
      },
    };
  }, [transactions, investments, accounts, currentTotalAccountBalance, selectedYear, availableYears, usdIdrRate, currentYear, currentMonthIdx, todayStr]);

  // Scaling helpers for Graph SVGs
  const getScaleData = useCallback(
    (points: ChartPoint[], width: number, height: number, padding: { top: number; bottom: number; left: number; right: number }) => {
      let max = 0;
      points.forEach((p) => {
        if (viewMetric === 'all') {
          max = Math.max(max, p.income, p.expense, p.investment, p.accountBalance);
        } else if (viewMetric === 'income') {
          max = Math.max(max, p.income);
        } else if (viewMetric === 'expense') {
          max = Math.max(max, p.expense);
        } else if (viewMetric === 'investment') {
          max = Math.max(max, p.investment);
        } else {
          max = Math.max(max, p.accountBalance);
        }
      });

      const safeMax = max > 0 ? max * 1.22 : 10_000_000;
      const innerW = width - padding.left - padding.right;
      const innerH = height - padding.top - padding.bottom;
      const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW / 2;

      const incomeCoords = points.map((p, idx) => ({
        x: padding.left + idx * stepX,
        y: padding.top + innerH - (p.income / safeMax) * innerH,
        data: p,
        index: idx,
      }));

      const expenseCoords = points.map((p, idx) => ({
        x: padding.left + idx * stepX,
        y: padding.top + innerH - (p.expense / safeMax) * innerH,
        data: p,
        index: idx,
      }));

      const investCoords = points.map((p, idx) => ({
        x: padding.left + idx * stepX,
        y: padding.top + innerH - (p.investment / safeMax) * innerH,
        data: p,
        index: idx,
      }));

      const accountCoords = points.map((p, idx) => ({
        x: padding.left + idx * stepX,
        y: padding.top + innerH - (p.accountBalance / safeMax) * innerH,
        data: p,
        index: idx,
      }));

      const bottomY = padding.top + innerH;

      const ticks = [
        { val: safeMax, y: padding.top },
        { val: safeMax * 0.75, y: padding.top + innerH * 0.25 },
        { val: safeMax * 0.5, y: padding.top + innerH * 0.5 },
        { val: safeMax * 0.25, y: padding.top + innerH * 0.75 },
        { val: 0, y: bottomY },
      ];

      return {
        incomeCoords,
        expenseCoords,
        investCoords,
        accountCoords,
        bottomY,
        innerW,
        innerH,
        safeMax,
        ticks,
        stepX,
      };
    },
    [viewMetric]
  );

  const monthScale = useMemo(
    () => getScaleData(monthlyData, svgW, svgH, svgPad),
    [monthlyData, getScaleData, svgW, svgH, svgPad]
  );
  const yearScale = useMemo(
    () => getScaleData(yearlyData, svgW, svgH, svgPad),
    [yearlyData, getScaleData, svgW, svgH, svgPad]
  );

  // Unified touch, mouse, and pointer index resolver with exact SVG matrix transformation
  const resolveCoordIndex = useCallback(
    (
      clientX: number,
      clientY: number,
      target: SVGSVGElement,
      coords: { x: number }[],
      setIdx: (idx: number) => void
    ) => {
      let svgX: number | null = null;
      try {
        if (typeof target.getScreenCTM === 'function') {
          const ctm = target.getScreenCTM();
          if (ctm) {
            const pt = target.createSVGPoint();
            pt.x = clientX;
            pt.y = clientY;
            const transformed = pt.matrixTransform(ctm.inverse());
            if (!isNaN(transformed.x)) {
              svgX = transformed.x;
            }
          }
        }
      } catch {
        // fallback below
      }

      if (svgX === null || isNaN(svgX)) {
        const rect = target.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        const relX = clientX - rect.left;
        svgX = (relX / rect.width) * svgW;
      }

      let closest = 0;
      let minDist = Infinity;
      coords.forEach((c, i) => {
        const dist = Math.abs(c.x - svgX!);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setIdx(closest);
    },
    [svgW]
  );

  // Safe active indexes & objects (guaranteed non-null on both mobile & desktop)
  const safeMonthIdx = Math.max(0, Math.min(monthlyData.length - 1, activeMonthIdx));
  const activeMonthPoint = monthlyData[safeMonthIdx];

  const defaultYearIdx = Math.max(0, yearlyData.length - 1);
  const safeYearIdx = activeYearIdx !== null ? Math.max(0, Math.min(yearlyData.length - 1, activeYearIdx)) : defaultYearIdx;
  const activeYearPoint = yearlyData[safeYearIdx] || yearlyData[0];

  const lineStrokeWidth = isMobile ? 2.4 : 3.2;
  const activeDotR = isMobile ? 4.8 : 6;
  const idleDotR = isMobile ? 2.8 : 3.5;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* SECTION WRAPPER */}
      <div className="rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] p-3 sm:p-5 space-y-3.5 sm:space-y-4 font-mono shadow-sm">
        {/* HEADER */}
        <div className="pb-2.5 sm:pb-3 border-b border-slate-200 dark:border-[#1b212e]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <LineChartIcon className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider leading-snug">
              INCOME, EXPENSES, INVESTMENTS & CASH BALANCES
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 leading-relaxed">
            Multi-axis trend lines tracking monthly income, daily outflows, investment funding, and bank runways
          </p>
        </div>

        {/* 4-KPI SUMMARY METRICS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
          {/* Total Income */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium truncate">Income {selectedYear}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <p className={`text-xs sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(ytdStats.totalIncome, 'IDR', isPrivacyMode)}
            </p>
            <p className={`text-[10px] text-slate-400 dark:text-slate-500 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              Avg: {formatMasked(ytdStats.totalIncome / 12, 'IDR', isPrivacyMode)}/mo
            </p>
          </div>

          {/* Total Expenses */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium truncate">Expenses {selectedYear}</span>
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            </div>
            <p className={`text-xs sm:text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(ytdStats.totalExpense, 'IDR', isPrivacyMode)}
            </p>
            <p className={`text-[10px] text-slate-400 dark:text-slate-500 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              Avg: {formatMasked(ytdStats.totalExpense / 12, 'IDR', isPrivacyMode)}/mo
            </p>
          </div>

          {/* Total Invested */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium truncate">Invested {selectedYear}</span>
              <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            </div>
            <p className={`text-xs sm:text-lg font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(ytdStats.totalInvestment, 'IDR', isPrivacyMode)}
            </p>
            <p className={`text-[10px] text-slate-400 dark:text-slate-500 tabular-nums truncate ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              Avg: {formatMasked(ytdStats.totalInvestment / 12, 'IDR', isPrivacyMode)}/mo
            </p>
          </div>

          {/* Total Account Amount / Liquid Cash */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium truncate">Liquid Cash</span>
              <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            </div>
            <p className={`text-xs sm:text-lg font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 break-words ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(currentTotalAccountBalance, 'IDR', isPrivacyMode)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-sky-500 inline shrink-0" />
              <span className="truncate">Bank & Cash Accounts</span>
            </p>
          </div>
        </div>

        {/* UNIFIED FILTER & DISPLAY BAR (Mobile-optimized layout) */}
        <div className="flex flex-col gap-2.5 p-2.5 sm:p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Top Row: Single Chart Mode Toggle (Monthly vs Yearly) & Year Selector */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <div className="flex p-0.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'month'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('year')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'year'
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Yearly</span>
                </button>
              </div>
            </div>

            {viewMode === 'month' ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase font-sans hidden xs:inline">
                  Year:
                </span>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-white dark:bg-slate-900 text-slate-900 dark:text-zinc-200 text-xs font-bold font-mono pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                {yearlyData.length} Years Tracked
              </span>
            )}
          </div>

          {/* Bottom Row: Metric Filter, Chart Style & Table */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Metric Filter */}
            <div className="grid grid-cols-5 sm:flex p-0.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-semibold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMetric('all')}
                className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                  viewMetric === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setViewMetric('income')}
                className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                  viewMetric === 'income'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setViewMetric('expense')}
                className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                  viewMetric === 'expense'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setViewMetric('investment')}
                className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                  viewMetric === 'investment'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Invest
              </button>
              <button
                type="button"
                onClick={() => setViewMetric('account')}
                className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-center truncate ${
                  viewMetric === 'account'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Cash
              </button>
            </div>

            {/* Right Group: Chart Style & Table */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <div className="flex p-0.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    chartType === 'line'
                      ? 'bg-slate-900 text-emerald-400 dark:bg-slate-800 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Line Graph View"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    chartType === 'bar'
                      ? 'bg-slate-900 text-indigo-400 dark:bg-slate-800 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Bar Chart View"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Bar</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowTable(!showTable)}
                className={`py-1.5 px-2.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showTable
                    ? 'bg-slate-900 text-white dark:bg-slate-800 border-slate-700'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>{showTable ? 'Hide Table' : 'Table'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* GRAPH 1: MONTH BY MONTH GRAPH (SHOWN ONLY WHEN viewMode === 'month') */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'month' && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Trajectory ({selectedYear})
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] font-mono">
                {(viewMetric === 'all' || viewMetric === 'income') && (
                  <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Income
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'expense') && (
                  <span className="text-rose-500 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    Expenses
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'investment') && (
                  <span className="text-indigo-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                    Invest
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'account') && (
                  <span className="text-sky-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    Cash
                  </span>
                )}
              </div>
            </div>

            {/* PROPORTIONAL 1-SCREEN SVG GRAPH CONTAINER */}
            <div className="relative w-full rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-2 sm:p-4 select-none">
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-auto overflow-visible cursor-crosshair select-none block"
                  style={{ touchAction: 'pan-y' }}
                  onPointerDown={(e) => {
                    resolveCoordIndex(e.clientX, e.clientY, e.currentTarget, monthScale.incomeCoords, setActiveMonthIdx);
                    setIsMonthHovered(true);
                  }}
                  onPointerMove={(e) => {
                    resolveCoordIndex(e.clientX, e.clientY, e.currentTarget, monthScale.incomeCoords, setActiveMonthIdx);
                    setIsMonthHovered(true);
                  }}
                  onPointerLeave={() => setIsMonthHovered(false)}
                >
                  <defs>
                    <linearGradient id="month-income-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="month-expense-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="month-invest-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="month-account-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y-Axis Gridlines */}
                  {monthScale.ticks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={svgPad.left - 4}
                        y1={tick.y}
                        x2={svgW - svgPad.right + 4}
                        y2={tick.y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800/80"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={svgPad.left - 2}
                        y={tick.y - 4}
                        fill="currentColor"
                        fontSize={isMobile ? 8.5 : 10}
                        className="font-mono text-slate-400 dark:text-slate-500 fill-current"
                      >
                        {formatCompactIdr(tick.val)}
                      </text>
                    </g>
                  ))}

                  {chartType === 'line' ? (
                    <>
                      {/* AREA FILLS */}
                      {(viewMetric === 'all' || viewMetric === 'account') && (
                        <path
                          d={generateAreaPath(monthScale.accountCoords, monthScale.bottomY)}
                          fill="url(#month-account-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'income') && (
                        <path
                          d={generateAreaPath(monthScale.incomeCoords, monthScale.bottomY)}
                          fill="url(#month-income-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'expense') && (
                        <path
                          d={generateAreaPath(monthScale.expenseCoords, monthScale.bottomY)}
                          fill="url(#month-expense-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'investment') && (
                        <path
                          d={generateAreaPath(monthScale.investCoords, monthScale.bottomY)}
                          fill="url(#month-invest-grad)"
                        />
                      )}

                      {/* LINE PATHS */}
                      {(viewMetric === 'all' || viewMetric === 'account') && (
                        <path
                          d={generateLinearPath(monthScale.accountCoords)}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'income') && (
                        <path
                          d={generateLinearPath(monthScale.incomeCoords)}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'expense') && (
                        <path
                          d={generateLinearPath(monthScale.expenseCoords)}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'investment') && (
                        <path
                          d={generateLinearPath(monthScale.investCoords)}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Active vertical crosshair guide line */}
                      {monthScale.incomeCoords[safeMonthIdx] && (
                        <line
                          x1={monthScale.incomeCoords[safeMonthIdx].x}
                          y1={svgPad.top - 6}
                          x2={monthScale.incomeCoords[safeMonthIdx].x}
                          y2={monthScale.bottomY}
                          stroke="#94a3b8"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                          className="transition-all duration-75 pointer-events-none"
                        />
                      )}

                      {/* DATA POINTS & EXACT COLUMN INTERACTION */}
                      {monthlyData.map((pt, idx) => {
                        const incPt = monthScale.incomeCoords[idx];
                        const expPt = monthScale.expenseCoords[idx];
                        const invPt = monthScale.investCoords[idx];
                        const accPt = monthScale.accountCoords[idx];
                        const isActive = safeMonthIdx === idx;

                        const rectX =
                          monthlyData.length <= 1
                            ? 0
                            : idx === 0
                            ? 0
                            : incPt.x - monthScale.stepX / 2;
                        const rectW =
                          monthlyData.length <= 1
                            ? svgW
                            : idx === 0
                            ? incPt.x + monthScale.stepX / 2
                            : idx === monthlyData.length - 1
                            ? svgW - (incPt.x - monthScale.stepX / 2)
                            : monthScale.stepX;

                        return (
                          <g key={idx}>
                            {(viewMetric === 'all' || viewMetric === 'account') && pt.accountBalance > 0 && (
                              <circle
                                cx={accPt.x}
                                cy={accPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-sky-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'income') && (
                              <circle
                                cx={incPt.x}
                                cy={incPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'expense') && (
                              <circle
                                cx={expPt.x}
                                cy={expPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-rose-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'investment') && (
                              <circle
                                cx={invPt.x}
                                cy={invPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-indigo-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            <rect
                              x={rectX}
                              y="0"
                              width={rectW}
                              height={svgH}
                              fill="transparent"
                              className="cursor-pointer"
                              onPointerEnter={() => {
                                setActiveMonthIdx(idx);
                                setIsMonthHovered(true);
                              }}
                              onPointerMove={(e) => {
                                e.stopPropagation();
                                setActiveMonthIdx(idx);
                                setIsMonthHovered(true);
                              }}
                              onClick={() => {
                                setActiveMonthIdx(idx);
                                setIsMonthHovered(true);
                              }}
                              onTouchStart={() => {
                                setActiveMonthIdx(idx);
                                setIsMonthHovered(true);
                              }}
                            />

                            <text
                              x={incPt.x}
                              y={svgH - 8}
                              textAnchor="middle"
                              fontSize={isMobile ? 9 : 11}
                              className={`font-mono fill-current pointer-events-none ${
                                isActive
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {pt.monthName}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    <g>
                      {monthlyData.map((pt, idx) => {
                        const incPt = monthScale.incomeCoords[idx];
                        const expPt = monthScale.expenseCoords[idx];
                        const invPt = monthScale.investCoords[idx];
                        const accPt = monthScale.accountCoords[idx];
                        const isActive = safeMonthIdx === idx;
                        const incH = Math.max(0, monthScale.bottomY - incPt.y);
                        const expH = Math.max(0, monthScale.bottomY - expPt.y);
                        const invH = Math.max(0, monthScale.bottomY - invPt.y);
                        const accH = Math.max(0, monthScale.bottomY - accPt.y);
                        const barW = Math.min(isMobile ? 6.5 : 15, Math.max(isMobile ? 4 : 6, monthScale.stepX / 5.2));

                        const rectX =
                          monthlyData.length <= 1
                            ? 0
                            : idx === 0
                            ? 0
                            : incPt.x - monthScale.stepX / 2;
                        const rectW =
                          monthlyData.length <= 1
                            ? svgW
                            : idx === 0
                            ? incPt.x + monthScale.stepX / 2
                            : idx === monthlyData.length - 1
                            ? svgW - (incPt.x - monthScale.stepX / 2)
                            : monthScale.stepX;

                        return (
                          <g
                            key={idx}
                            onPointerEnter={() => setActiveMonthIdx(idx)}
                            onPointerMove={(e) => {
                              e.stopPropagation();
                              setActiveMonthIdx(idx);
                            }}
                            onClick={() => setActiveMonthIdx(idx)}
                            onTouchStart={() => setActiveMonthIdx(idx)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={rectX}
                              y="0"
                              width={rectW}
                              height={svgH}
                              fill="transparent"
                              className="cursor-pointer"
                            />
                            {(viewMetric === 'all' || viewMetric === 'income') && (
                              <rect
                                x={incPt.x - barW * 2}
                                y={incPt.y}
                                width={barW}
                                height={incH}
                                rx="2"
                                fill="#10b981"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'expense') && (
                              <rect
                                x={incPt.x - barW * 0.7}
                                y={expPt.y}
                                width={barW}
                                height={expH}
                                rx="2"
                                fill="#f43f5e"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'investment') && (
                              <rect
                                x={incPt.x + barW * 0.6}
                                y={invPt.y}
                                width={barW}
                                height={invH}
                                rx="2"
                                fill="#6366f1"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'account') && (
                              <rect
                                x={incPt.x + barW * 1.9}
                                y={accPt.y}
                                width={barW}
                                height={accH}
                                rx="2"
                                fill="#0ea5e9"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            <text
                              x={incPt.x}
                              y={svgH - 8}
                              textAnchor="middle"
                              fontSize={isMobile ? 9 : 11}
                              className={`font-mono fill-current pointer-events-none ${
                                isActive
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {pt.monthName}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* HOVER / TAP INSPECTION CARD */}
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#10141e] text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-[#1d2332] shadow-sm space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between font-bold border-b border-slate-200 dark:border-[#1d2332] pb-1.5 font-sans">
                <span className="text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{activeMonthPoint.fullMonthName} {selectedYear}</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                  Tap chart or month below
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-[11px]">
                <div className="flex flex-col min-w-0">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Income
                  </span>
                  <strong className="text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeMonthPoint.income, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    Expenses
                  </span>
                  <strong className="text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeMonthPoint.expense, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Invested
                  </span>
                  <strong className="text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeMonthPoint.investment, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    Account Balance
                  </span>
                  <strong className="text-sky-700 dark:text-sky-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeMonthPoint.accountBalance, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Month Selector Grid (2x6 on mobile so zero horizontal scroll is needed, 1 row on desktop) */}
            <div className="grid grid-cols-6 sm:flex sm:items-center sm:flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 hidden sm:inline">
                Jump to Month:
              </span>
              {MONTH_NAMES.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveMonthIdx(idx)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                    safeMonthIdx === idx
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* GRAPH 2: YEAR BY YEAR GRAPH (SHOWN ONLY WHEN viewMode === 'year') */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'year' && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Multi-Year Historical Trend ({yearlyData.length} Years Tracked)
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] font-mono">
                {(viewMetric === 'all' || viewMetric === 'income') && (
                  <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Income
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'expense') && (
                  <span className="text-rose-500 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    Expenses
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'investment') && (
                  <span className="text-indigo-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                    Invest
                  </span>
                )}
                {(viewMetric === 'all' || viewMetric === 'account') && (
                  <span className="text-sky-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    Cash
                  </span>
                )}
              </div>
            </div>

            {/* PROPORTIONAL 1-SCREEN SVG GRAPH CONTAINER */}
            <div className="relative w-full rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-2 sm:p-4 select-none">
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-auto overflow-visible cursor-crosshair select-none block"
                  style={{ touchAction: 'pan-y' }}
                  onPointerDown={(e) => {
                    resolveCoordIndex(e.clientX, e.clientY, e.currentTarget, yearScale.incomeCoords, setActiveYearIdx);
                    setIsYearHovered(true);
                  }}
                  onPointerMove={(e) => {
                    resolveCoordIndex(e.clientX, e.clientY, e.currentTarget, yearScale.incomeCoords, setActiveYearIdx);
                    setIsYearHovered(true);
                  }}
                  onPointerLeave={() => setIsYearHovered(false)}
                >
                  <defs>
                    <linearGradient id="year-income-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="year-expense-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="year-invest-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="year-account-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y-Axis Gridlines */}
                  {yearScale.ticks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={svgPad.left - 4}
                        y1={tick.y}
                        x2={svgW - svgPad.right + 4}
                        y2={tick.y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800/80"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={svgPad.left - 2}
                        y={tick.y - 4}
                        fill="currentColor"
                        fontSize={isMobile ? 8.5 : 10}
                        className="font-mono text-slate-400 dark:text-slate-500 fill-current"
                      >
                        {formatCompactIdr(tick.val)}
                      </text>
                    </g>
                  ))}

                  {chartType === 'line' ? (
                    <>
                      {/* AREA FILLS */}
                      {(viewMetric === 'all' || viewMetric === 'account') && (
                        <path
                          d={generateAreaPath(yearScale.accountCoords, yearScale.bottomY)}
                          fill="url(#year-account-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'income') && (
                        <path
                          d={generateAreaPath(yearScale.incomeCoords, yearScale.bottomY)}
                          fill="url(#year-income-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'expense') && (
                        <path
                          d={generateAreaPath(yearScale.expenseCoords, yearScale.bottomY)}
                          fill="url(#year-expense-grad)"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'investment') && (
                        <path
                          d={generateAreaPath(yearScale.investCoords, yearScale.bottomY)}
                          fill="url(#year-invest-grad)"
                        />
                      )}

                      {/* LINE PATHS */}
                      {(viewMetric === 'all' || viewMetric === 'account') && (
                        <path
                          d={generateLinearPath(yearScale.accountCoords)}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'income') && (
                        <path
                          d={generateLinearPath(yearScale.incomeCoords)}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'expense') && (
                        <path
                          d={generateLinearPath(yearScale.expenseCoords)}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {(viewMetric === 'all' || viewMetric === 'investment') && (
                        <path
                          d={generateLinearPath(yearScale.investCoords)}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={lineStrokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Active vertical crosshair guide line */}
                      {yearScale.incomeCoords[safeYearIdx] && (
                        <line
                          x1={yearScale.incomeCoords[safeYearIdx].x}
                          y1={svgPad.top - 6}
                          x2={yearScale.incomeCoords[safeYearIdx].x}
                          y2={yearScale.bottomY}
                          stroke="#94a3b8"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                          className="transition-all duration-75 pointer-events-none"
                        />
                      )}

                      {/* DATA POINTS & EXACT COLUMN INTERACTION */}
                      {yearlyData.map((pt, idx) => {
                        const incPt = yearScale.incomeCoords[idx];
                        const expPt = yearScale.expenseCoords[idx];
                        const invPt = yearScale.investCoords[idx];
                        const accPt = yearScale.accountCoords[idx];
                        const isActive = safeYearIdx === idx;

                        const rectX =
                          yearlyData.length <= 1
                            ? 0
                            : idx === 0
                            ? 0
                            : incPt.x - yearScale.stepX / 2;
                        const rectW =
                          yearlyData.length <= 1
                            ? svgW
                            : idx === 0
                            ? incPt.x + yearScale.stepX / 2
                            : idx === yearlyData.length - 1
                            ? svgW - (incPt.x - yearScale.stepX / 2)
                            : yearScale.stepX;

                        return (
                          <g key={idx}>
                            {(viewMetric === 'all' || viewMetric === 'account') && pt.accountBalance > 0 && (
                              <circle
                                cx={accPt.x}
                                cy={accPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-sky-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'income') && (
                              <circle
                                cx={incPt.x}
                                cy={incPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'expense') && (
                              <circle
                                cx={expPt.x}
                                cy={expPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-rose-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            {(viewMetric === 'all' || viewMetric === 'investment') && (
                              <circle
                                cx={invPt.x}
                                cy={invPt.y}
                                r={isActive ? activeDotR : idleDotR}
                                className="fill-indigo-500 stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                                strokeWidth={isMobile ? '1.5' : '2'}
                              />
                            )}

                            <rect
                              x={rectX}
                              y="0"
                              width={rectW}
                              height={svgH}
                              fill="transparent"
                              className="cursor-pointer"
                              onPointerEnter={() => {
                                setActiveYearIdx(idx);
                                setIsYearHovered(true);
                              }}
                              onPointerMove={(e) => {
                                e.stopPropagation();
                                setActiveYearIdx(idx);
                                setIsYearHovered(true);
                              }}
                              onClick={() => {
                                setActiveYearIdx(idx);
                                setIsYearHovered(true);
                              }}
                              onTouchStart={() => {
                                setActiveYearIdx(idx);
                                setIsYearHovered(true);
                              }}
                            />

                            <text
                              x={incPt.x}
                              y={svgH - 8}
                              textAnchor="middle"
                              fontSize={isMobile ? 9.5 : 11}
                              className={`font-mono fill-current pointer-events-none ${
                                isActive
                                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {pt.year}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    <g>
                      {yearlyData.map((pt, idx) => {
                        const incPt = yearScale.incomeCoords[idx];
                        const expPt = yearScale.expenseCoords[idx];
                        const invPt = yearScale.investCoords[idx];
                        const accPt = yearScale.accountCoords[idx];
                        const isActive = safeYearIdx === idx;
                        const incH = Math.max(0, yearScale.bottomY - incPt.y);
                        const expH = Math.max(0, yearScale.bottomY - expPt.y);
                        const invH = Math.max(0, yearScale.bottomY - invPt.y);
                        const accH = Math.max(0, yearScale.bottomY - accPt.y);
                        const barW = Math.min(isMobile ? 12 : 20, Math.max(isMobile ? 6 : 8, yearScale.stepX / 5.2));

                        const rectX =
                          yearlyData.length <= 1
                            ? 0
                            : idx === 0
                            ? 0
                            : incPt.x - yearScale.stepX / 2;
                        const rectW =
                          yearlyData.length <= 1
                            ? svgW
                            : idx === 0
                            ? incPt.x + yearScale.stepX / 2
                            : idx === yearlyData.length - 1
                            ? svgW - (incPt.x - yearScale.stepX / 2)
                            : yearScale.stepX;

                        return (
                          <g
                            key={idx}
                            onPointerEnter={() => setActiveYearIdx(idx)}
                            onPointerMove={(e) => {
                              e.stopPropagation();
                              setActiveYearIdx(idx);
                            }}
                            onClick={() => setActiveYearIdx(idx)}
                            onTouchStart={() => setActiveYearIdx(idx)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={rectX}
                              y="0"
                              width={rectW}
                              height={svgH}
                              fill="transparent"
                              className="cursor-pointer"
                            />
                            {(viewMetric === 'all' || viewMetric === 'income') && (
                              <rect
                                x={incPt.x - barW * 2}
                                y={incPt.y}
                                width={barW}
                                height={incH}
                                rx="2.5"
                                fill="#10b981"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'expense') && (
                              <rect
                                x={incPt.x - barW * 0.7}
                                y={expPt.y}
                                width={barW}
                                height={expH}
                                rx="2.5"
                                fill="#f43f5e"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'investment') && (
                              <rect
                                x={incPt.x + barW * 0.6}
                                y={invPt.y}
                                width={barW}
                                height={invH}
                                rx="2.5"
                                fill="#6366f1"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            {(viewMetric === 'all' || viewMetric === 'account') && (
                              <rect
                                x={incPt.x + barW * 1.9}
                                y={accPt.y}
                                width={barW}
                                height={accH}
                                rx="2.5"
                                fill="#0ea5e9"
                                opacity={isActive ? 1 : 0.85}
                                className="pointer-events-none"
                              />
                            )}
                            <text
                              x={incPt.x}
                              y={svgH - 8}
                              textAnchor="middle"
                              fontSize={isMobile ? 9.5 : 11}
                              className={`font-mono fill-current pointer-events-none ${
                                isActive
                                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {pt.year}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* HOVER / TAP INSPECTION CARD */}
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#10141e] text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-[#1d2332] shadow-sm space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between font-bold border-b border-slate-200 dark:border-[#1d2332] pb-1.5 font-sans">
                <span className="text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Full Year {activeYearPoint.year}</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                  Tap chart or year below
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-[11px]">
                <div className="flex flex-col min-w-0">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Income
                  </span>
                  <strong className="text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeYearPoint.income, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    Expenses
                  </span>
                  <strong className="text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeYearPoint.expense, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Invested
                  </span>
                  <strong className="text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeYearPoint.investment, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1 text-[10px] font-sans font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    Account Balance
                  </span>
                  <strong className="text-sky-700 dark:text-sky-300 font-bold text-xs sm:text-sm tabular-nums break-words">
                    {formatMasked(activeYearPoint.accountBalance, 'IDR', isPrivacyMode)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Year Selector Buttons */}
            <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 hidden sm:inline">
                Jump to Year:
              </span>
              {yearlyData.map((pt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveYearIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold shrink-0 transition-all cursor-pointer ${
                    safeYearIdx === idx
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {pt.year}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAILED DATA TABLE */}
        {showTable && (
          <div className="animate-in fade-in duration-200 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden pt-2">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {viewMode === 'month'
                  ? `Monthly Trajectory Table (${selectedYear})`
                  : 'Multi-Year Trajectory Table'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4 text-right">Income (IDR)</th>
                    <th className="py-2.5 px-4 text-right">Expenses (IDR)</th>
                    <th className="py-2.5 px-4 text-right">Invested (IDR)</th>
                    <th className="py-2.5 px-4 text-right">Account Amount (IDR)</th>
                    <th className="py-2.5 px-4 text-right">Investment %</th>
                    <th className="py-2.5 px-4 text-center">Visual Proportion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {viewMode === 'month'
                    ? monthlyData.map((row, idx) => {
                        const rate = row.income > 0 ? (row.investment / row.income) * 100 : 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-white font-sans whitespace-nowrap">
                              {row.fullMonthName} {selectedYear}
                            </td>
                            <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.income, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.expense, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.investment, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.accountBalance, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right whitespace-nowrap">
                              {row.income > 0 ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    rate >= 30
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {rate.toFixed(1)}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <div className="w-24 mx-auto h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                <div style={{ width: `${Math.min(100, rate)}%` }} className="bg-indigo-500 h-full rounded-full" />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : yearlyData.map((row, idx) => {
                        const rate = row.income > 0 ? (row.investment / row.income) * 100 : 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-4 font-bold text-slate-900 dark:text-white font-sans whitespace-nowrap">
                              Year {row.year}
                            </td>
                            <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.income, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.expense, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.investment, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                              {formatMasked(row.accountBalance, 'IDR', isPrivacyMode)}
                            </td>
                            <td className="py-2 px-4 text-right whitespace-nowrap">
                              {row.income > 0 ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    rate >= 30
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {rate.toFixed(1)}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <div className="w-24 mx-auto h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                <div style={{ width: `${Math.min(100, rate)}%` }} className="bg-indigo-500 h-full rounded-full" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
