/* Replace file: src/components/Reports/LoanAnalysis.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import {
  CHART_COLORS,
  COLOR_EXPENSE,
  COLOR_INCOME,
} from '../../lib/chartColors';

// --- Type Definitions ---
type Debt = {
  debt_id: string;
  debt_name: string;
};
type LineChartDataPoint = {
  date: string;
  balance: number;
};
type PieChartDataPoint = {
  name: string;
  value: number;
};
type DetailTableRow = {
  debt_id: string;
  name: string;
  total_owed: number;
  monthly_payment: number;
  est_interest: number;
  est_principal: number;
};
type KpiData = {
  total_debt: number;
  total_payments: number;
  weighted_apr: number;
};
type AnalyticsData = {
  kpis: KpiData;
  allocation: PieChartDataPoint[];
  details: DetailTableRow[];
};

const formatDateTick = (tick: string) => {
  const date = new Date(tick + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- RENAMED Component ---
function LoanAnalysis() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lineChartData, setLineChartData] = useState<LineChartDataPoint[]>([]);
  const [debtList, setDebtList] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState('all');

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingLineChart, setLoadingLineChart] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const { data, error } = await supabase.rpc('fn_get_debt_analytics');
      if (error) {
        setError(error.message);
        console.error('Error fetching debt analytics:', error);
      } else {
        setAnalyticsData(data);
        const debts = data.allocation.map((d: PieChartDataPoint) => ({
          debt_id: data.details.find((dt: DetailTableRow) => dt.name === d.name)?.debt_id || '',
          debt_name: d.name,
        }));
        setDebtList(debts);
      }
      setLoadingAnalytics(false);
    };
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoadingLineChart(true);
      setError('');

      const { data, error } = await supabase.rpc('fn_get_debt_progression', {
        p_debt_id: selectedDebt === 'all' ? null : selectedDebt,
      });

      if (error) {
        setError(error.message);
        setLineChartData([]);
      } else {
        setLineChartData(data as LineChartDataPoint[]);
      }
      setLoadingLineChart(false);
    };

    fetchChartData();
  }, [selectedDebt]);

  if (loadingAnalytics) {
    return <p>Loading loan analytics...</p>;
  }

  if (error && !analyticsData) {
    return <p className={styles.errorText}>Error: {error}</p>;
  }

  if (!analyticsData) {
    return <p>No loan data found.</p>;
  }

  const { kpis, allocation, details } = analyticsData;

  return (
    <div>
      {/* --- SECTION 1: KPIs --- */}
      <h3 className={styles.listTitle} style={{ marginTop: '1rem' }}>Loan Summary</h3>
      <div className={styles.kpiSection} style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={`${styles.kpiCard} ${styles.red}`}>
          <h3 className={styles.kpiTitle}>Total Loan Balance</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpis.total_debt * -1)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Total Monthly Payments</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpis.total_payments)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Weighted Average APR</h3>
          <p className={styles.kpiValue}>{kpis.weighted_apr.toFixed(2)}%</p>
        </div>
      </div>

      {/* --- SECTION 2: Allocation Pie Chart --- */}
      <div className={styles.card} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Loan Allocation</h2>
        <div className={styles.chartContainer} style={{ height: '300px' }}>
          {allocation.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: '4rem', color: '#6b7280' }}>
              No loans found.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                >
                  {allocation.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      {/* --- SECTION 3: Principal vs. Interest Table --- */}
      <div className={`${styles.card} ${styles.tableSection}`} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Monthly Payment Analysis (Estimates)</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Loan Name</th>
                <th style={{ textAlign: 'right' }}>Total Owed</th>
                <th style={{ textAlign: 'right' }}>Monthly Payment</th>
                <th style={{ textAlign: 'right' }}>Est. Monthly Interest</th>
                <th style={{ textAlign: 'right' }}>Est. Principal Paid</th>
              </tr>
            </thead>
            <tbody>
              {details.map((item) => {
                const isPayingPrincipal = item.est_principal > 0;
                return (
                  <tr key={item.debt_id}>
                    <td><strong>{item.name}</strong></td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.total_owed * -1)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.monthly_payment)}</td>
                    <td style={{ textAlign: 'right', color: COLOR_EXPENSE }}>
                      ({formatCurrency(item.est_interest)})
                    </td>
                    <td style={{ textAlign: 'right', color: isPayingPrincipal ? COLOR_INCOME : COLOR_EXPENSE, fontWeight: 600 }}>
                      {formatCurrency(item.est_principal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SECTION 4: Progression Line Chart --- */}
      <div className={`${styles.card} ${styles.tableSection}`} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Loan Progression Over Time</h2>
        <div className={styles.filterWrapper} style={{ justifyContent: 'flex-start' }}>
          <label className={styles.label}>Select Loan:</label>
          <select
            className={styles.input}
            value={selectedDebt}
            onChange={(e) => setSelectedDebt(e.target.value)}
            style={{ width: '250px' }}
          >
            <option value="all">All Loans</option>
            {debtList.map((debt) => (
              <option key={debt.debt_id} value={debt.debt_id}>
                {debt.debt_name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className={styles.errorText} style={{ marginTop: '1rem' }}>{error}</p>}

        <div className={styles.chartContainer} style={{ height: '350px', marginTop: '2rem' }}>
          {loadingLineChart ? (
            <p>Loading chart data...</p>
          ) : lineChartData.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: '4rem', color: '#6b7280' }}>
              No snapshot data found for this loan.
              <br />
              Go to 'Assets & Liabilities' to log a new balance.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineChartData}
                margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateTick} fontSize="0.7rem" />
                <YAxis
                  tickFormatter={(val) => formatCurrency(val)}
                  fontSize="0.7rem"
                  width={100}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value * -1), 'Balance']}
                  labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Loan Balance"
                  stroke={COLOR_EXPENSE}
                  strokeWidth={2}
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// --- RENAMED Export ---
export default LoanAnalysis;