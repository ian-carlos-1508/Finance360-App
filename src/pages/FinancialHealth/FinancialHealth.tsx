/* Replace file: src/pages/FinancialHealth/FinancialHealth.tsx */

import React, { useState, useEffect, useMemo } from 'react';
import styles from './FinancialHealth.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import TooltipInfo from '../../components/Tooltip/TooltipInfo';
// NEW: Import BackToHub
import BackToHub from '../../components/Navigation/BackToHub'; 
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_INCOME,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
  COLOR_NEUTRAL,
} from '../../lib/chartColors';

// --- Type Definitions ---
type DateRangeFilter = 'ytd' | 'month' | '30days' | '90days' | 'all' | 'custom';

type HealthData = {
  total_income: number;
  total_expense: number;
  total_needs: number;
  total_wants: number;
  total_savings: number;
  avg_monthly_income: number;
  avg_monthly_expenses: number;
  avg_monthly_needs: number;
  monthly_surplus: number;
  savings_rate: number;
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
  total_liquid_assets: number;
  total_investments: number;
  total_real_estate: number;
  total_assets: number;
  total_credit_liabilities: number;
  total_loan_liabilities: number;
  total_liabilities: number;
  net_worth: number;
  total_monthly_debt_payment: number;
  dti_ratio: number;
  debt_to_asset_ratio: number;
  personal_current_ratio: number;
  emergency_fund_months: number;
  investment_asset_ratio: number;
};

type KpiCardProps = {
  title: string;
  value: string;
  context: string;
  tooltip: React.ReactNode;
  status: 'good' | 'warning' | 'bad' | 'neutral';
  alignTooltip?: 'right';
};

// --- Financial Health Score Constants ---
const WEIGHTS = {
  LIQUIDITY: 0.3, // Emergency Fund Months
  SOLVENCY: 0.25, // Debt-to-Asset Ratio
  SAVINGS: 0.25, // Savings Rate
  SPENDING: 0.2, // Needs % of Income
};

// Helper function we moved in here
const getDatesFromFilter = (
  filter: DateRangeFilter,
  start: string,
  end: string
) => {
  const today = new Date();
  let startDate: Date;
  let endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );

  if (filter === 'custom') {
    startDate = new Date(start + 'T00:00:00');
    endDate = new Date(end + 'T23:59:59');
  } else if (filter === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (filter === '30days') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (filter === '90days') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  } else if (filter === 'ytd') {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else {
    // 'all'
    startDate = new Date('2020-01-01');
  }
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
};

// --- UPDATED CHART COLORS ---
// Using our new central theme colors
const BUDGET_PIE_COLORS = [
  COLOR_EXPENSE, // Needs (Red)
  CHART_COLORS[3], // Wants (Gold Accent)
  COLOR_INCOME, // Savings (Teal)
];
const EXPENSE_PIE_COLORS = [
  COLOR_EXPENSE, // Needs (Red)
  CHART_COLORS[3], // Wants (Gold Accent)
  COLOR_NEUTRAL, // Uncategorized (Gray)
];
const ASSET_PIE_COLORS = [
  COLOR_TRANSFER, // Liquid Assets (Blue)
  COLOR_INCOME, // Investments (Teal)
  CHART_COLORS[3], // Real Estate (Gold Accent)
];
// --- END UPDATES ---

// --- STATUS HELPER FUNCTIONS (Restored to fix errors) ---

const getSavingsRateStatus = (rate: number): KpiCardProps['status'] => {
  if (rate >= 0.2) return 'good';
  if (rate >= 0.1) return 'warning';
  return 'bad';
};

const getDtiStatus = (ratio: number): KpiCardProps['status'] => {
  if (ratio <= 0.36) return 'good';
  if (ratio <= 0.43) return 'warning';
  return 'bad';
};

const getEmergencyFundStatus = (months: number): KpiCardProps['status'] => {
  if (months >= 6) return 'good';
  if (months >= 3) return 'warning';
  return 'bad';
};

const getDebtToAssetStatus = (ratio: number): KpiCardProps['status'] => {
  const positiveRatio = Math.abs(ratio);
  if (positiveRatio <= 0.4) return 'good';
  if (positiveRatio <= 0.6) return 'warning';
  return 'bad';
};

const getCurrentRatioStatus = (ratio: number): KpiCardProps['status'] => {
  if (ratio >= 2) return 'good';
  if (ratio >= 1) return 'warning';
  return 'bad';
};

// --- END STATUS HELPER FUNCTIONS ---


// --- Helper Components ---
const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  context,
  tooltip,
  status,
  alignTooltip,
}) => {
  let statusClass = styles[status];

  // FIX: Apply conditional coloring to the Financial Health Score card based on value
  if (title === 'Financial Health Score') {
    const score = parseFloat(value);
    // Using the same thresholds used in the score calculation
    if (score >= 75) statusClass = styles.good;
    else if (score >= 50) statusClass = styles.warning;
    else statusClass = styles.bad;
  }

  // FIX: Apply inline styles for centering and larger font size to the score value
  const valueStyle =
    title === 'Financial Health Score'
      ? { textAlign: 'center' as const, fontSize: '2.5rem' }
      : {};

  return (
    <div className={`${styles.kpiCard} ${statusClass}`}>
      <div className={styles.kpiHeader}>
        <h3 className={styles.kpiTitle}>{title}</h3>
        <TooltipInfo align={alignTooltip}>{tooltip}</TooltipInfo>
      </div>
      {/* APPLY NEW STYLES HERE */}
      <p className={styles.kpiValue} style={valueStyle}>
        {value}
      </p>
      <p className={styles.kpiContext}>{context}</p>
    </div>
  );
};

const formatPercent = (decimal: number) => {
  if (decimal === null || isNaN(decimal) || !isFinite(decimal)) return 'N/A';
  return `${(decimal * 100).toFixed(1)}%`;
};

/**
 * Calculates the individual component scores and the final weighted health score (0-100).
 */
const calculateHealthScore = (data: HealthData) => {
  // --- 1. Liquidity Score (30% Weight) ---
  const liquidityMaxMonths = 6;
  const liquidityScore =
    Math.min(1, (data.emergency_fund_months || 0) / liquidityMaxMonths) * 100;

  // --- 2. Solvency Score (25% Weight) ---
  const solvencyGoalRatio = 0.4;
  const solvencyMaxRatio = 1.0;
  
  /* --- BUG 1 FIX: Use Math.abs() ---
   * The original 'data.debt_to_asset_ratio' could be negative,
   * which breaks the score calculation below (e.g., 100 - (negative num) > 100).
   * We use Math.abs() to ensure the ratio is always positive.
   * ---
   */
  const actualRatio = Math.abs(data.debt_to_asset_ratio || 0);

  let solvencyScore;
  if (actualRatio <= solvencyGoalRatio) {
    solvencyScore = 100 - (actualRatio / solvencyGoalRatio) * 50;
  } else {
    const normalizedRatio = Math.min(actualRatio, solvencyMaxRatio);
    solvencyScore =
      50 -
      ((normalizedRatio - solvencyGoalRatio) /
        (solvencyMaxRatio - solvencyGoalRatio)) *
        50;
  }
  solvencyScore = Math.max(0, solvencyScore);

  // --- 3. Savings Score (25% Weight) ---
  const savingsGoalRate = 0.2;
  const savingsScore =
    Math.min(1, (data.savings_rate || 0) / savingsGoalRate) * 100;

  // --- 4. Spending Score (20% Weight) ---
  const needsGoalPct = 0.5;
  const needsActualPct = data.needs_pct || 0;

  let spendingScore;
  if (needsActualPct <= needsGoalPct) {
    spendingScore = 100 - (needsActualPct / needsGoalPct) * 50;
  } else {
    const spendingMaxPct = 1.0;
    const normalizedNeeds = Math.min(needsActualPct, spendingMaxPct);
    spendingScore =
      50 -
      ((normalizedNeeds - needsGoalPct) / (spendingMaxPct - needsGoalPct)) *
        50;
  }
  spendingScore = Math.max(0, spendingScore);

  // --- Final Weighted Score ---
  const finalScore =
    liquidityScore * WEIGHTS.LIQUIDITY +
    solvencyScore * WEIGHTS.SOLVENCY +
    savingsScore * WEIGHTS.SAVINGS +
    spendingScore * WEIGHTS.SPENDING;

  return {
    finalScore: Math.round(finalScore),
    liquidityScore: Math.round(liquidityScore),
    solvencyScore: Math.round(solvencyScore),
    savingsScore: Math.round(savingsScore),
    spendingScore: Math.round(spendingScore),
  };
};

