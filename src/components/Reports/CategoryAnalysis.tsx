/* Replace file: src/components/Analytics/CategoryAnalysis.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css'; // Use master CSS
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { type AllTransaction } from '../Transactions/GenericTransactionList';
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_INCOME,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
} from '../../lib/chartColors';

// --- Type Definitions ---
type CategoryRecord = AllTransaction;

type PieData = { name: string; value: number };
type ProgressionDataPoint = { date: string; amount: number; count: number };
type SummaryData = { name: string; total: number; count: number; avg: number };
type DateRangeFilter =
  | 'ytd'
  | 'month'
  | '30days'
  | '90days'
  | 'all'
  | 'custom';
type GroupByFilter = 'weekly' | 'monthly' | 'yearly';
type MainCategory = string;
type KpiData = { total: number; avg: number; count: number };
type AnalysisType = 'Expense' | 'Income';
type NwFilterType = 'All' | 'Need' | 'Want';
type ChartType = 'pie' | 'bar';

// --- Helper Functions (English) ---
const formatXAxis = (tickItem: string, period: GroupByFilter) => {
  let dateString = tickItem;

  if (period === 'monthly' && tickItem.length === 7) {
    dateString = tickItem + '-01';
  } else if (period === 'yearly' && tickItem.length === 4) {
    return tickItem;
  }

  let date = new Date(dateString + 'T12:00:00');

  if (isNaN(date.getTime())) {
    date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
  }

  if (period === 'monthly')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });

  if (period === 'weekly')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  return tickItem;
};

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
// --- End Helper Functions ---

// --- REMOVED old PIE_COLORS constants ---

// --- NEW Chart Toggle Component ---
type ChartToggleProps = {
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
};
const ChartToggle: React.FC<ChartToggleProps> = ({
  chartType,
  setChartType,
}) => (
  <div
    className={styles.filterGroup}
    style={{ marginBottom: 0, marginLeft: 'auto' }}
  >
    <button
      className={
        chartType === 'pie' ? styles.filterButtonActive : styles.filterButton
      }
      onClick={() => setChartType('pie')}
      style={{ padding: '0.2rem 0.5rem' }}
    >
      Pie
    </button>
    <button
      className={
        chartType === 'bar' ? styles.filterButtonActive : styles.filterButton
      }
      onClick={() => setChartType('bar')}
      style={{ padding: '0.2rem 0.5rem' }}
    >
      Bar
    </button>
  </div>
);

function CategoryAnalysis() {
  // --- State ---
  const [allTransactions, setAllTransactions] = useState<CategoryRecord[]>([]);
  const [mainCategoryPie, setMainCategoryPie] = useState<PieData[]>([]);
  const [subCategoryPie, setSubCategoryPie] = useState<PieData[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(
    null
  );
  const [progressionData, setProgressionData] = useState<
    ProgressionDataPoint[]
  >([]);
  const [summaryTableData, setSummaryTableData] = useState<SummaryData[]>([]);
  const [kpiData, setKpiData] = useState<KpiData>({
    total: 0,
    avg: 0,
    count: 0,
  });

  // --- Filter State ---
  const [analysisType, setAnalysisType] = useState<AnalysisType>('Expense');
  const [nwFilter, setNwFilter] = useState<NwFilterType>('All');
  const [chartType, setChartType] = useState<ChartType>('pie');

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ytd');
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [progCategory, setProgCategory] = useState<string>('all');
  const [progGroupBy, setProgGroupBy] = useState<GroupByFilter>('monthly');
  const [progDateFilter, setProgDateFilter] =
    useState<DateRangeFilter>('ytd');
  const [progCustomStart, setProgCustomStart] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [progCustomEnd, setProgCustomEnd] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);

  const [loadingPies, setLoadingPies] = useState(false);
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [error, setError] = useState('');

  const isExpense = analysisType === 'Expense';

  // --- Data Fetching ---
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('category')
        .eq('type', analysisType);
      if (data) {
        const uniqueMain = [...new Set(data.map((c) => c.category))];
        setMainCategories(uniqueMain);
        setProgCategory('all');
      }
    };
    fetchCategories();

    if (analysisType === 'Income') {
      setNwFilter('All');
    }
  }, [analysisType]);

  useEffect(() => {
    const fetchPieData = async () => {
      setLoadingPies(true);
      setError('');
      setSelectedMainCategory(null);
      const { start, end } = getDatesFromFilter(
        dateFilter,
        customStartDate,
        customEndDate
      );

      const { data, error } = await supabase.rpc('get_spending_report', {
        p_start_date: start,
        p_end_date: end,
        p_type: analysisType,
        p_nw_type: nwFilter === 'All' ? null : nwFilter,
      });

      if (error) {
        setError(error.message);
      } else if (data) {
        const transactions = data as CategoryRecord[];
        setAllTransactions(transactions);

        const mainCatMap = new Map<string, { total: number; count: number }>();

        transactions.forEach((tx) => {
          const main_category = tx.category || 'Uncategorized';
          const entry = mainCatMap.get(main_category) || { total: 0, count: 0 };
          entry.total += tx.amount;
          entry.count += 1;
          mainCatMap.set(main_category, entry);
        });

        const startDt = new Date(start + 'T12:00:00');
        const endDt = new Date(end + 'T12:00:00');
        const months =
          Math.max(
            1,
            (endDt.getFullYear() - startDt.getFullYear()) * 12 +
              (endDt.getMonth() - startDt.getMonth()) +
              1
          );

        const mainPieData: PieData[] = [];
        const summaryData: SummaryData[] = [];

        mainCatMap.forEach((value, name) => {
          mainPieData.push({ name, value: value.total });
          summaryData.push({
            name,
            total: value.total,
            count: value.count,
            avg: value.total / months,
          });
        });

        setMainCategoryPie(
          mainPieData.sort((a, b) =>
            isExpense ? a.value - b.value : b.value - a.value
          )
        );
        setSummaryTableData(
          summaryData.sort((a, b) =>
            isExpense ? a.total - b.total : b.total - a.total
          )
        );
      }
      setLoadingPies(false);
    };
    fetchPieData();
  }, [dateFilter, customStartDate, customEndDate, analysisType, nwFilter, isExpense]);

  // Data processing for drill-down
  useEffect(() => {
    let dataToProcess = allTransactions;

    if (selectedMainCategory) {
      dataToProcess = allTransactions.filter(
        (tx) => tx.category === selectedMainCategory
      );
    }

    const subCatMap = new Map<string, number>();
    dataToProcess.forEach((tx) => {
      const subCatName = tx.subcategory || tx.category || 'Uncategorized';
      subCatMap.set(subCatName, (subCatMap.get(subCatName) || 0) + tx.amount);
    });

    const subCategoryData = Array.from(subCatMap, ([name, value]) => ({
      name,
      value,
    }));
    setSubCategoryPie(
      subCategoryData.sort((a, b) =>
        isExpense ? a.value - b.value : b.value - a.value
      )
    );

    const total = dataToProcess.reduce((sum, tx) => sum + tx.amount, 0);
    const count = dataToProcess.length;
    setKpiData({
      total,
      count,
      avg: count > 0 ? total / count : 0,
    });
  }, [allTransactions, selectedMainCategory, isExpense]);

  // Fetch data for Spending Progression
  useEffect(() => {
    const fetchProgressionData = async () => {
      setLoadingProgression(true);
      const { start, end } = getDatesFromFilter(
        progDateFilter,
        progCustomStart,
        progCustomEnd
      );

      const params = {
        p_start_date: start,
        p_end_date: end,
        p_group_by: progGroupBy,
        p_main_category: progCategory === 'all' ? null : progCategory,
        p_category_id: null,
        p_type: analysisType,
        p_nw_type: nwFilter === 'All' ? null : nwFilter,
      };

      const { data, error } = await supabase.rpc(
        'get_category_spending_trend',
        params
      );

      if (error) {
        setError(error.message);
      } else {
        setProgressionData(data);
      }
      setLoadingProgression(false);
    };
    fetchProgressionData();
  }, [
    progCategory,
    progGroupBy,
    progDateFilter,
    progCustomStart,
    progCustomEnd,
    analysisType,
    nwFilter,
  ]);

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      if (selectedMainCategory === data.name) {
        setSelectedMainCategory(null);
      } else {
        setSelectedMainCategory(data.name);
      }
    }
  };

  const kpiTitle = selectedMainCategory
    ? `Analysis for ${selectedMainCategory}`
    : `Analysis for All ${isExpense ? 'Spending' : 'Income'}`;
  const kpiCardStyle = isExpense ? styles.red : styles.green;
  const kpiAmount = isExpense ? kpiData.total * -1 : kpiData.total;
  const kpiAvg = isExpense ? kpiData.avg * -1 : kpiData.avg;
  
  // --- UPDATED: Use central colors ---
  const chartColors = CHART_COLORS; // Now universal
  const chartLineColor = isExpense ? COLOR_EXPENSE : COLOR_INCOME;
  const amountColor = isExpense ? COLOR_EXPENSE : COLOR_INCOME;
  // --- END UPDATES ---
  
  const amountTooltip = isExpense ? 'Spent' : 'Earned';
  const amountColumn = isExpense ? 'Total Spent' : 'Total Earned';
  const avgColumn = isExpense
    ? 'Avg. Monthly Spend'
    : 'Avg. Monthly Income';

  const tooltipFormatter = (value: number) => [
    formatCurrency(isExpense ? value * -1 : value),
    'Amount',
  ];
  const barXAxisFormatter = (value: number) =>
    formatCurrency(isExpense ? value * -1 : value);

  return (
    <div>
      {error && (
        <p
          className={styles.errorText}
          style={{ textAlign: 'center', margin: '1rem 0' }}
        >
          Error: {error}
        </p>
      )}

      <div className={styles.filterGroup} style={{ marginBottom: '1rem' }}>
        <button
          className={
            isExpense ? styles.filterButtonActive : styles.filterButton
          }
          onClick={() => setAnalysisType('Expense')}
        >
          Expenses
        </button>
        <button
          className={
            !isExpense ? styles.filterButtonActive : styles.filterButton
          }
          onClick={() => setAnalysisType('Income')}
        >
          Income
        </button>
      </div>

      {isExpense && (
        <div className={styles.filterGroup} style={{ marginBottom: '1rem' }}>
          <button
            className={
              nwFilter === 'All' ? styles.filterButtonActive : styles.filterButton
            }
            onClick={() => setNwFilter('All')}
          >
            All Expenses
          </button>
          <button
            className={
              nwFilter === 'Need'
                ? styles.filterButtonActive
                : styles.filterButton
            }
            onClick={() => setNwFilter('Need')}
          >
            Needs
          </button>
          <button
            className={
              nwFilter === 'Want'
                ? styles.filterButtonActive
                : styles.filterButton
            }
            onClick={() => setNwFilter('Want')}
          >
            Wants
          </button>
        </div>
      )}

      <h3 className={styles.listTitle} style={{ marginTop: '1rem' }}>
        {isExpense ? 'Spending' : 'Income'} Distribution
      </h3>
      <div
        className={styles.filterWrapper}
        style={{ justifyContent: 'flex-start' }}
      >
        <label className={styles.label}>Date Range:</label>
        <select
          className={styles.input}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
        >
          <option value="ytd">Year to Date</option>
          <option value="month">This Month</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateFilter === 'custom' && (
          <>
            <label className={styles.label} htmlFor="pie-start-date">
              From:
            </label>
            <input
              type="date"
              id="pie-start-date"
              className={styles.input}
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
            <label className={styles.label} htmlFor="pie-end-date">
              To:
            </label>
            <input
              type="date"
              id="pie-end-date"
              className={styles.input}
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </>
        )}
      </div>

      <h3 className={styles.listTitle} style={{ marginTop: '2rem' }}>
        {kpiTitle}
      </h3>
      <div
        className={styles.kpiSection}
        style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        <div className={`${styles.kpiCard} ${kpiCardStyle}`}>
          <h3 className={styles.kpiTitle}>
            {isExpense ? 'Total Spent' : 'Total Earned'}
          </h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiAmount)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}># of Transactions</h3>
          <p className={styles.kpiValue}>{kpiData.count}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Avg. Transaction</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiAvg)}</p>
        </div>
      </div>

      {/* --- SECTION 1: Pie/Bar Charts --- */}
      <div className={styles.analyticsSection} style={{ marginTop: '1rem' }}>
        <div className={styles.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              className={styles.cardTitle}
              style={{ border: 'none', marginBottom: 0, paddingBottom: 0 }}
            >
              {isExpense ? 'Spending' : 'Income'} by Main Category
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 400,
                  color: '#6b7280',
                  marginLeft: '10px',
                }}
              >
                (Click to drill down)
              </span>
            </h2>
            <ChartToggle chartType={chartType} setChartType={setChartType} />
          </div>
          <div className={styles.chartContainer}>
            {loadingPies ? (
              <p>Loading...</p>
            ) : chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mainCategoryPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                    onClick={handlePieClick}
                  >
                    {mainCategoryPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mainCategoryPie}
                  layout="vertical"
                  margin={{ left: 20, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={barXAxisFormatter}
                    fontSize="0.7rem"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize="0.7rem"
                    width={100}
                  />
                  <Tooltip formatter={tooltipFormatter} />
                  <Bar dataKey="value" onClick={handlePieClick}>
                    {mainCategoryPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              className={styles.cardTitle}
              style={{ border: 'none', marginBottom: 0, paddingBottom: 0 }}
            >
              {selectedMainCategory
                ? `Breakdown for ${selectedMainCategory}`
                : 'Subcategory Breakdown'}
            </h2>
            <ChartToggle chartType={chartType} setChartType={setChartType} />
          </div>
          <div className={styles.chartContainer}>
            {loadingPies ? (
              <p>Loading...</p>
            ) : chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subCategoryPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                  >
                    {subCategoryPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subCategoryPie}
                  layout="vertical"
                  margin={{ left: 20, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={barXAxisFormatter}
                    fontSize="0.7rem"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize="0.7rem"
                    width={100}
                  />
                  <Tooltip formatter={tooltipFormatter} />
                  <Bar dataKey="value">
                    {subCategoryPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${styles.card} ${styles.tableSection}`}
        style={{ marginTop: '2rem' }}
      >
        <h2 className={styles.cardTitle}>
          {isExpense ? 'Spending' : 'Income'} Progression
        </h2>
        <div
          className={styles.filterWrapper}
          style={{ justifyContent: 'flex-start' }}
        >
          <label className={styles.label}>Category:</label>
          <select
            className={styles.input}
            value={progCategory}
            onChange={(e) => setProgCategory(e.target.value)}
          >
            <option value="all">All {isExpense ? 'Spending' : 'Income'}</option>
            {mainCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className={styles.label}>Group By:</label>
          <select
            className={styles.input}
            value={progGroupBy}
            onChange={(e) => setProgGroupBy(e.target.value as GroupByFilter)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <label className={styles.label}>Date Range:</label>
          <select
            className={styles.input}
            value={progDateFilter}
            onChange={(e) =>
              setProgDateFilter(e.target.value as DateRangeFilter)
            }
          >
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {progDateFilter === 'custom' && (
          <div
            className={styles.filterWrapper}
            style={{ justifyContent: 'flex-start', marginTop: '1rem' }}
          >
            <label className={styles.label} htmlFor="prog-start-date">
              Start Date:
            </label>
            <input
              type="date"
              id="prog-start-date"
              className={styles.input}
              value={progCustomStart}
              onChange={(e) => setProgCustomStart(e.target.value)}
            />
            <label className={styles.label} htmlFor="prog-end-date">
              End Date:
            </label>
            <input
              type="date"
              id="prog-end-date"
              className={styles.input}
              value={progCustomEnd}
              onChange={(e) => setProgCustomEnd(e.target.value)}
            />
          </div>
        )}

        <div className={styles.analyticsSection} style={{ marginTop: '1rem' }}>
          <div className={styles.card} style={{ padding: '1rem 0 0 0' }}>
            <h3
              className={styles.listTitle}
              style={{ textAlign: 'center', padding: 0 }}
            >
              Total Amount {isExpense ? 'Spent' : 'Earned'}
            </h3>
            <div className={styles.chartContainer} style={{ height: '300px' }}>
              {loadingProgression ? (
                <p>Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(tick) => formatXAxis(tick, progGroupBy)}
                      fontSize="0.7rem"
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      fontSize="0.7rem"
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(isExpense ? value * -1 : value),
                        amountTooltip,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={chartLineColor} // <-- UPDATED
                      name="Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className={styles.card} style={{ padding: '1rem 0 0 0' }}>
            <h3 className={styles.listTitle} style={{ textAlign: 'center' }}>
              # of Transactions
            </h3>
            <div className={styles.chartContainer} style={{ height: '300px' }}>
              {loadingProgression ? (
                <p>Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(tick) => formatXAxis(tick, progGroupBy)}
                      fontSize="0.7rem"
                    />
                    <YAxis
                      fontSize="0.7rem"
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, 'Transactions']}
                    />
                    {/* --- UPDATED: Use central color --- */}
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={COLOR_TRANSFER}
                      name="Count"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${styles.card} ${styles.tableSection}`}
        style={{ marginTop: '2rem' }}
      >
        <h2 className={styles.cardTitle}>
          Category Summary (for{' '}
          {dateFilter === 'custom' ? 'Custom' : dateFilter} period)
        </h2>
        {loadingPies ? (
          <p>Loading summary...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>{amountColumn}</th>
                <th style={{ textAlign: 'right' }}># Transactions</th>
                <th style={{ textAlign: 'right' }}>{avgColumn}</th>
              </tr>
            </thead>
            <tbody>
              {summaryTableData.map((item) => (
                <tr key={item.name}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: amountColor, // <-- UPDATED
                    }}
                  >
                    {formatCurrency(isExpense ? item.total * -1 : item.total)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{item.count}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(isExpense ? item.avg * -1 : item.avg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CategoryAnalysis;