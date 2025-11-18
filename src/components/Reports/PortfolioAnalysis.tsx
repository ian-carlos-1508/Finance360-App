/* Replace file: src/components/Reports/PortfolioAnalysis.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'; // <-- Removed LineChart and Line
import { formatCurrency } from '../../lib/utils';
import {
  CHART_COLORS,
  COLOR_INCOME,
} from '../../lib/chartColors'; // <-- Removed COLOR_EXPENSE

// --- Type Definitions ---
type Investment = {
  investment_id: string;
  name: string;
};
type LineChartDataPoint = {
  date: string;
  value: number;
};
type PieChartDataPoint = {
  name: string;
  value: number;
};
type KpiData = {
  total_value: number;
  total_cost_basis: number;
  total_pl: number;
  total_pl_pct: number | null;
};
type AnalyticsData = {
  kpis: KpiData | null;
  allocation: PieChartDataPoint[] | null;
};

// Helper to format the date on the X-axis
const formatDateTick = (tick: string) => {
  const date = new Date(tick + 'T12:00:00'); // Prevent timezone issues
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function PortfolioAnalysis() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lineChartData, setLineChartData] = useState<LineChartDataPoint[]>([]);
  const [investmentList, setInvestmentList] = useState<Investment[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState('all');

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingLineChart, setLoadingLineChart] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch main analytics (KPIs, Pie) and Investment List
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const { data, error } = await supabase.rpc('fn_get_portfolio_analytics');
      if (error) {
        setError(error.message);
        console.error('Error fetching portfolio analytics:', error);
      } else {
        setAnalyticsData(data);
        // Populate the dropdown list from the pie chart data
        const investments = (data.allocation || []).map((d: PieChartDataPoint) => ({
          investment_id: d.name, // Note: This isn't the ID, but it's okay for the filter
          name: d.name,
        }));
        setInvestmentList(investments);
      }
      setLoadingAnalytics(false);
    };
    fetchAnalytics();
  }, []);
  
  // 2. Fetch line chart data *only* when the selected investment changes
  useEffect(() => {
    const fetchChartData = async () => {
      setLoadingLineChart(true);
      setError('');
      
      let p_investment_id = null;
      if (selectedInvestment !== 'all') {
        const { data: inv } = await supabase
          .from('investments')
          .select('investment_id')
          .eq('name', selectedInvestment)
          .single();
        if (inv) {
          p_investment_id = inv.investment_id;
        }
      }

      const { data, error } = await supabase.rpc('fn_get_investment_progression', {
        p_investment_id: p_investment_id,
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
  }, [selectedInvestment]);


  if (loadingAnalytics) {
    return <p>Loading portfolio analytics...</p>;
  }

  if (error && !analyticsData) {
    return <p className={styles.errorText}>Error: {error}</p>;
  }

  if (!analyticsData) {
    return <p>No investment data found.</p>;
  }

  const { kpis, allocation } = analyticsData;
  const kpiData = kpis || { total_value: 0, total_cost_basis: 0, total_pl: 0, total_pl_pct: 0 };
  const allocationData = allocation || [];
  
  const isGain = kpiData.total_pl >= 0;
  const plStatusClass = isGain ? styles.green : styles.red;

  return (
    <div>
      {/* --- SECTION 1: KPIs --- */}
      <h3 className={styles.listTitle} style={{ marginTop: '1rem' }}>Portfolio Summary</h3>
      <div className={styles.kpiSection} style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className={`${styles.kpiCard} ${styles.blue}`}>
          <h3 className={styles.kpiTitle}>Total Market Value</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.total_value)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Total Cost Basis</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.total_cost_basis)}</p>
        </div>
        <div className={`${styles.kpiCard} ${plStatusClass}`}>
          <h3 className={styles.kpiTitle}>Total Unrealized P/L</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.total_pl)}</p>
        </div>
        <div className={`${styles.kpiCard} ${plStatusClass}`}>
          <h3 className={styles.kpiTitle}>Total Return (%)</h3>
          <p className={styles.kpiValue}>{(kpiData.total_pl_pct || 0).toFixed(2)}%</p>
        </div>
      </div>

      {/* --- SECTION 2: Allocation Pie Chart --- */}
      <div className={styles.card} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Portfolio Allocation</h2>
        <div className={styles.chartContainer} style={{ height: '300px' }}>
          {allocationData.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: '4rem', color: '#6b7280' }}>
              No investments found.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                >
                  {allocationData.map((_, index) => (
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
      
      {/* --- SECTION 3: Progression Line Chart --- */}
      <div className={`${styles.card} ${styles.tableSection}`} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Portfolio Value Over Time</h2>
        <div className={styles.filterWrapper} style={{ justifyContent: 'flex-start' }}>
          <label className={styles.label}>Select Investment:</label>
          <select
            className={styles.input}
            value={selectedInvestment}
            onChange={(e) => setSelectedInvestment(e.target.value)}
            style={{ width: '250px' }}
          >
            <option value="all">All Investments</option>
            {investmentList.map((inv) => (
              <option key={inv.name} value={inv.name}>
                {inv.name}
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
              No snapshot data found for this investment.
              <br />
              Go to 'Assets & Liabilities' to log a new value.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
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
                  formatter={(value: number) => [formatCurrency(value), 'Market Value']}
                  labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <defs>
                  <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_INCOME} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLOR_INCOME} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Portfolio Value"
                  stroke={COLOR_INCOME}
                  strokeWidth={2}
                  fill="url(#colorPortfolio)"
                  dot={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioAnalysis;