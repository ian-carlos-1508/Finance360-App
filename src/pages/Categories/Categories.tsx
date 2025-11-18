/* Replace file: src/pages/Categories/CategoriesPage.tsx */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ADDED useMemo
import CategoryManager from '../../components/Settings/CategoryManager';
import styles from '../Settings/Settings.module.css';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { HiTag, HiArrowSmDown, HiArrowSmUp } from 'react-icons/hi';
import { supabase } from '../../lib/supabaseClient';
// --- NEW: Import the centralized colors ---
import { CHART_COLORS, COLOR_EXPENSE } from '../../lib/chartColors';

// --- Type Definitions ---
type Category = {
  category_id: string;
  category: string;
  subcategory: string | null;
  type: 'Income' | 'Expense';
};

type KpiData = {
  totalCategories: number;
  expenseCategories: number;
  incomeCategories: number;
};

type FilterType = 'All' | 'Income' | 'Expense';
type GroupByFilter = 'weekly' | 'monthly' | 'yearly';

type CategoryCount = {
  name: string;
  count: number;
};

// Trend Data Point returned by the RPC (kept amount and count, but only count is displayed)
type TrendDataPoint = {
  date: string;
  amount: number;
  count: number;
};

// --- REMOVED old color constants ---
// const barChartColors = ['#3b82f6', '#10b981', '#ef4444', '#6b7280', '#f59e0b'];
// const trendLineColor = '#ef4444';

// --- Helper Functions ---
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
    if (isNaN(date.getTime())) return '';
  }

  if (period === 'monthly')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  if (period === 'weekly')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return tickItem;
};
// --- End Helper Functions ---

function CategoriesPage() {
  const [kpiData, setKpiData] = useState<KpiData>({
    totalCategories: 0,
    expenseCategories: 0,
    incomeCategories: 0,
  });
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterType>('All');
  const [barChartData, setBarChartData] = useState<CategoryCount[]>([]);

  // NEW STATE for Trend Chart
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByFilter>('monthly');
  const [loadingTrend, setLoadingTrend] = useState(false);

  // NEW STATE: Filter the trend chart by a single category
  const [selectedTrendCategory, setSelectedTrendCategory] =
    useState<string>('all');

  // Memoize the list of unique expense categories for the filter dropdown
  const expenseCategories = useMemo(
    () => [
      ...new Set(
        allCategories
          .filter((c) => c.type === 'Expense')
          .map((c) => c.category)
      ),
    ],
    [allCategories]
  );

  const filteredCategories = allCategories.filter((cat) => {
    if (filter === 'All') return true;
    return cat.type === filter;
  });

  // Centralized Data Fetching for KPIs and Bar Chart
  const fetchData = useCallback(async () => {
    // 1. Fetch Categories List
    let catQuery = supabase
      .from('categories')
      .select('*')
      .order('category', { ascending: true });

    if (filter !== 'All') {
      catQuery = catQuery.eq('type', filter);
    }

    const { data: catData, error: catError } = await catQuery;

    if (catError) {
      console.error('Error fetching categories:', catError);
    } else if (catData) {
      setAllCategories(catData as Category[]);
    }

    // 2. Fetch Chart & KPI Data
    const { data: countData, error: countError } = await supabase
      .from('v_transaction_count_by_category')
      .select('*');

    if (countError) {
      console.error('Error fetching category counts:', countError);
    } else if (countData) {
      const expenseCount = countData.filter((c) => c.type === 'Expense').length;
      const incomeCount = countData.filter((c) => c.type === 'Income').length;

      setKpiData({
        totalCategories: expenseCount + incomeCount,
        expenseCategories: expenseCount,
        incomeCategories: incomeCount,
      });

      // Filter for Top 5 Expense Categories (by Count)
      const processedChartData = countData
        .filter((c) => c.type === 'Expense' && c.transaction_count > 0)
        .map((c) => ({
          name: c.category,
          count: Number(c.transaction_count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setBarChartData(processedChartData);
    }
  }, [filter]);

  // Function to Fetch Trend Data
  const fetchCategoryTrend = useCallback(async () => {
    setLoadingTrend(true);

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];
    const endOfToday = today.toISOString().split('T')[0];

    // Determine main category filter
    const categoryFilter =
      selectedTrendCategory === 'all' ? null : selectedTrendCategory;

    const params = {
      p_start_date: startOfYear,
      p_end_date: endOfToday,
      p_group_by: groupBy,
      p_type: 'Expense',
      p_main_category: categoryFilter, // APPLY CATEGORY FILTER
      p_category_id: null,
      p_nw_type: null,
    };

    const { data, error } = await supabase.rpc(
      'get_category_spending_trend',
      params
    );

    if (error) {
      console.error('Error fetching category trend:', error);
      setTrendData([]);
    } else {
      // Sort data chronologically (important for trend lines)
      const sortedData = (data as TrendDataPoint[]).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setTrendData(sortedData);
    }
    setLoadingTrend(false);
  }, [groupBy, selectedTrendCategory]); // DEPENDS ON selectedTrendCategory

  useEffect(() => {
    fetchData();
  }, [fetchData, filter]);

  useEffect(() => {
    fetchCategoryTrend();
  }, [fetchCategoryTrend, groupBy, selectedTrendCategory]); // Re-fetch on filter change

  return (
    <div>
      <h1 className={styles.title}>Categories Overview</h1>

      <div className={styles.pageGrid}>
        {/* --- SECTION 1: KPI Cards --- */}
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>Total Categories</h3>
            <p className={styles.kpiValue}>{kpiData.totalCategories}</p>
            <div className={styles.kpiChange}>
              <HiTag />
              <span>All Types</span>
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.red}`}>
            <h3 className={styles.kpiTitle}>Expense Categories</h3>
            <p className={styles.kpiValue}>{kpiData.expenseCategories}</p>
            <div className={styles.kpiChange}>
              <HiArrowSmUp />
              <span>For spending</span>
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.green}`}>
            <h3 className={styles.kpiTitle}>Income Categories</h3>
            <p className={styles.kpiValue}>{kpiData.incomeCategories}</p>
            <div className={styles.kpiChange}>
              <HiArrowSmDown />
              <span>For earnings</span>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: Categories Management Table --- */}
        <div className={`${styles.card} ${styles.tableSection}`}>
          <div className={styles.listHeader}>
            <h2
              className={styles.cardTitle}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              My Categories & Management
            </h2>
            <div className={styles.filterGroup}>
              <button
                className={
                  filter === 'All'
                    ? styles.filterButtonActive
                    : styles.filterButton
                }
                onClick={() => setFilter('All')}
              >
                All
              </button>
              <button
                className={
                  filter === 'Income'
                    ? styles.filterButtonActive
                    : styles.filterButton
                }
                onClick={() => setFilter('Income')}
              >
                Income
              </button>
              <button
                className={
                  filter === 'Expense'
                    ? styles.filterButtonActive
                    : styles.filterButton
                }
                onClick={() => setFilter('Expense')}
              >
                Expense
              </button>
            </div>
          </div>

          <CategoryManager
            onDataUpdated={fetchData}
            categories={filteredCategories}
            fetchCategories={fetchData}
          />
        </div>

        {/* --- SECTION 3: Analytics --- */}
        <div className={styles.analyticsSection}>
          {/* Top 5 Categories (Bar Chart) - Unchanged */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Top 5 Categories (by Count)</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    fontSize="0.7rem"
                  />
                  <Tooltip
                    formatter={(value: number) => `${value} transactions`}
                  />
                  <Bar dataKey="count" barSize={20}>
                    {/* --- UPDATED: Use central colors --- */}
                    {barChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Activity Trend (Line Chart - Now with Category Filter) */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Expense Activity Trend (YTD)</h2>

            {/* CATEGORY & GROUP BY Filters */}
            <div
              className={styles.filterWrapper}
              style={{
                justifyContent: 'flex-start',
                padding: '0 1rem 0.5rem',
              }}
            >
              {/* NEW: Category Filter Dropdown */}
              <label className={styles.label}>Category:</label>
              <select
                className={styles.input}
                value={selectedTrendCategory}
                onChange={(e) => setSelectedTrendCategory(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="all">All Expenses</option>
                {/* Populate options using the memoized list of categories */}
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Grouping Filter */}
              <label className={styles.label}>Group By:</label>
              <select
                className={styles.input}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
                style={{ width: 'auto' }}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className={styles.chartContainer}>
              {loadingTrend ? (
                <p
                  style={{
                    textAlign: 'center',
                    marginTop: '30%',
                    color: '#6b7280',
                  }}
                >
                  Loading Trend...
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(tick) => formatXAxis(tick, groupBy)}
                      fontSize="0.7rem"
                      minTickGap={20}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize="0.7rem"
                      width={50}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, 'Transactions']}
                      labelFormatter={(label: string) => `Period: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={COLOR_EXPENSE} /* <-- UPDATED */
                      name="Transactions"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoriesPage;