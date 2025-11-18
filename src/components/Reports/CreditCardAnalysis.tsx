/* Replace file: src/components/Reports/CreditCardAnalysis.tsx */

import { useState, useEffect, useRef } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { CHART_COLORS, COLOR_EXPENSE } from '../../lib/chartColors';
import { type Account } from '../Accounts/AddAccountForm';
import { IoCheckmarkCircle, IoChevronDown } from 'react-icons/io5';

// --- Type Definitions ---
type PieChartDataPoint = {
  name: string;
  value: number;
};
type KpiData = {
  total_owed: number;
  total_limit: number;
  utilization_pct: number;
};
type AnalyticsData = {
  kpis: KpiData | null;
  allocation: PieChartDataPoint[] | null;
};
type LineChartDataPoint = {
  date_period: string;
  balance: number;
};
type DateRangeFilter = 'ytd' | 'month' | '30days' | 'all' | 'custom';
type GroupByFilter = 'weekly' | 'monthly' | 'yearly';

// --- Helper Functions ---
const formatXAxis = (tickItem: string, period: GroupByFilter) => {
  let dateString = tickItem;
  if (period === 'monthly' && tickItem.length === 7) {
    dateString = tickItem + '-01';
  } else if (period === 'yearly' && tickItem.length === 4) {
    return tickItem;
  }
  let date = new Date(dateString + 'T12:00:00');
  if (isNaN(date.getTime())) return "Invalid Date";
  if (period === 'monthly') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  if (period === 'weekly') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return tickItem;
};

const getDatesFromFilter = (filter: DateRangeFilter, start: string, end: string) => {
  const today = new Date();
  let startDate: Date;
  let endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  if (filter === 'custom') {
    startDate = new Date(start + 'T00:00:00');
    endDate = new Date(end + 'T23:59:59');
  } else if (filter === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (filter === '30days') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (filter === 'ytd') {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else { // 'all'
    startDate = new Date('2020-01-01');
  }
  return { 
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

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
  options, selected, onSelect, label, isOpen, setIsOpen, dropdownRef
}) => {
  const allValue = 'all';
  const isAllSelected = selected.includes(allValue);

  const handleToggle = (id: string) => {
    if (id === allValue) {
      onSelect(isAllSelected ? [] : [allValue]);
    } else {
      const currentSelection = selected.filter(s => s !== allValue);
      if (currentSelection.includes(id)) {
        onSelect(currentSelection.filter(item => item !== id));
      } else {
        onSelect([...currentSelection, id]);
      }
    }
  };
  const getDisplayValue = () => {
    if (isAllSelected) return `All ${label}`;
    if (selected.length === 0) return `No ${label} selected`;
    if (selected.length === 1) {
      const selectedOption = options.find(opt => opt.id === selected[0]);
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
          textAlign: 'left'
        }}
      >
        <span>{getDisplayValue()}</span>
        <IoChevronDown style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
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
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
          }}
        >
          <div 
            key={allValue}
            onClick={() => handleToggle(allValue)}
            style={{
              display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem',
              fontSize: '0.8rem', fontWeight: isAllSelected ? 600 : 400,
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <IoCheckmarkCircle style={{ color: isAllSelected ? '#3b82f6' : '#e5e7eb', marginRight: '0.5rem' }} />
            **All {label}**
          </div>
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <div 
                key={option.id}
                onClick={() => handleToggle(option.id)}
                style={{
                  display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', 
                  fontSize: '0.8rem', opacity: isAllSelected ? 0.5 : 1,
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <IoCheckmarkCircle style={{ color: isSelected ? '#3b82f6' : '#e5e7eb', marginRight: '0.5rem' }} />
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


function CreditCardAnalysis() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [error, setError] = useState('');

  // --- State for progression chart ---
  const [lineChartData, setLineChartData] = useState<LineChartDataPoint[]>([]);
  const [loadingLineChart, setLoadingLineChart] = useState(false);
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['all']);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByFilter>('monthly');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ytd');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const accountRef = useRef<HTMLDivElement>(null);

  // --- Hook for click-outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch main analytics (KPIs, Pie) and Account List
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingAnalytics(true);
      
      const { data: analytics, error: analyticsError } = await supabase.rpc('fn_get_credit_card_analytics');
      if (analyticsError) {
        setError(analyticsError.message);
        console.error('Error fetching credit card analytics:', analyticsError);
      } else {
        setAnalyticsData(analytics);
      }
      
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('account_id, account_name')
        .eq('type', 'credit')
        .order('account_name');
        
      if (accountsError) {
        setError(accountsError.message);
      } else {
        setAccountList(accounts as any);
      }

      setLoadingAnalytics(false);
    };
    fetchAllData();
  }, []);

  // 2. Fetch line chart data when filters change
  useEffect(() => {
    const fetchChartData = async () => {
      setLoadingLineChart(true);
      const { start, end } = getDatesFromFilter(dateFilter, customStart, customEnd);

      const { data, error } = await supabase.rpc('fn_get_credit_balance_trend', {
        p_start_date: start,
        p_end_date: end,
        p_group_by: groupBy,
        p_account_ids: selectedAccounts.includes('all') ? null : selectedAccounts,
      });

      if (error) {
        setError(error.message);
        setLineChartData([]);
      } else {
        // SQL now returns NEGATIVE values (debt), which is what we want
        setLineChartData(data as LineChartDataPoint[]);
      }
      setLoadingLineChart(false);
    };

    fetchChartData();
  }, [selectedAccounts, groupBy, dateFilter, customStart, customEnd]);


  if (loadingAnalytics) {
    return <p>Loading credit card analytics...</p>;
  }

  if (error && !analyticsData) {
    return <p className={styles.errorText}>Error: {error}</p>;
  }

  if (!analyticsData) {
    return <p>No credit card data found.</p>;
  }

  const { kpis, allocation } = analyticsData;
  const kpiData = kpis || { total_owed: 0, total_limit: 0, utilization_pct: 0 };
  const allocationData = allocation || [];

  const getUtilStatus = (util: number) => {
    if (util < 10) return styles.green;
    if (util < 30) return styles.warning;
    return styles.red;
  };
  const utilStatusClass = getUtilStatus(kpiData.utilization_pct);

  return (
    <div>
      {/* --- SECTION 1: KPIs --- */}
      <h3 className={styles.listTitle} style={{ marginTop: '1rem' }}>Credit Card Summary</h3>
      <div className={styles.kpiSection} style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={`${styles.kpiCard} ${styles.red}`}>
          <h3 className={styles.kpiTitle}>Total Owed</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.total_owed)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Total Credit Limit</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.total_limit)}</p>
        </div>
        <div className={`${styles.kpiCard} ${utilStatusClass}`}>
          <h3 className={styles.kpiTitle}>Credit Utilization</h3>
          <p className={styles.kpiValue}>{kpiData.utilization_pct.toFixed(2)}%</p>
        </div>
      </div>

      {/* --- SECTION 2: Allocation Pie Chart --- */}
      <div className={styles.card} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Debt Allocation by Card</h2>
        <div className={styles.chartContainer} style={{ height: '300px' }}>
          {allocationData.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: '4rem', color: '#6b7280' }}>
              No credit card debt found.
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
      
      {/* --- Progression Chart --- */}
      <div className={`${styles.card} ${styles.tableSection}`} style={{ marginTop: '2rem' }}>
        <h2 className={styles.cardTitle}>Balance Progression Over Time</h2>
        
        {/* --- Filters --- */}
        <div className={styles.filterWrapper} style={{ justifyContent: 'flex-start' }}>
          <label className={styles.label}>Accounts:</label>
          <CustomMultiSelect
            options={accountList.map(acc => ({ id: acc.account_id, name: acc.account_name }))}
            selected={selectedAccounts}
            onSelect={setSelectedAccounts}
            label="Cards"
            isOpen={isAccountOpen}
            setIsOpen={setIsAccountOpen}
            dropdownRef={accountRef}
          />
          <label className={styles.label}>Group By:</label>
          <select 
            className={styles.input}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <label className={styles.label}>Date Range:</label>
          <select 
            className={styles.input}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
          >
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        {dateFilter === 'custom' && (
          <div className={styles.filterWrapper} style={{ justifyContent: 'flex-start', marginTop: '1rem' }}>
            <label className={styles.label} htmlFor="start-date">Start Date:</label>
            <input 
              type="date" id="start-date" className={styles.input} 
              value={customStart} onChange={(e) => setCustomStart(e.target.value)}
            />
            <label className={styles.label} htmlFor="end-date">End Date:</label>
            <input 
              type="date" id="end-date" className={styles.input} 
              value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}

        {error && <p className={styles.errorText} style={{ marginTop: '1rem' }}>{error}</p>}
        
        <div className={styles.chartContainer} style={{ height: '350px', marginTop: '2rem' }}>
          {loadingLineChart ? (
            <p>Loading chart data...</p>
          ) : lineChartData.length === 0 ? (
            <p style={{ textAlign: 'center', paddingTop: '4rem', color: '#6b7280' }}>
              No transaction data found for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={lineChartData}
                margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date_period" tickFormatter={(tick) => formatXAxis(tick, groupBy)} fontSize="0.7rem" />
                <YAxis
                  tickFormatter={(val) => formatCurrency(val)}
                  fontSize="0.7rem"
                  width={100}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  labelFormatter={(label: string) => `Period: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Total Card Balance"
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

export default CreditCardAnalysis;