/* Replace file: src/pages/Dashboard/Dashboard.tsx */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { formatCurrency } from '../../lib/utils';
import { FaPlus, FaCheckCircle } from 'react-icons/fa';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import TooltipInfo from '../../components/Tooltip/TooltipInfo';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  CHART_COLORS,
  COLOR_INCOME,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
} from '../../lib/chartColors';

// --- Type Definitions ---
type MonthlyCashFlow = { income: number; expenses: number; net_flow: number };
type BudgetAlert = {
  name: string;
  budgeted: number;
  spent: number;
  spent_percentage: number;
};
type SpendingAllocation = { [key: string]: number };
type UpcomingBill = {
  name: string;
  amount: number;
  next_due_date: string;
};
type Goal = { name: string; current: number; target: number }; 
type DashboardData = {
  monthly_cash_flow: MonthlyCashFlow;
  budget_alerts: BudgetAlert[] | null;
  spending_allocation: SpendingAllocation;
  upcoming_bills: UpcomingBill[] | null;
  primary_goal: Goal | null; 
  completed_goals: Goal[] | null; 
  account_balances: AccountBalance[] | null;
  net_worth_snapshot: NetWorthSnapshot;
  net_worth_trend: NetWorthTrendPoint[] | null;
};
type AccountBalance = {
  account_name: string;
  type: 'cash' | 'credit';
  balance: number;
};
type NetWorthSnapshot = {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
};
type NetWorthTrendPoint = {
  month_start: string;
  assets: number;
  liabilities: number;
  net_worth: number; 
};
type HealthScore = { finalScore: number };
type HealthData = {
  savings_rate: number;
  needs_pct: number;
  debt_to_asset_ratio: number;
  emergency_fund_months: number;
};
// --- END Type Definitions ---

// Y-Axis Formatter
const formatYAxisCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
};

// Helper function to fix Invalid Date bug
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString + 'T12:00:00');
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatChartDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'; 
  const date = new Date(dateString + '-01T12:00:00');
  if (isNaN(date.getTime())) return 'Invalid Date'; 
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const calculateHealthScore = (data: HealthData) => {
  const WEIGHTS = {
    LIQUIDITY: 0.3,
    SOLVENCY: 0.25,
    SAVINGS: 0.25,
    SPENDING: 0.2,
  };
  const liquidityScore =
    Math.min(1, (data.emergency_fund_months || 0) / 6) * 100;
  const solvencyGoalRatio = 0.4;
  const solvencyMaxRatio = 1.0;
  const actualRatio = data.debt_to_asset_ratio || 0;
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
  const savingsScore =
    Math.min(1, (data.savings_rate || 0) / 0.2) * 100;
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
  const finalScore =
    liquidityScore * WEIGHTS.LIQUIDITY +
    solvencyScore * WEIGHTS.SOLVENCY +
    savingsScore * WEIGHTS.SAVINGS +
    spendingScore * WEIGHTS.SPENDING;
  return { finalScore: Math.round(finalScore) };
};

const getMonthOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
    options.push({ value, label });
  }
  return options;
};

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [netWorthTrend, setNetWorthTrend] = useState<NetWorthTrendPoint[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [addTxModalType, setAddTxModalType] = useState<
    'Income' | 'Expense' | 'Transfer' | null
  >(null);
  
  const [userName, setUserName] = useState<string | null>(null);
  const [currentMonthYear, setCurrentMonthYear] = useState(
    getMonthOptions()[0].value
  );

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const emailPrefix = user.email ? user.email.split('@')[0] : 'Guest';
        const name = user.user_metadata?.full_name || emailPrefix;
        setUserName(name);
      }
    };
    fetchUserName();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    // --- RECURRING TRANSACTIONS CHECK ---
    const { error: rpcProcessError } = await supabase.rpc(
      'fn_process_recurring_transactions'
    );
    if (rpcProcessError) {
      console.error("Error processing recurring transactions:", rpcProcessError.message);
    }

    const [yearStr, monthStr] = currentMonthYear.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const trendStartDate = new Date(year, 0, 1).toISOString().split('T')[0];

    const { data: dashboardData, error: rpcError } = await supabase.rpc(
      'get_dashboard_data',
      {
        p_start_date: startDate,
        p_end_date: endDate,
        p_trend_start_date: trendStartDate,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      console.error('Dashboard RPC Error:', rpcError);
      setLoading(false);
      return;
    }

    const { data: healthData } = await supabase.rpc(
      'fn_get_financial_health_summary',
      {
        p_start_date: trendStartDate,
        p_end_date: endDate, // Use selected end date for health snapshot
      }
    );

    if (healthData && healthData.length > 0) {
      const score = calculateHealthScore(healthData[0]);
      setHealthScore(score);
    }

    setData(dashboardData as DashboardData);
    setNetWorthTrend(dashboardData.net_worth_trend || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, [currentMonthYear]);

  const cashFlowChartData = useMemo(() => {
    if (!data?.monthly_cash_flow) return [];
    return [
      {
        name: 'Cash Flow',
        Income: data.monthly_cash_flow.income,
        Expenses: Math.abs(data.monthly_cash_flow.expenses),
      },
    ];
  }, [data]);

  const spendingPieData = useMemo(() => {
    if (!data?.spending_allocation) return [];
    return Object.entries(data.spending_allocation)
      .map(([name, value]) => ({
        name,
        value: Math.abs(value),
      }))
      .filter((d) => d.value > 0);
  }, [data]);

  if (loading || userName === null) {
    return <div>Loading Dashboard...</div>;
  }

  if (error || !data) {
    return <p style={{ color: 'red' }}>Error loading dashboard data: {error}</p>;
  }

  const budgetAlerts = data.budget_alerts ?? [];

  const renderHealthScore = () => (
    <div className={styles.widget} onClick={() => navigate('/health')}>
      <h3 className={styles.widgetTitle}>Financial Health</h3>
      <p
        className={styles.kpiValue}
        style={{
          color:
            (healthScore?.finalScore || 0) >= 75
              ? COLOR_INCOME
              : (healthScore?.finalScore || 0) >= 50
              ? CHART_COLORS[3] 
              : COLOR_EXPENSE,
        }}
      >
        {healthScore ? `${healthScore.finalScore} / 100` : 'N/A'}
      </p>
      <p className={styles.kpiContext}>Overall financial score (YTD)</p>
    </div>
  );

  const renderNetWorth = () => (
    <div className={styles.widget} onClick={() => navigate('/assets')}>
      <h3 className={styles.widgetTitle}>Net Worth Snapshot</h3>
      <p className={styles.kpiValue}>
        {formatCurrency(data.net_worth_snapshot.net_worth)}
      </p>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div>
          <p className={styles.kpiLabel}>Total Assets</p>
          <p
            className={styles.kpiContext}
            style={{ color: COLOR_INCOME, fontSize: '1rem' }}
          >
            {formatCurrency(data.net_worth_snapshot.total_assets)}
          </p>
        </div>
        <div>
          <p className={styles.kpiLabel}>Total Liabilities</p>
          <p
            className={styles.kpiContext}
            style={{ color: COLOR_EXPENSE, fontSize: '1rem' }}
          >
            {formatCurrency(data.net_worth_snapshot.total_liabilities)}
          </p>
        </div>
      </div>
      <div className={styles.netWorthChartContainer}>
        {netWorthTrend.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={netWorthTrend}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLOR_INCOME}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLOR_INCOME}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="month_start" hide={true} />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value),
                  'Net Worth',
                ]}
                labelFormatter={(label: string) => formatChartDate(label)}
              />
              <Area
                type="monotone"
                dataKey="net_worth"
                stroke={COLOR_INCOME}
                fill="url(#netWorthGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={styles.emptyState}
            style={{ minHeight: 'auto', height: '100%' }}
          >
            Not enough data to draw a trend.
          </div>
        )}
      </div>
    </div>
  );

  const renderCashFlow = () => (
    <div className={`${styles.widget} ${styles.colSpan2}`}>
      <h3 className={styles.widgetTitle}>Monthly Cash Flow</h3>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '1rem',
          gap: '1rem',
        }}
      >
        <div>
          <p className={styles.kpiLabel} onClick={() => navigate('/income')}>
            Total Income
          </p>
          <p
            className={styles.kpiValue}
            style={{ fontSize: '1.75rem', color: COLOR_INCOME }}
          >
            {formatCurrency(data.monthly_cash_flow.income)}
          </p>
        </div>
        <div>
          <p className={styles.kpiLabel} onClick={() => navigate('/expenses')}>
            Total Expenses
          </p>
          <p
            className={styles.kpiValue}
            style={{ fontSize: '1.75rem', color: COLOR_EXPENSE }}
          >
            {formatCurrency(data.monthly_cash_flow.expenses)}
          </p>
        </div>
        <div>
          <p className={styles.kpiLabel}>Net Cash Flow</p>
          <p
            className={styles.kpiValue}
            style={{
              fontSize: '1.75rem',
              color:
                data.monthly_cash_flow.net_flow >= 0
                  ? COLOR_INCOME
                  : COLOR_EXPENSE,
            }}
          >
            {formatCurrency(data.monthly_cash_flow.net_flow)}
          </p>
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cashFlowChartData}>
            <XAxis dataKey="name" tick={() => <g></g>} tickLine={false} />
            <YAxis
              tickFormatter={formatYAxisCurrency}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={(val: number) => formatCurrency(val)} />
            <Bar
              dataKey="Income"
              fill={COLOR_INCOME}
              radius={[4, 4, 0, 0]}
              barSize={80}
            />
            <Bar
              dataKey="Expenses"
              fill={COLOR_EXPENSE}
              radius={[4, 4, 0, 0]}
              barSize={80}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderBudgetAlerts = () => (
    <div className={styles.widget} onClick={() => navigate('/budgets')}>
      <h3 className={styles.widgetTitle}>Budget Alerts</h3>
      <div className={styles.alertList}>
        {budgetAlerts.length > 0 ? (
          budgetAlerts.map((alert) => (
            <div className={styles.alertItem} key={alert.name}>
              <div className={styles.alertHeader}>
                <span>{alert.name}</span>
                <span>{alert.spent_percentage.toFixed(0)}%</span>
              </div>
              <div className={styles.alertDetails}>
                {formatCurrency(alert.spent)} / {formatCurrency(alert.budgeted)}
              </div>
              <div className={styles.alertProgress}>
                <div
                  className={
                    alert.spent_percentage > 85
                      ? styles.alertProgressBar
                      : styles.alertProgressBarYellow
                  }
                  style={{ width: `${Math.min(alert.spent_percentage, 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            All budgets on track!{' '}
            <FaCheckCircle
              style={{ color: COLOR_INCOME, marginLeft: '5px' }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderUpcomingBills = () => (
    <div className={styles.widget} onClick={() => navigate('/subscriptions')}>
      <h3 className={styles.widgetTitle}>Upcoming Bills</h3>
      <div className={styles.billList}>
        {(data.upcoming_bills ?? []).length > 0 ? (
          (data.upcoming_bills ?? []).map((bill) => (
            <div className={styles.billItem} key={bill.name}>
              <div>
                <div className={styles.billName}>{bill.name}</div>
                <div className={styles.billDate}>
                  Due: {formatDate(bill.next_due_date)}
                </div>
              </div>
              <div className={styles.billAmount}>
                {formatCurrency(bill.amount)}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>No upcoming bills found.</div>
        )}
      </div>
    </div>
  );

  const renderSpendingAllocation = () => (
    <div
      className={styles.widget}
      onClick={() => navigate('/analytics/reports')}
    >
      <h3 className={styles.widgetTitle}>Spending Allocation (This Month)</h3>
      <div className={styles.chartContainer}>
        {spendingPieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendingPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
              >
                {spendingPieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.emptyState}>
            No spending data for this month.
          </div>
        )}
      </div>
    </div>
  );

  const renderGoalProgress = () => {
    const primaryGoal = data.primary_goal;
    const completedGoals = data.completed_goals || []; 
    
    if (!primaryGoal || primaryGoal.name === undefined) {
      return (
        <div className={styles.widget} onClick={() => navigate('/goals')}>
          <h3 className={styles.widgetTitle}>Primary Goal</h3>
          <div className={styles.goalContent}>
             <div className={styles.emptyState}>No active goal set.</div>
          </div>
        </div>
      );
    }

    const current = parseFloat(primaryGoal.current as any) || 0; 
    const target = primaryGoal.target || 1; 
    const progress = (current / target) * 100;
    
    return (
      <div className={styles.widget} onClick={() => navigate('/goals')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className={styles.widgetTitle}>Next Goal</h3>
            {completedGoals.length > 0 && (
                <TooltipInfo align="right">
                    <div className={styles.tooltipLabel}>🎉 Completed Goals:</div>
                    {completedGoals.map((g, i) => (
                        <p key={i} className={styles.tooltipCalc} style={{ color: COLOR_INCOME, margin: '0.25rem 0' }}>
                            {g.name} ({formatCurrency(g.target)})
                        </p>
                    ))}
                    <p className={styles.kpiContext} style={{ marginTop: '0.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.5rem' }}>
                        Showing the next goal in progress.
                    </p>
                </TooltipInfo>
            )}
        </div>

        <div className={styles.goalContent}>
          <div>
            <div className={styles.alertHeader}>
              <span>{primaryGoal.name}</span>
              <span>
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className={styles.alertDetails}>
              {formatCurrency(current)} / {formatCurrency(target)}
            </div>
            <div className={styles.goalProgress}>
              <div
                className={styles.goalProgressBar}
                style={{
                  width: `${Math.min(progress, 100)}%`, 
                  backgroundColor: COLOR_TRANSFER, 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountBalances = () => (
    <div
      className={`${styles.widget} ${styles.fullWidth}`}
      onClick={() => navigate('/accounts')}
    >
      <h3 className={styles.widgetTitle}>Account Balances</h3>
      <div className={styles.accountList}>
        {(data.account_balances ?? []).length > 0 ? (
          (data.account_balances ?? []).map((acc) => (
            <div
              key={acc.account_name}
              style={{
                display: 'inline-block',
                marginRight: '1.5rem',
                fontSize: '0.7rem',
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: '#374151',
                  marginRight: '0.5rem',
                }}
              >
                {acc.account_name}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  color: acc.type === 'cash' ? COLOR_INCOME : COLOR_EXPENSE,
                }}
              >
                {formatCurrency(acc.balance)}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.emptyState} style={{ minHeight: '50px' }}>
            No cash or credit accounts found.
          </div>
        )}
      </div>
    </div>
  );

  const QuickAddModal = () => {
    const renderButtonPair = (
      type: 'Income' | 'Expense' | 'Transfer',
      path: string,
      color: string
    ) => {
      const addText =
        type === 'Income'
          ? '+ Add Income'
          : type === 'Expense'
          ? '– Add Expense'
          : '⇄ New Transfer';
      const viewText = `View ${type} Page`;

      const linkColorClass =
        type === 'Income'
          ? styles.quickAddLinkGreen
          : type === 'Expense'
          ? styles.quickAddLinkRed
          : styles.quickAddLinkBlue;

      const handleQuickAddClick = () => {
        setIsQuickAddModalOpen(false);
        setAddTxModalType(type);
      };

      const handleViewPageClick = () => {
        setIsQuickAddModalOpen(false);
        navigate(path);
      };

      return (
        <>
          <button
            className={styles.quickAddButton}
            onClick={handleQuickAddClick}
            style={{ backgroundColor: color }}
          >
            {addText}
          </button>

          <button
            className={styles.quickAddLink}
            onClick={handleViewPageClick}
          >
            <span className={linkColorClass}>{viewText}</span>
          </button>
        </>
      );
    };

    return (
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title="Quick Add Transaction"
      >
        <div className={styles.quickAddGrid}>
          {renderButtonPair('Income', '/income', COLOR_INCOME)}
          {renderButtonPair('Expense', '/expenses', COLOR_EXPENSE)}
          {renderButtonPair('Transfer', '/transfers', COLOR_TRANSFER)}
        </div>
      </Modal>
    );
  };

  const handleTxModalClose = () => {
    setAddTxModalType(null);
    loadDashboard(); 
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <h1
          className={styles.widgetTitle}
          style={{ fontSize: '1.8rem', border: 'none', marginBottom: '0' }}
        >
          Welcome Back,{' '}
          <strong style={{ fontWeight: 700 }}>{userName}!</strong>
        </h1>

        <div
          className={styles.filterWrapper}
          style={{
            justifyContent: 'flex-end',
            margin: '0',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          <label className={styles.filterLabel} htmlFor="month-filter">
            Viewing:
          </label>
          <select
            id="month-filter"
            className={styles.filterInput}
            value={currentMonthYear}
            onChange={(e) => setCurrentMonthYear(e.target.value)}
            style={{ width: '180px', flexShrink: 0 }}
          >
            {getMonthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Row 1 */}
        {renderHealthScore()}
        {renderNetWorth()}

        {/* Row 2 */}
        {renderCashFlow()}
        {renderBudgetAlerts()}

        {/* Row 3 */}
        {renderUpcomingBills()}
        {renderSpendingAllocation()}
        {renderGoalProgress()}

        {/* Row 4 */}
        {renderAccountBalances()}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        className={styles.fabButton}
        onClick={() => setIsQuickAddModalOpen(true)}
      >
        <FaPlus style={{ fontSize: '1.5rem' }} />
      </button>

      {/* Main Quick Add Modal */}
      <QuickAddModal />

      {/* Nested Add Transaction Modals */}
      {addTxModalType && (
        <AddTransactionModal
          isOpen={!!addTxModalType}
          onClose={handleTxModalClose}
          onTransactionAdded={handleTxModalClose}
          transactionType={addTxModalType}
          transactionToEdit={null}
        />
      )}
    </div>
  );
}

export default Dashboard;