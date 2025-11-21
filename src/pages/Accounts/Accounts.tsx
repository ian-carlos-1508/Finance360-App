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
import {
  CHART_COLORS,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
  COLOR_INCOME, 
} from '../../lib/chartColors';
// --- NEW: Import BackToHub ---
import BackToHub from '../../components/Navigation/BackToHub';

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
type PieData = { name: string; value: number };

// --- Helper Functions ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatXAxis = (tickItem: string) => {
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
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);

  // --- State for Drill-Down ---
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<
    AllTransaction[]
  >([]);
  const [balanceTrend, setBalanceTrend] = useState<BalanceDataPoint[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loading, setLoading] = useState(true);

  // Grouping for Trend Chart
  const [groupBy, setGroupBy] = useState<GroupByFilter>('monthly');
  
  // Refresh key
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
      
      const totalCreditBalance = creditAccounts.reduce(
        (sum, acc) => sum + acc.current_balance, 0
      );
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
          kpi3_value: totalCash + totalCreditBalance,
          kpi3_isCurrency: true,
        });
        
        setPieChartData([
          { name: 'Total Cash', value: totalCash },
          { name: 'Total Owed', value: totalCreditOwed }
        ].filter(d => d.value > 0));

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
        
        setPieChartData(cashAccounts.map((acc) => ({
          name: acc.account_name,
          value: acc.current_balance,
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
        
        setPieChartData(creditAccounts.map((acc) => ({
          name: acc.account_name,
          value: Math.abs(acc.current_balance),
        })));
      }
    }
    setLoading(false);
  };

  const fetchAccountBalanceTrend = async (
    accountId: string,
    accountType: string
  ) => {
    setLoadingTrend(true);
    const ninetyDaysAgo = getLocalYyyyMmDd(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    const today = getLocalYyyyMmDd();

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

      const processedData =
        accountType === 'credit'
          ? trendData.map((d) => ({ ...d, balance: Math.abs(d.balance) }))
          : trendData;

      const sortedData = processedData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setBalanceTrend(sortedData);
    }
    setLoadingTrend(false);
  };

  const fetchAccountTransactions = async (accountId: string) => {
    setLoadingTx(true);
    const { data, error } = await supabase
      .from('v_all_transactions')
      .select('*')
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching account transactions:', error);
    } else if (data) {
      setAccountTransactions(data as AllTransaction[]);
    }
    setLoadingTx(false);
  };

  useEffect(() => {
    const processTransactions = async () => {
      setLoading(true);
      const { error } = await supabase.rpc('fn_process_recurring_transactions');
      if (error) {
        console.error("Error processing recurring transactions:", error.message);
      }
      setRefreshKey(key => key + 1); 
    };
    
    processTransactions();
  }, [filter]);
  
  useEffect(() => {
    if (refreshKey > 0) {
      fetchPageData();
    }
  }, [refreshKey]);

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountTransactions(selectedAccount.account_id);
      fetchAccountBalanceTrend(selectedAccount.account_id, selectedAccount.type);
    } else {
      setAccountTransactions([]);
      setBalanceTrend([]);
    }
  }, [selectedAccount]);

  const handleAccountSelected = (account: Account) => {
    if (selectedAccount?.account_id === account.account_id) {
      setSelectedAccount(null);
    } else {
      setSelectedAccount(account);
    }
  };

  const trendColor =
    selectedAccount?.type === 'credit' ? COLOR_EXPENSE : COLOR_TRANSFER;

  const processedChartData = groupData(balanceTrend, groupBy);

  if (loading && refreshKey === 0) {
     return <div>Loading account data...</div>;
  }

  return (
    <div>
      {/* --- NEW: Navigation Back to Hub --- */}
      <BackToHub to="/control" label="Back to Cash Flow Command" />

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
            onDataUpdated={() => setRefreshKey(key => key + 1)}
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
                    label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
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