import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css'; // Use master CSS
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { type Account } from '../Accounts/AddAccountForm';
import GenericTransactionList, { type AllTransaction } from '../Transactions/GenericTransactionList';

// --- Type Definitions ---
type BalanceDataPoint = { date: string; balance: number; };
type KpiData = { start: number; end: number; change: number };
// UPDATED: Added 'custom'
type DateRangeFilter = 'ytd' | 'month' | '30days' | '90days' | 'all' | 'custom';
type GroupByFilter = 'daily' | 'weekly' | 'monthly';

// --- Helper Functions ---
const formatXAxis = (tickItem: string) => {
  const date = new Date(tickItem);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// This function now just needs a start date
const getStartDate = (filter: DateRangeFilter): Date => {
  const today = new Date();
  let startDate: Date;

  if (filter === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (filter === '30days') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (filter === '90days') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  } else if (filter === 'ytd') {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else { // 'all'
    startDate = new Date('2020-01-01'); // A reasonable default start
  }
  return startDate;
};

const groupData = (data: BalanceDataPoint[], period: GroupByFilter): BalanceDataPoint[] => {
  // ... (This function is unchanged)
  if (period === 'daily' || data.length === 0) return data;
  const grouped: { [key: string]: BalanceDataPoint[] } = {};
  data.forEach(item => {
    const date = new Date(item.date);
    let key = '';
    if (period === 'weekly') {
      const day = date.getDay();
      const firstDayOfWeek = new Date(date.setDate(date.getDate() - day)).toISOString().split('T')[0];
      key = firstDayOfWeek;
    } else { // monthly
      key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
    }
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  return Object.keys(grouped).map(key => {
    const group = grouped[key];
    return group[group.length - 1];
  });
};
// --- End Helper Functions ---


function AccountStatement() {
  // --- State ---
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [balanceData, setBalanceData] = useState<BalanceDataPoint[]>([]);
  const [transactions, setTransactions] = useState<AllTransaction[]>([]);
  
  const [kpiData, setKpiData] = useState<KpiData>({start: 0, end: 0, change: 0});
  
  // UPDATED: Filter state
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ytd');
  const [groupBy, setGroupBy] = useState<GroupByFilter>('daily');
  // NEW: State for custom date pickers
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase.from('accounts').select('*');
      if (data) {
        setAccountList(data);
        if (data.length > 0) {
          setSelectedAccountId(data[0].account_id);
        }
      }
    };
    fetchAccounts();
  }, []);
  
  // Re-fetch when account or ANY date filter changes
  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchReportData = async () => {
      setLoading(true);
      setError('');
      
      // UPDATED: Date logic
      let start: string;
      let end: string;

      if (dateFilter === 'custom') {
        start = customStartDate;
        end = customEndDate;
      } else {
        start = getStartDate(dateFilter).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0]; // Today
      }
      
      // 1. Fetch Balance Trend
      const { data: trendData, error: trendError } = await supabase.rpc('get_account_balance_trend', {
        p_account_id: selectedAccountId,
        p_start_date: start,
        p_end_date: end,
      });

      if (trendError) {
        setError(trendError.message);
        console.error('Error fetching balance trend:', trendError);
        setBalanceData([]);
      } else {
        setBalanceData(trendData);
        if (trendData && trendData.length > 0) {
          const startBalance = trendData[0].balance;
          const endBalance = trendData[trendData.length - 1].balance;
          setKpiData({ start: startBalance, end: endBalance, change: endBalance - startBalance });
        } else {
          setKpiData({ start: 0, end: 0, change: 0 });
        }
      }

      // 2. Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('v_all_transactions')
        .select('*')
        .or(`account_id.eq.${selectedAccountId},to_account_id.eq.${selectedAccountId}`)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });
      
      if (txError) {
        setError(txError.message);
      } else {
        setTransactions(txData as AllTransaction[]);
      }

      setLoading(false);
    };

    fetchReportData();
  }, [selectedAccountId, dateFilter, customStartDate, customEndDate]); // Re-run when custom dates change

  const selectedAccount = accountList.find(a => a.account_id === selectedAccountId);
  const kpiColor = kpiData.change >= 0 ? 'green' : 'red';
  
  const processedChartData = groupData(balanceData, groupBy);

  return (
    <div>
      {/* --- Filter Dropdowns --- */}
      <div className={styles.filterWrapper} style={{justifyContent: 'flex-start'}}>
        <label className={styles.label} htmlFor="account-filter">Account:</label>
        <select 
          id="account-filter"
          className={styles.input}
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
        >
          {accountList.map(acc => (
            <option key={acc.account_id} value={acc.account_id}>
              {acc.account_name} ({acc.type})
            </option>
          ))}
        </select>
        
        <label className={styles.label} htmlFor="date-filter">Date Range:</label>
        <select 
          id="date-filter"
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
        
        <label className={styles.label} htmlFor="group-by">Group By:</label>
        <select 
          id="group-by"
          className={styles.input}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      
      {/* --- NEW: Custom Date Pickers --- */}
      {dateFilter === 'custom' && (
        <div className={styles.filterWrapper} style={{justifyContent: 'flex-start', marginTop: '1rem'}}>
          <label className={styles.label} htmlFor="start-date">Start Date:</label>
          <input 
            type="date" 
            id="start-date" 
            className={styles.input} 
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
          />
          <label className={styles.label} htmlFor="end-date">End Date:</label>
          <input 
            type="date" 
            id="end-date" 
            className={styles.input} 
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
          />
        </div>
      )}
      
      {error && <p className={styles.errorText} style={{ textAlign: 'center', margin: '1rem 0' }}>Error: {error}</p>}

      {/* --- KPIs --- */}
      <div className={styles.kpiSection} style={{marginTop: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Start Balance</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.start)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>End Balance</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.end)}</p>
        </div>
        <div className={`${styles.kpiCard} ${styles[kpiColor]}`}>
          <h3 className={styles.kpiTitle}>Net Change</h3>
          <p className={styles.kpiValue}>{formatCurrency(kpiData.change)}</p>
        </div>
      </div>

      {/* --- Chart Area --- */}
      <h3 className={styles.listTitle} style={{marginTop: '2rem'}}>Balance Progression</h3>
      <div className={styles.chartContainer} style={{height: '300px', marginBottom: '2rem'}}>
        {loading ? <p>Loading chart...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis} 
                fontSize="0.7rem"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)} 
                fontSize="0.7rem"
                width={100}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Balance"]}
                labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              />
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedAccount?.type === 'credit' ? '#ef4444' : '#3b82f6'} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={selectedAccount?.type === 'credit' ? '#ef4444' : '#3b82f6'} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke={selectedAccount?.type === 'credit' ? '#ef4444' : '#3b82f6'}
                fill="url(#colorBalance)"
                name="Balance"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* --- Transaction List Area --- */}
      <h3 className={styles.listTitle} style={{marginTop: '1.5rem'}}>Transaction Ledger</h3>
      {loading ? <p>Loading transactions...</p> : (
        <GenericTransactionList transactions={transactions} />
      )}
    </div>
  );
}

export default AccountStatement;