// --- Main Page Component ---
function FinancialHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ytd');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      setError('');

      const { start, end } = getDatesFromFilter(
        dateFilter,
        customStartDate,
        customEndDate
      );

      const { data, error } = await supabase.rpc(
        'fn_get_financial_health_summary',
        {
          p_start_date: start,
          p_end_date: end,
        }
      );

      if (error) {
        setError(error.message);
        console.error('Error fetching financial health:', error);
      } else if (data && data.length > 0) {
        setData(data[0]);
      }
      setLoading(false);
    };

    fetchHealthData();
  }, [dateFilter, customStartDate, customEndDate]);

  // Calculate Health Score on Data Change
  const healthScores = useMemo(() => {
    if (!data) return null;
    return calculateHealthScore(data);
  }, [data]);

  // --- CHART DATA (omitted for brevity) ---
  const budgetPieData = [
    { name: 'Needs', value: data?.needs_pct || 0 },
    { name: 'Wants', value: data?.wants_pct || 0 },
    { name: 'Savings', value: data?.savings_pct || 0 },
  ].filter((d) => d.value > 0);

  const assetPieData = [
    { name: 'Liquid Assets', value: data?.total_liquid_assets || 0 },
    { name: 'Investments', value: data?.total_investments || 0 },
    { name: 'Real Estate', value: data?.total_real_estate || 0 },
  ].filter((d) => d.value > 0);

  const uncategorizedExpense =
    (data?.total_expense || 0) -
    (data?.total_needs || 0) -
    (data?.total_wants || 0);
  const expensePieData = [
    { name: 'Needs', value: data?.total_needs || 0 },
    { name: 'Wants', value: data?.total_wants || 0 },
    {
      name: 'Uncategorized',
      value: uncategorizedExpense > 0 ? uncategorizedExpense : 0,
    },
  ].filter((d) => d.value > 0);

  if (loading) {
    return <div>Loading financial health data...</div>;
  }

  if (error) {
    return <p className={styles.errorText}>Error loading data: {error}</p>;
  }

  if (!data) {
    return <p>No data available for this period.</p>;
  }

  // --- RENDER ---
  return (
    <div>
      {/* NEW: Back to Hub Navigation */}
      <BackToHub to="/build" label="Back to Fortress Dashboard" />
      
      <h1 className={styles.title}>Financial Health</h1>

      {/* --- Date Filters --- */}
      <div className={styles.filterWrapper}>
        <label className={styles.label}>Date Range:</label>
        <select
          className={styles.input}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
        >
          <option value="ytd">Year to Date</option>
          <option value="month">This Month</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateFilter === 'custom' && (
          <>
            <input
              type="date"
              className={styles.input}
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
            <input
              type="date"
              className={styles.input}
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </>
        )}
      </div>

      {/* --- NEW SECTION: FINANCIAL HEALTH SCORE (FIXED CENTERING AND COLOR) --- */}
      <h2
        className={styles.cardTitle}
        style={{
          border: 'none',
          padding: 0,
          margin: '2rem 0 1rem 0',
        }}
      >
        Overall Health Score
      </h2>
      {/* WRAPPER FOR CENTERING */}
      <div className={styles.centeredKpiWrapper}>
        <KpiCard
          title="Financial Health Score"
          value={healthScores ? healthScores.finalScore.toString() : 'N/A'}
          context="Weighted average of your core financial metrics (0-100)"
          status="neutral" // Status is now conditionally applied inside KpiCard based on score value
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Score Breakdown (Weights):</div>
              <div className={styles.tooltipContent}>
                <ul>
                  <li>
                    Liquidity (Emergency Fund, 30%): Score:{' '}
                    {healthScores?.liquidityScore || 0}
                  </li>
                  <li>
                    Solvency (Debt-to-Asset, 25%): Score:{' '}
                    {healthScores?.solvencyScore || 0}
                  </li>
                  <li>
                    Savings (Savings Rate, 25%): Score:{' '}
                    {healthScores?.savingsScore || 0}
                  </li>
                  <li>
                    Spending (Needs % of Income, 20%): Score:{' '}
                    {healthScores?.spendingScore || 0}
                  </li>
                </ul>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: 75+ is Excellent.
              </div>
            </>
          }
        />
      </div>
      {/* --- END NEW SECTION --- */}

      {/* --- Category 1: Safety Net --- */}
      <h2
        className={styles.cardTitle}
        style={{
          border: 'none',
          padding: 0,
          margin: '2rem 0 1rem 0',
        }}
      >
        Liquidity & Risk (Your Safety Net)
      </h2>
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Emergency Fund"
          value={`${(data.emergency_fund_months || 0).toFixed(1)} Months`}
          context={`Based on ${formatCurrency(
            data.avg_monthly_needs
          )} in "Needs"`}
          status={getEmergencyFundStatus(data.emergency_fund_months || 0)}
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                How many months you could cover *essential* expenses with your
                cash.
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>
                Liquid Assets / Avg. Monthly "Needs"
              </div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Liquid Assets: <strong>{formatCurrency(data.total_liquid_assets)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Avg Monthly Needs: <strong>{formatCurrency(data.avg_monthly_needs)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Ratio: <strong>{(data.emergency_fund_months || 0).toFixed(1)} Months</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>3-6 Months</strong>
              </div>
            </>
          }
        />
        <KpiCard
          title="Monthly Surplus / Deficit"
          value={formatCurrency(data.monthly_surplus || 0)}
          context={`Avg. Income: ${formatCurrency(data.avg_monthly_income)}`}
          status={(data.monthly_surplus || 0) > 0 ? 'good' : 'bad'}
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                The average amount of money you have left over (or are short)
                each month.
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>
                Avg. Monthly Income - Avg. Monthly Expenses
              </div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Avg Income: <strong>{formatCurrency(data.avg_monthly_income)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Avg Expenses: <strong>{formatCurrency(data.avg_monthly_expenses)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Surplus: <strong>{formatCurrency(data.monthly_surplus || 0)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>Must be positive.</strong>
              </div>
            </>
          }
        />
        <KpiCard
          title="Personal Current Ratio"
          value={(data.personal_current_ratio || 0).toFixed(2)}
          context={`Cash: ${formatCurrency(data.total_liquid_assets)}`}
          status={getCurrentRatioStatus(data.personal_current_ratio || 0)}
          alignTooltip="right"
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                Can you cover your short-term (credit card) debts with your
                cash?
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>
                Total Liquid Assets / Total Credit Liabilities
              </div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Liquid Assets: <strong>{formatCurrency(data.total_liquid_assets)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Credit Liabilities: <strong>{formatCurrency(Math.abs(data.total_credit_liabilities))}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Ratio: <strong>{(data.personal_current_ratio || 0).toFixed(2)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>&gt; 1.0 is good. &gt; 2.0 is great.</strong>
              </div>
            </>
          }
        />
      </div>

      {/* --- Category 2: Debt --- */}
      <h2
        className={styles.cardTitle}
        style={{
          border: 'none',
          padding: 0,
          margin: '2rem 0 1rem 0',
        }}
      >
        Debt Management
      </h2>
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Debt-to-Income (DTI) Ratio"
          value={formatPercent(data.dti_ratio || 0)}
          context={`Payments: ${formatCurrency(
            data.total_monthly_debt_payment
          )} / mo`}
          status={getDtiStatus(data.dti_ratio || 0)}
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                What percentage of your income goes to debt payments. Lenders
                watch this closely.
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>
                Total Monthly Debt Payments / Avg. Monthly Income
              </div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Debt Payments: <strong>{formatCurrency(data.total_monthly_debt_payment)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Avg Income: <strong>{formatCurrency(data.avg_monthly_income)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Ratio: <strong>{formatPercent(data.dti_ratio || 0)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>&lt; 36% is Ideal.</strong>
              </div>
            </>
          }
        />
        <KpiCard
          title="Debt-to-Asset Ratio"
          /* --- BUG 2 FIX: Use Math.abs() for the display value --- */
          value={formatPercent(Math.abs(data.debt_to_asset_ratio || 0))}
          /* --- BUG 2 CONTEXT FIX: Use Math.abs() for the context display --- */
          context={`Debt: ${formatCurrency(Math.abs(data.total_liabilities))}`}
          status={getDebtToAssetStatus(data.debt_to_asset_ratio || 0)}
          alignTooltip="right"
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                Answers "Who owns your stuff: you or your lenders?"
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <span className={styles.formula}>
                Total Liabilities / Total Assets
              </span>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Total Liabilities: <strong>{formatCurrency(Math.abs(data.total_liabilities))}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Total Assets: <strong>{formatCurrency(data.total_assets)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Ratio: <strong>{formatPercent(Math.abs(data.debt_to_asset_ratio || 0))}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>&lt; 50% is a great goal.</strong>
              </div>
            </>
          }
        />
      </div>

      {/* --- Category 3: Wealth --- */}
      <h2
        className={styles.cardTitle}
        style={{
          border: 'none',
          padding: 0,
          margin: '2rem 0 1rem 0',
        }}
      >
        Savings & Wealth Building
      </h2>
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Net Worth"
          value={formatCurrency(data.net_worth || 0)}
          context={`Assets: ${formatCurrency(data.total_assets)}`}
          status={(data.net_worth || 0) > 0 ? 'good' : 'bad'}
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                The ultimate snapshot of your financial position.
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>Total Assets - Total Liabilities</div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Total Assets: <strong>{formatCurrency(data.total_assets)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Total Liabilities: <strong>{formatCurrency(Math.abs(data.total_liabilities))}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Net Worth: <strong>{formatCurrency(data.net_worth || 0)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>Should be positive and growing.</strong>
              </div>
            </>
          }
        />
        <KpiCard
          title="Savings Rate"
          value={formatPercent(data.savings_rate || 0)}
          context={`Saved: ${formatCurrency(data.total_savings)}`}
          status={getSavingsRateStatus(data.savings_rate || 0)}
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                Percentage of your *recorded income* that you saved (Income -
                Expenses).
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>Total Savings / Total Income</div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Total Savings: <strong>{formatCurrency(data.total_savings)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Total Income: <strong>{formatCurrency(data.total_income)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Rate: <strong>{formatPercent(data.savings_rate || 0)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>Aim for 15-20%.</strong>
              </div>
            </>
          }
        />
        <KpiCard
          title="Investment/Asset Ratio"
          value={formatPercent(data.investment_asset_ratio || 0)}
          context={`Invested: ${formatCurrency(data.total_investments)}`}
          status={
            (data.investment_asset_ratio || 0) > 0.25 ? 'good' : 'warning'
          }
          alignTooltip="right"
          tooltip={
            <>
              <div className={styles.tooltipLabel}>Definition:</div>
              <div className={styles.tooltipContent}>
                What percentage of your net worth is in assets that grow
                (investments) vs. sit (cash).
              </div>
              <div className={styles.tooltipLabel}>Formula:</div>
              <div className={styles.formula}>
                Total Invested Assets / Total Net Worth
              </div>
              <div className={styles.tooltipLabel}>Your Calculation:</div>
              <div className={styles.tooltipCalc}>
                Invested Assets: <strong>{formatCurrency(data.total_investments)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Net Worth: <strong>{formatCurrency(data.net_worth)}</strong>
              </div>
              <div className={styles.tooltipCalc}>
                Ratio: <strong>{formatPercent(data.investment_asset_ratio || 0)}</strong>
              </div>
              <div className={styles.tooltipBenchmark}>
                Benchmark: <strong>This should grow as you get older.</strong>
              </div>
            </>
          }
        />
      </div>

      {/* --- Category 4: Budgeting --- */}
      <h2
        className={styles.cardTitle}
        style={{
          border: 'none',
          padding: 0,
          margin: '2rem 0 1rem 0',
        }}
      >
        Spending & Allocation
      </h2>
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>50/30/20 Breakdown (vs. Income)</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => formatPercent(entry.value)}
                >
                  {budgetPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BUDGET_PIE_COLORS[index % BUDGET_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatPercent(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>
            Expense Breakdown (Needs vs. Wants)
          </h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => formatPercent(entry.percent)}
                >
                  {expensePieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={EXPENSE_PIE_COLORS[index % EXPENSE_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Asset Allocation</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry: any) => formatPercent(entry.percent)}
                >
                  {assetPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ASSET_PIE_COLORS[index % ASSET_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialHealth;