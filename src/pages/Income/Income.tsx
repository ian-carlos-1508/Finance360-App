/* Replace file: src/pages/Income/Income.tsx */

import { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { HiPlus, HiExclamationTriangle } from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import RecentTransactions, {
  type Transaction,
} from '../../components/Transactions/RecentTransactions';
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
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import {
  CHART_COLORS,
  COLOR_INCOME,
} from '../../lib/chartColors';
// --- NEW: Import Navigation ---
import BackToHub from '../../components/Navigation/BackToHub';

// --- Type Definitions ---
type KpiData = {
  totalIncome: number;
  transactionCount: number;
  averageIncome: number;
  topCategory: string;
  avgMonthlyIncome: number;
};
type ChartData = { name: string; income: number };
type PieData = { name: string; value: number };
type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string };
type Category = {
  category_id: string;
  category: string;
  subcategory: string | null;
};

const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function IncomePage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);

  const [kpiData, setKpiData] = useState<KpiData>({
    totalIncome: 0,
    transactionCount: 0,
    averageIncome: 0,
    topCategory: 'N/A',
    avgMonthlyIncome: 0,
  });
  const [recentIncome, setRecentIncome] = useState<Transaction[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_id, account_name');
      if (accounts) setFilterAccounts(accounts);

      const { data: categories } = await supabase
        .from('categories')
        .select('category_id, category, subcategory')
        .eq('type', 'Income');
      if (categories) setFilterCategories(categories);
    };
    fetchFilterData();
  }, []);

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
  }, [dateFilter, accountFilter, categoryFilter]);

  const fetchData = async () => {
    setError('');

    let query = supabase
      .from('v_income') 
      .select('*')
      .order('date', { ascending: false });

    if (dateFilter === 'month') {
      const today = new Date();
      const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      query = query.gte('date', getLocalYyyyMmDd(firstDay));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );
      query = query.gte('date', getLocalYyyyMmDd(thirtyDaysAgo));
    }

    if (accountFilter !== 'all') {
      query = query.eq('account_id', accountFilter);
    }

    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching income:', error);
      setError(error.message);
    } else if (data) {
      const typedData = data as Transaction[];

      const totalIncome = typedData.reduce((sum, tx) => sum + tx.amount, 0);
      const transactionCount = typedData.length;
      const averageIncome =
        transactionCount > 0 ? totalIncome / transactionCount : 0;
      
      let topCategory = 'N/A';
      if (typedData.length > 0) {
        const categoryTotals: { [key: string]: number } = {};
        typedData.forEach((tx) => {
          const catName = tx.category || 'Uncategorized';
          categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
        });
        topCategory = Object.entries(categoryTotals).reduce(
          (top, [name, amount]) => (amount > top.amount ? { name, amount } : top),
          { name: 'N/A', amount: 0 }
        ).name;
      }
      
      let avgMonthlyIncome = 0;
      if (typedData.length > 0) {
        const monthlyTotals: { [key: string]: number } = {};
        typedData.forEach((tx) => {
          const monthYear = tx.date.substring(0, 7); 
          monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + tx.amount;
        });
        const numMonths = Object.keys(monthlyTotals).length;
        if (numMonths > 0) {
          avgMonthlyIncome = totalIncome / numMonths;
        }
      }

      setKpiData({ 
        totalIncome, 
        transactionCount, 
        averageIncome,
        topCategory,
        avgMonthlyIncome 
      });

      setRecentIncome(typedData.slice(0, 10));

      const monthlyIncome: { [key: string]: number } = {};
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      typedData.forEach((tx) => {
        const monthIndex = parseInt(tx.date.split('-')[1], 10) - 1;
        const monthName = monthNames[monthIndex];
        monthlyIncome[monthName] =
          (monthlyIncome[monthName] || 0) + tx.amount;
      });
      const processedBarData = monthNames
        .map((month) => ({ name: month, income: monthlyIncome[month] || 0 }))
        .filter((d) => d.income > 0);
      setBarChartData(processedBarData);

      const accountIncome: { [key: string]: number } = {};
      typedData.forEach((tx) => {
        const accName = tx.from_account_name || 'Unknown';
        accountIncome[accName] = (accountIncome[accName] || 0) + tx.amount;
      });
      const processedPieData = Object.keys(accountIncome).map((name) => ({
        name: name,
        value: accountIncome[name],
      }));
      setPieChartData(processedPieData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]);

  const handleOpenAddModal = () => {
    setTransactionToEdit(null);
    setIsAddModalOpen(true);
  };
  const handleOpenEditModal = (tx: Transaction) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (tx: Transaction) => {
    setTransactionToDelete(tx);
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    setLoading(true);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .match({ transaction_id: transactionToDelete.transaction_id });
    if (error) setError(error.message);
    else {
      fetchData(); 
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
    setLoading(false);
  };

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
        <h1 className={styles.title}>Income Overview</h1>

        <div className={styles.filterWrapper}>
          <label className={styles.label} htmlFor="category-filter">
            Category:
          </label>
          <select
            id="category-filter"
            className={styles.input}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {filterCategories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category}
                {cat.subcategory ? ` / ${cat.subcategory}` : ''}
              </option>
            ))}
          </select>

          <label className={styles.label} htmlFor="account-filter">
            Account:
          </label>
          <select
            id="account-filter"
            className={styles.input}
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {filterAccounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name}
              </option>
            ))}
          </select>

          <label className={styles.label} htmlFor="date-filter">
            Show:
          </label>
          <select
            id="date-filter"
            className={styles.input}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className={styles.pageGrid}>
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles.green}`}>
            <h3 className={styles.kpiTitle}>Total Income (Filtered)</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.totalIncome)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>Top Category</h3>
            <p className={styles.kpiValue} style={{ fontSize: '1.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {kpiData.topCategory}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>Average Monthly Income</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.avgMonthlyIncome)}
            </p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.tableSection}`}>
          <div className={styles.listHeader}>
            <h2
              className={styles.cardTitle}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              Recent Income (Filtered)
            </h2>
            <button className={styles.addButton} onClick={handleOpenAddModal}>
              <HiPlus /> Add Income
            </button>
          </div>

          <RecentTransactions
            transactions={recentIncome}
            type="Income"
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            allLinkPath="/income/all"
          />
        </div>

        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Income by Month</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" fontSize="0.7rem" />
                  <YAxis
                    fontSize="0.7rem"
                    tickFormatter={(val) => formatCurrency(val)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="income" fill={COLOR_INCOME} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Income by Account (Filtered)</h2>
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
                    nameKey="name"
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={fetchData}
        transactionType="Income"
        transactionToEdit={transactionToEdit}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this transaction?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{transactionToDelete?.description || 'Transaction'}</strong>
          </p>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default IncomePage;