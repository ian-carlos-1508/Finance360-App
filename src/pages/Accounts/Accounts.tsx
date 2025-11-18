/* Replace file: src/pages/Accounts/AccountsPage.tsx */

import { useState, useEffect } from 'react';
import { type Account } from '../../components/Accounts/AddAccountForm';
import AccountManager from '../../components/Settings/AccountManager';
import styles from '../Settings/Settings.module.css';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import GenericTransactionList, {
  type AllTransaction,
} from '../../components/Transactions/GenericTransactionList';
import { formatCurrency } from '../../lib/utils';
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
  COLOR_INCOME, // Import COLOR_INCOME for the pie chart
} from '../../lib/chartColors';

// --- Type definitions ---
type AccountFilter = 'all' | 'cash' | 'credit';
type GroupByFilter = 'weekly' | 'monthly' | 'yearly';
type KpiData = {
  kpi1_title: string;
  kpi1_value: number;
  kpi1_color: 'blue' | 'green' | 'red' | 'gray';
  kpi2_title: string;
  kpi2_value: number;
  kpi2_isCurrency: boolean;
  kpi3_title: string;
  kpi3_value: number;
  kpi3_isCurrency: boolean;
};

type BalanceDataPoint = { date: string; balance: number };
// --- FIX: Define PieData type ---
type PieData = { name: string; value: number };

// --- TIMEZONE BUG FIX: Add helper function ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END FIX ---

// --- Helper Functions ---
const formatXAxis = (tickItem: string) => {
  // FIX: Use local noon parsing
  const date = new Date(tickItem + 'T12:00:00');
  if (isNaN(date.getTime())) return '';

  if (tickItem.length <= 7) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const groupData = (
  data: BalanceDataPoint[],
  period: GroupByFilter
): BalanceDataPoint[] => {
  if (data.length === 0) return [];

  const parseDate = (dateString: string) => new Date(dateString + 'T12:00:00');

  if (period === 'yearly') {
    const grouped: { [key: string]: BalanceDataPoint[] } = {};
    data.forEach((item) => {
      const year = parseDate(item.date).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(item);
    });
    return Object.keys(grouped).map((key) => {
      const group = grouped[key];
      return group[group.length - 1];
    });
  }

  const grouped: { [key: string]: BalanceDataPoint[] } = {};
  data.forEach((item) => {
    const date = parseDate(item.date);
    let key = '';

    if (period === 'weekly') {
      const day = date.getDay();
      const firstDayOfWeek = new Date(date.setDate(date.getDate() - day));
      key = firstDayOfWeek.toISOString().split('T')[0];
    } else {
      // monthly
      key = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-01`;
    }

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return Object.keys(grouped).map((key) => {
    const group = grouped[key];
    return group[group.length - 1];
  });
};
// --- End Helper Functions ---

function AccountsPage() {
  // --- State for KPIs ---
  const [kpiData, setKpiData] = useState<KpiData>({
    kpi1_title: 'Total Balance',
    kpi1_value: 0,
    kpi1_color: 'blue',
    kpi2_title: '# of Accounts',
    kpi2_value: 0,
    kpi2_isCurrency: false,
    kpi3_title: 'Average Balance',
    kpi3_value: 0,
    kpi3_isCurrency: true,
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<AccountFilter>('all');
  // --- FIX: Add state for Pie Chart ---
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);

  // --- State for Drill-Down ---
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<
    AllTransaction[]
  >([]);
  const [balanceTrend, setBalanceTrend] = useState<BalanceDataPoint[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loading, setLoading] = useState(true); // Main page loader

  // NEW STATE: Grouping for Trend Chart
  const [groupBy, setGroupBy] = useState<GroupByFilter>('monthly');
  
  // --- RACE CONDITION FIX: Add a refresh key ---
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetches data based on the filter
  const fetchPageData = async () => {
    setLoading(true);
    let query = supabase.from('accounts').select('*, current_balance');

    if (filter !== 'all') {
      query = query.eq('type', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
    } else if (data) {
      setAccounts(data);

      const cashAccounts = data.filter((a) => a.type === 'cash');
      const creditAccounts = data.filter((a) => a.type === 'credit');

      const totalCash = cashAccounts.reduce(
        (sum, acc) => sum + acc.current_balance,
        0
      );
      
      // Credit balances are NEGATIVE, so sum them first
      const totalCreditBalance = creditAccounts.reduce(
        (sum, acc) => sum + acc.current_balance, 0
      );
      // "Total Owed" is the positive version of that number
      const totalCreditOwed = Math.abs(totalCreditBalance);

      if (filter === 'all') {
        setKpiData({
          kpi1_title: 'Total Cash',
          kpi1_value: totalCash,
          kpi1_color: 'green',
          kpi2_title: 'Total Credit Owed',
          kpi2_value: totalCreditOwed,
          kpi2_isCurrency: true,
          kpi3_title: 'Net Cash Position',
          kpi3_value: totalCash + totalCreditBalance, // totalCash + (negative balance)
          kpi3_isCurrency: true,
        });
        
        // --- PIE CHART FIX ---
        setPieChartData([
          { name: 'Total Cash', value: totalCash },
          { name: 'Total Owed', value: totalCreditOwed }
        ].filter(d => d.value > 0)); // Filter out 0 values

      } else if (filter === 'cash') {
        setKpiData({
          kpi1_title: 'Total Cash',
          kpi1_value: totalCash,
          kpi1_color: 'green',
          kpi2_title: '# of Accounts',
          kpi2_value: cashAccounts.length,
          kpi2_isCurrency: false,
          kpi3_title: 'Average Balance',
          kpi3_value:
            cashAccounts.length > 0 ? totalCash / cashAccounts.length : 0,
          kpi3_isCurrency: true,
        });
        
        // --- PIE CHART FIX ---
        setPieChartData(cashAccounts.map((acc) => ({
          name: acc.account_name,
          value: acc.current_balance, // Cash balance is already positive
        })));
        
      } else if (filter === 'credit') {
        setKpiData({
          kpi1_title: 'Total Owed',
          kpi1_value: totalCreditOwed,
          kpi1_color: 'red',
          kpi2_title: '# of Cards',
          kpi2_value: creditAccounts.length,
          kpi2_isCurrency: false,
          kpi3_title: 'Average Owed',
          kpi3_value:
            creditAccounts.length > 0
              ? totalCreditOwed / creditAccounts.length
              : 0,
          kpi3_isCurrency: true,
        });
        
        // --- PIE CHART FIX ---
        setPieChartData(creditAccounts.map((acc) => ({
          name: acc.account_name,
          value: Math.abs(acc.current_balance), // Use positive value for chart
        })));
      }
    }
    setLoading(false);
  };

  // Fetches balance trend for the selected account
  const fetchAccountBalanceTrend = async (
    accountId: string,
    accountType: string
  ) => {
    setLoadingTrend(true);
    // --- TIMEZONE BUG FIX ---
    const ninetyDaysAgo = getLocalYyyyMmDd(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    const today = getLocalYyyyMmDd();
    // --- END FIX ---

    const { data, error } = await supabase.rpc('get_account_balance_trend', {
      p_account_id: accountId,
      p_start_date: ninetyDaysAgo,
      p_end_date: today,
    });

    if (error) {
      console.error('Error fetching balance trend:', error);
      setBalanceTrend([]);
    } else {
      const trendData = data as BalanceDataPoint[];

      // --- DATA INTEGRITY FIX ---
      // The RPC returns the *actual* balance. Credit balances are negative.
      // We take the absolute value for the chart so "owing more" goes up.
      const processedData =
        accountType === 'credit'
          ? trendData.map((d) => ({ ...d, balance: Math.abs(d.balance) }))
          : trendData;
      // --- END FIX ---

      // Sort chronologically
      const sortedData = processedData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Save the daily data. The chart rendering will group it.
      setBalanceTrend(sortedData);
    }
    setLoadingTrend(false);
  };

  // Fetches transactions for the selected account (PAGINATION)
  const fetchAccountTransactions = async (accountId: string) => {
    setLoadingTx(true);
    const { data, error } = await supabase
      .from('v_all_transactions')
      .select('*')
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .order('date', { ascending: false })
      .limit(10); // Limited to 10 transactions

    if (error) {
      console.error('Error fetching account transactions:', error);
    } else if (data) {
      setAccountTransactions(data as AllTransaction[]);
    }
    setLoadingTx(false);
  };

  // --- RECURRING TRANSACTIONS TRIGGER ---
  useEffect(() => {
    const processTransactions = async () => {
      setLoading(true); // Start loading
      // Call the new SQL function to back-fill transactions
      const { error } = await supabase.rpc('fn_process_recurring_transactions');
      if (error) {
        console.error("Error processing recurring transactions:", error.message);
      }
      // After processing, trigger the data fetch
      setRefreshKey(key => key + 1); 
    };
    
    processTransactions();
  }, [filter]); // Re-run when filter changes
  // --- END TRIGGER ---
  
  // --- NEW: Data fetching hook triggered by refreshKey ---
  useEffect(() => {
    // Do not run on the initial render (refreshKey = 0)
    if (refreshKey > 0) {
      fetchPageData();
    }
  }, [refreshKey]);
  // --- END NEW HOOK ---

  // Re-fetch transactions and TREND when the selected account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchAccountTransactions(selectedAccount.account_id);
      fetchAccountBalanceTrend(selectedAccount.account_id, selectedAccount.type);
    } else {
      setAccountTransactions([]);
      setBalanceTrend([]); // Clear trend when no account is selected
    }
  }, [selectedAccount]);

  // --- PIE CHART FIX: This logic is now handled in fetchPageData ---
  // const chartData = accounts.map((acc) => ({
  //   name: acc.account_name,
  //   value: Math.abs(acc.current_balance),
  // }));

  const handleAccountSelected = (account: Account) => {
    if (selectedAccount?.account_id === account.account_id) {
      setSelectedAccount(null);
    } else {
      setSelectedAccount(account);
    }
  };

  // --- UPDATED: Use central colors ---
  const trendColor =
    selectedAccount?.type === 'credit' ? COLOR_EXPENSE : COLOR_TRANSFER;
  // --- END UPDATE ---

  // APPLY GROUPING LOGIC HERE
  const processedChartData = groupData(balanceTrend, groupBy);

  // Show main loader only on initial load or full filter change
  if (loading && refreshKey === 0) {
     return <div>Loading account data...</div>;
  }

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
        <h1 className={styles.title}>Accounts Overview</h1>

        <div className={styles.filterGroup} style={{ marginBottom: '2rem' }}>
          <button
            className={
              filter === 'all' ? styles.filterButtonActive : styles.filterButton
            }
            onClick={() => setFilter('all')}
          >
            All Accounts
          </button>
          <button
            className={
              filter === 'cash' ? styles.filterButtonActive : styles.filterButton
            }
            onClick={() => setFilter('cash')}
          >
            Cash
          </button>
          <button
            className={
              filter === 'credit'
                ? styles.filterButtonActive
                : styles.filterButton
            }
            onClick={() => setFilter('credit')}
          >
            Credit Cards
          </button>
        </div>
      </div>

      <div className={styles.pageGrid}>
        {/* ... (KPIs Section is unchanged) ... */}
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles[kpiData.kpi1_color]}`}>
            <h3 className={styles.kpiTitle}>{kpiData.kpi1_title}</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.kpi1_value)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>{kpiData.kpi2_title}</h3>
            <p className={styles.kpiValue}>
              {kpiData.kpi2_isCurrency
                ? formatCurrency(kpiData.kpi2_value)
                : kpiData.kpi2_value}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>{kpiData.kpi3_title}</h3>
            <p className={styles.kpiValue}>
              {kpiData.kpi3_isCurrency
                ? formatCurrency(kpiData.kpi3_value)
                : kpiData.kpi3_value}
            </p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.tableSection}`}>
          <h2 className={styles.cardTitle}>My Accounts & Management</h2>
          <AccountManager
            onDataUpdated={() => setRefreshKey(key => key + 1)} // FIX: Trigger refresh
            onAccountSelect={handleAccountSelected}
            selectedAccountId={selectedAccount?.account_id || null}
            accounts={accounts}
            filter={filter}
          />
        </div>

        {selectedAccount && (
          <div className={`${styles.card} ${styles.tableSection}`}>
            <h2 className={styles.cardTitle}>
              Transaction History for: <strong>{selectedAccount.account_name}</strong> (Last 10)
            </h2>
            {loadingTx ? (
              <p>Loading transactions...</p>
            ) : (
              <GenericTransactionList transactions={accountTransactions} />
            )}
          </div>
        )}

        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Balance Distribution ({filter})</h2>
            <div className={styles.chartContainer}>
              {/* --- PIE CHART FIX: Use pieChartData state --- */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    // Use a simple percentage label
                    label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                  >
                    {/* --- UPDATED: Use central colors --- */}
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        // FIX: Use specific colors for "All" filter
                        fill={filter === 'all' 
                          ? (entry.name === 'Total Cash' ? COLOR_INCOME : COLOR_EXPENSE)
                          : CHART_COLORS[index % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Account Activity Trend</h2>

            {/* NEW: Grouping Filter Dropdown */}
            <div
              className={styles.filterWrapper}
              style={{
                justifyContent: 'flex-start',
                padding: '0 1rem 0.5rem',
              }}
            >
              <label className={styles.label}>Group By:</label>
              <select
                className={styles.input}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
                style={{ width: 'auto' }}
                disabled={!selectedAccount}
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
              ) : selectedAccount ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={processedChartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatXAxis}
                      fontSize="0.7rem"
                      minTickGap={20}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      fontSize="0.7rem"
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        // FIX: Show "Amount Owed" for credit
                        selectedAccount.type === 'credit' ? 'Amount Owed' : 'Balance',
                      ]}
                      labelFormatter={(label: string) =>
                        `Date: ${new Date(label).toLocaleDateString()}`
                      }
                    />
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={trendColor}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={trendColor}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={trendColor}
                      fill="url(#colorTrend)"
                      // FIX: Show "Amount Owed" for credit
                      name={selectedAccount.type === 'credit' ? 'Amount Owed' : 'Balance'}
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p
                  style={{
                    textAlign: 'center',
                    marginTop: '30%',
                    color: '#6b7280',
                  }}
                >
                  Select an account above to view its balance trend.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountsPage;