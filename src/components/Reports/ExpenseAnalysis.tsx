/* Replace file: src/components/Analytics/ExpenseAnalysis.tsx */

import { useState, useEffect, useRef } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
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
import { type Account } from '../Accounts/AddAccountForm';
import { IoCheckmarkCircle, IoChevronDown } from 'react-icons/io5';
// --- NEW: Import the centralized colors ---
import { CHART_COLORS } from '../../lib/chartColors';

// --- Type Definitions ---
type ExpenseRecord = AllTransaction & {
  main_category: string;
  account_name: string;
};
type PieData = { name: string; value: number };
type ProgressionDataPoint = {
  date: string;
  [key: string]: string | number;
};
type ProgressionSqlRecord = {
  date_period: string;
  series_name: string;
  total_amount: number;
};
type DateRangeFilter = 'ytd' | 'month' | '30days' | 'all' | 'custom';
type GroupByFilter = 'weekly' | 'monthly' | 'yearly';
type MainCategory = string;
type KpiData = { total: number; avg: number; count: number };
type ComparisonPeriod = 'monthly' | 'yearly';
type ComparisonKpis = {
  growth: number;
  diff: number;
  p1_total: number;
  p2_total: number;
};
type ChartType = 'pie' | 'bar'; // NEW TYPE

// --- Constants & Colors ---
const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

// --- Helper Functions ---
const formatXAxis = (tickItem: string, period: GroupByFilter) => {
  let date: Date;

  if (period === 'weekly') {
    date = new Date(tickItem + 'T12:00:00'); // Valid ISO 8601
  } else if (period === 'monthly') {
    date = new Date(tickItem + '-01T12:00:00'); // First of the month
  } else {
    return tickItem; // Just the year
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  if (period === 'monthly') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  }

  // Default is 'weekly'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

const pivotProgressionData = (
  data: ProgressionSqlRecord[]
): { pivoted: ProgressionDataPoint[]; keys: string[] } => {
  const seriesKeys = [...new Set(data.map((d) => d.series_name))];
  const dateMap = new Map<string, ProgressionDataPoint>();

  data.forEach((record) => {
    const date = record.date_period;
    if (!dateMap.has(date)) {
      const basePoint: ProgressionDataPoint = { date };
      seriesKeys.forEach((key) => {
        basePoint[key] = 0;
      });
      dateMap.set(date, basePoint);
    }
    const dataPoint = dateMap.get(date)!;
    dataPoint[record.series_name] = record.total_amount;
  });

  const pivoted = Array.from(dateMap.values());
  return { pivoted, keys: seriesKeys };
};

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

// --- Custom Multi-Select Dropdown Component ---
type CustomMultiSelectProps = {
  options: { id: string; name: string }[];
  selected: string[];
  onSelect: (newSelection: string[]) => void;
  label: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
};

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  options,
  selected,
  onSelect,
  label,
  isOpen,
  setIsOpen,
  dropdownRef,
}) => {
  const allValue = 'all';
  const isAllSelected = selected.includes(allValue);

  const handleToggle = (id: string) => {
    if (id === allValue) {
      onSelect(isAllSelected ? [] : [allValue]);
    } else {
      const currentSelection = selected.filter((s) => s !== allValue);
      if (currentSelection.includes(id)) {
        onSelect(currentSelection.filter((item) => item !== id));
      } else {
        onSelect([...currentSelection, id]);
      }
    }
  };

  const getDisplayValue = () => {
    if (isAllSelected) return `All ${label}`;
    if (selected.length === 0) return `No ${label} selected`;
    if (selected.length === 1) {
      const selectedOption = options.find((opt) => opt.id === selected[0]);
      return selectedOption ? selectedOption.name : '1 selected';
    }
    return `${selected.length} ${label} selected`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '200px' }}>
      <button
        className={styles.input}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <span>{getDisplayValue()}</span>
        <IoChevronDown
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isOpen && (
        <div
          className={styles.card}
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            zIndex: 10,
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            key={allValue}
            onClick={() => handleToggle(allValue)}
            className={styles.dropdownItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: isAllSelected ? 600 : 400,
              borderRadius: '4px',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#f3f4f6')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <IoCheckmarkCircle
              style={{
                color: isAllSelected ? '#3b82f6' : '#e5e7eb',
                marginRight: '0.5rem',
              }}
            />
            **All {label}**
          </div>
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <div
                key={option.id}
                onClick={() => handleToggle(option.id)}
                className={styles.dropdownItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  opacity: isAllSelected ? 0.5 : 1,
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f3f4f6')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <IoCheckmarkCircle
                  style={{
                    color: isSelected ? '#3b82f6' : '#e5e7eb',
                    marginRight: '0.5rem',
                  }}
                />
                {option.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
// --- End Custom Multi-Select Dropdown Component ---

function ExpenseAnalysis() {
  // --- State for Section 1 (Pies) ---
  const [pieTransactions, setPieTransactions] = useState<ExpenseRecord[]>([]);
  const [mainCategoryPie, setMainCategoryPie] = useState<PieData[]>([]);
  const [accountPieData, setAccountPieData] = useState<PieData[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(
    null
  );
  const [kpiData, setKpiData] = useState<KpiData>({
    total: 0,
    avg: 0,
    count: 0,
  });
  const [pieDateFilter, setPieDateFilter] = useState<DateRangeFilter>('ytd');
  const [pieCustomStart, setPieCustomStart] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [pieCustomEnd, setPieCustomEnd] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loadingPies, setLoadingPies] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('pie'); // NEW STATE

  // --- State for Section 2 (Progression) ---
  const [progressionData, setProgressionData] = useState<
    ProgressionDataPoint[]
  >([]);
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
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [progAccounts, setProgAccounts] = useState<string[]>(['all']);
  const [progressionSeriesKeys, setProgressionSeriesKeys] = useState<string[]>(
    []
  );
  const [isProgAccountOpen, setIsProgAccountOpen] = useState(false);

  // --- State for Section 3 (Comparison) ---
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [compPeriod, setCompPeriod] = useState<ComparisonPeriod>('monthly');
  const [compPeriod1, setCompPeriod1] = useState<string>(
    `${CURRENT_YEAR}-${(CURRENT_MONTH - 1).toString().padStart(2, '0')}`
  );
  const [compPeriod2, setCompPeriod2] = useState<string>(
    `${CURRENT_YEAR}-${CURRENT_MONTH.toString().padStart(2, '0')}`
  );
  const [compAccounts, setCompAccounts] = useState<string[]>(['all']);
  const [compKpis, setCompKpis] = useState<ComparisonKpis>({
    growth: 0,
    diff: 0,
    p1_total: 0,
    p2_total: 0,
  });
  const [loadingComp, setLoadingComp] = useState(false);
  const [isCompAccountOpen, setIsCompAccountOpen] = useState(false);

  const [error, setError] = useState('');

  // --- Refs for click-outside ---
  const progAccountRef = useRef<HTMLDivElement>(null);
  const compAccountRef = useRef<HTMLDivElement>(null);

  // --- Hook for click-outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        progAccountRef.current &&
        !progAccountRef.current.contains(event.target as Node)
      ) {
        setIsProgAccountOpen(false);
      }
      if (
        compAccountRef.current &&
        !compAccountRef.current.contains(event.target as Node)
      ) {
        setIsCompAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Data Fetching: Filters & Accounts ---
  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: catData } = await supabase
        .from('categories')
        .select('category')
        .eq('type', 'Expense');
      if (catData) {
        setMainCategories([...new Set(catData.map((c) => c.category))]);
      }
      const { data: accData } = await supabase
        .from('accounts')
        .select('account_id, account_name, type');
      if (accData) {
        setAccountList(accData as Account[]);
      }
    };
    fetchFilterData();
  }, []);

  // --- Data Fetching: Pie Data (Section 1) ---
  useEffect(() => {
    const fetchPieData = async () => {
      setLoadingPies(true);
      const { start, end } = getDatesFromFilter(
        pieDateFilter,
        pieCustomStart,
        pieCustomEnd
      );
      const { data, error } = await supabase.rpc('get_expense_report', {
        p_start_date: start,
        p_end_date: end,
      });
      if (error) {
        setError(error.message);
      } else if (data) {
        setPieTransactions(data as ExpenseRecord[]);
      }
      setLoadingPies(false);
    };
    fetchPieData();
  }, [pieDateFilter, pieCustomStart, pieCustomEnd]);

  // --- Data Processing: Pies & KPIs (Section 1) ---
  useEffect(() => {
    let dataToProcess = pieTransactions;
    if (selectedMainCategory) {
      dataToProcess = pieTransactions.filter(
        (tx) => tx.main_category === selectedMainCategory
      );
    }

    const mainCatMap = new Map<string, number>();
    pieTransactions.forEach((tx) => {
      // tx.amount is now positive (from SQL)
      mainCatMap.set(
        tx.main_category,
        (mainCatMap.get(tx.main_category) || 0) + tx.amount
      );
    });
    setMainCategoryPie(
      Array.from(mainCatMap, ([name, value]) => ({ name, value })).sort(
        (a, b) => a.value - b.value
      )
    );

    const accountMap = new Map<string, number>();
    dataToProcess.forEach((tx) => {
      accountMap.set(
        tx.account_name,
        (accountMap.get(tx.account_name) || 0) + tx.amount
      );
    });
    setAccountPieData(
      Array.from(accountMap, ([name, value]) => ({ name, value })).sort(
        (a, b) => a.value - b.value
      )
    );

    const total = dataToProcess.reduce((sum, tx) => sum + tx.amount, 0);
    const count = dataToProcess.length;
    setKpiData({ total, count, avg: count > 0 ? total / count : 0 });
  }, [pieTransactions, selectedMainCategory]);

  // --- Data Fetching & Processing: Progression (Section 2) ---
  useEffect(() => {
    const fetchProgressionData = async () => {
      setLoadingProgression(true);
      const { start, end } = getDatesFromFilter(
        progDateFilter,
        progCustomStart,
        progCustomEnd
      );

      const params: any = {
        p_start_date: start,
        p_end_date: end,
        p_group_by: progGroupBy,
        p_account_ids: progAccounts.includes('all') ? null : progAccounts,
        p_category_id: null,
        p_main_category: null,
        p_series_group: 'account',
      };

      if (progCategory !== 'all') {
        params.p_main_category = progCategory;
      }

      const { data, error } = await supabase.rpc(
        'get_expense_progression_series',
        params
      );

      if (error) {
        setError(error.message);
        setProgressionData([]);
        setProgressionSeriesKeys([]);
      } else if (data && data.length > 0) {
        // data.total_amount is now positive (from SQL)
        const { pivoted, keys } = pivotProgressionData(
          data as ProgressionSqlRecord[]
        );
        setProgressionData(pivoted);
        setProgressionSeriesKeys(keys);
      } else {
        setProgressionData([]);
        setProgressionSeriesKeys([]);
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
    progAccounts,
  ]);

  // --- Data Fetching: Comparison (Section 3) ---
  useEffect(() => {
    const fetchComparisonData = async () => {
      setLoadingComp(true);
      const p1 = new Date(compPeriod1);
      const p2 = new Date(compPeriod2);
      const p1_start = new Date(p1.getFullYear(), p1.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const p1_end = new Date(p1.getFullYear(), p1.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      const p2_start = new Date(p2.getFullYear(), p2.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const p2_end = new Date(p2.getFullYear(), p2.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const params = {
        p_period_1_start: p1_start,
        p_period_1_end: p1_end,
        p_period_2_start: p2_start,
        p_period_2_end: p2_end,
        p_account_ids: compAccounts.includes('all') ? null : compAccounts,
      };

      const { data, error } = await supabase.rpc(
        'get_expense_period_comparison',
        params
      );

      if (error) {
        setError(error.message);
      } else if (data && data.length > 0) {
        const p1_total = data[0].period_1_total;
        const p2_total = data[0].period_2_total;
        const diff = p2_total - p1_total;
        const growth =
          p1_total === 0 ? (p2_total > 0 ? 100 : 0) : (diff / p1_total) * 100;
        setCompKpis({ diff, growth, p1_total, p2_total });
      }
      setLoadingComp(false);
    };

    if (compPeriod === 'monthly' && compPeriod1 && compPeriod2) {
      fetchComparisonData();
    }
  }, [compPeriod, compPeriod1, compPeriod2, compAccounts]);

  // --- Handlers ---
  const handlePieClick = (data: any) => {
    if (data && data.name) {
      if (selectedMainCategory === data.name) {
        setSelectedMainCategory(null);
      } else {
        setSelectedMainCategory(data.name);
      }
    }
  };

  const handleProgAccountSelect = (newSelection: string[]) => {
    if (newSelection.includes('all')) {
      setProgAccounts(['all']);
    } else {
      setProgAccounts(newSelection);
    }
  };

  const handleCompAccountSelect = (newSelection: string[]) => {
    if (newSelection.includes('all')) {
      setCompAccounts(['all']);
    } else {
      setCompAccounts(newSelection);
    }
  };

  const kpiTitle = selectedMainCategory
    ? `Analysis for ${selectedMainCategory} Expenses`
    : 'Analysis for All Spending';

  const isGrowthBad = compKpis.diff > 0;
  const diffKpiClass = isGrowthBad ? styles.red : styles.green;
  const growthKpiClass = isGrowthBad ? styles.red : styles.green;

  // --- UPDATE: Only flip value for display in tooltips/charts ---
  const tooltipFormatter = (value: number) => [
    formatCurrency(value * -1), // Display as negative
    'Amount',
  ];
  const barXAxisFormatter = (value: number) => formatCurrency(value * -1);

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

      {/* --- SECTION 1: Pie Charts (Unchanged) --- */}
      <h3 className={styles.listTitle} style={{ marginTop: '1rem' }}>
        Spending Distribution
      </h3>
      <div
        className={styles.filterWrapper}
        style={{ justifyContent: 'flex-start' }}
      >
        <label className={styles.label}>Date Range:</label>
        <select
          className={styles.input}
          value={pieDateFilter}
          onChange={(e) =>
            setPieDateFilter(e.target.value as DateRangeFilter)
          }
        >
          <option value="ytd">Year to Date</option>
          <option value="month">This Month</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
        {pieDateFilter === 'custom' && (
          <>
            <label className={styles.label} htmlFor="pie-start-date">
              From:
            </label>
            <input
              type="date"
              id="pie-start-date"
              className={styles.input}
              value={pieCustomStart}
              onChange={(e) => setPieCustomStart(e.target.value)}
            />
            <label className={styles.label} htmlFor="pie-end-date">
              To:
            </label>
            <input
              type="date"
              id="pie-end-date"
              className={styles.input}
              value={pieCustomEnd}
              onChange={(e) => setPieCustomEnd(e.target.value)}
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
        <div className={`${styles.kpiCard} ${styles.red}`}>
          <h3 className={styles.kpiTitle}>Total Spent</h3>
          <p className={styles.kpiValue}>{formatCurrency(-kpiData.total)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}># of Transactions</h3>
          <p className={styles.kpiValue}>{kpiData.count}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Avg. Transaction</h3>
          {/* --- FIX: Display Average as NEGATIVE to match Total --- */}
          <p className={styles.kpiValue}>{formatCurrency(-kpiData.avg)}</p>
        </div>
      </div>

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
              Spending by Main Category
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
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
                    onClick={handlePieClick}
                  >
                    {/* --- UPDATED: Use central colors --- */}
                    {mainCategoryPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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
                ? `Spending by Account (for ${selectedMainCategory})`
                : 'Spending by Account'}
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
                    data={accountPieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
                  >
                    {/* --- UPDATED: Use central colors --- */}
                    {accountPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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
                  data={accountPieData}
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
                    {/* --- UPDATED: Use central colors --- */}
                    {accountPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* --- SECTION 2: Expense Progression (VISUALS & LOGIC FIXED) --- */}
      <div
        className={`${styles.card} ${styles.tableSection}`}
        style={{ marginTop: '2rem' }}
      >
        <h2 className={styles.cardTitle}>Expense Progression by Account</h2>
        <div
          className={styles.filterWrapper}
          style={{ justifyContent: 'flex-start' }}
        >
          <label className={styles.label}>Accounts:</label>
          <CustomMultiSelect
            options={accountList.map((acc) => ({
              id: acc.account_id,
              name: acc.account_name,
            }))}
            selected={progAccounts}
            onSelect={handleProgAccountSelect}
            label="Accounts"
            isOpen={isProgAccountOpen}
            setIsOpen={setIsProgAccountOpen}
            dropdownRef={progAccountRef}
          />
          <label className={styles.label}>Filter by Category:</label>
          <select
            className={styles.input}
            value={progCategory}
            onChange={(e) => setProgCategory(e.target.value)}
          >
            <option value="all">All Expenses</option>
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

        <div className={styles.chartContainer} style={{ height: '300px', marginTop: '1rem' }}>
          {loadingProgression ? (
            <p>Loading chart...</p>
          ) : progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(tick) => formatXAxis(tick, progGroupBy)}
                  fontSize="0.7rem"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value * -1)}
                  fontSize="0.7rem"
                  width={100}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value * -1),
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />

                {/* --- UPDATED: Use central colors --- */}
                {progressionSeriesKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    name={key}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', padding: '1rem' }}>
              No expense data available for this period/filter.
            </p>
          )}
        </div>
      </div>

      {/* --- SECTION 3: Period Comparison (VISUALS FIXED) --- */}
      <div
        className={`${styles.card} ${styles.tableSection}`}
        style={{ marginTop: '2rem' }}
      >
        <h2 className={styles.cardTitle}>Period-over-Period Comparison</h2>
        <div
          className={styles.filterWrapper}
          style={{ justifyContent: 'flex-start' }}
        >
          <label className={styles.label}>Accounts:</label>
          <CustomMultiSelect
            options={accountList.map((acc) => ({
              id: acc.account_id,
              name: acc.account_name,
            }))}
            selected={compAccounts}
            onSelect={handleCompAccountSelect}
            label="Accounts"
            isOpen={isCompAccountOpen}
            setIsOpen={setIsCompAccountOpen}
            dropdownRef={compAccountRef}
          />

          <label className={styles.label}>Compare Period:</label>
          <select
            className={styles.input}
            value={compPeriod}
            onChange={(e) =>
              setCompPeriod(e.target.value as ComparisonPeriod)
            }
          >
            <option value="monthly">Monthly</option>
            <option value="yearly" disabled={true}>
              Yearly (coming soon)
            </option>
          </select>

          <label className={styles.label}>Period 1:</label>
          <input
            type="month"
            className={styles.input}
            value={compPeriod1}
            onChange={(e) => setCompPeriod1(e.target.value)}
          />
          <label className={styles.label}>Period 2:</label>
          <input
            type="month"
            className={styles.input}
            value={compPeriod2}
            onChange={(e) => setCompPeriod2(e.target.value)}
          />
        </div>

        {loadingComp ? (
          <p style={{ padding: '1rem' }}>Loading comparison...</p>
        ) : (
          <div
            className={styles.kpiSection}
            style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            <div className={`${styles.kpiCard} ${styles.gray}`}>
              <h3 className={styles.kpiTitle}>Period 1 Total</h3>
              <p className={styles.kpiValue}>
                {formatCurrency(compKpis.p1_total * -1)}
              </p>
            </div>
            <div className={`${styles.kpiCard} ${styles.gray}`}>
              <h3 className={styles.kpiTitle}>Period 2 Total</h3>
              <p className={styles.kpiValue}>
                {formatCurrency(compKpis.p2_total * -1)}
              </p>
            </div>
            <div className={`${styles.kpiCard} ${diffKpiClass}`}>
              <h3 className={styles.kpiTitle}>Difference</h3>
              <p className={styles.kpiValue}>
                {formatCurrency(compKpis.diff * -1)}
              </p>
            </div>
            <div className={`${styles.kpiCard} ${growthKpiClass}`}>
              <h3 className={styles.kpiTitle}>Growth (%)</h3>
              <p className={styles.kpiValue}>{compKpis.growth.toFixed(2)}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseAnalysis;