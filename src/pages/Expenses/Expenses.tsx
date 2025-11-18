/* Replace file: src/pages/Expenses/Expenses.tsx */

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
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_EXPENSE,
} from '../../lib/chartColors';

// --- Type Definitions ---
type KpiData = {
  totalExpense: number;
  transactionCount: number;
  averageExpense: number;
  // --- NEW: Add new KPI fields ---
  topCategory: string;
  avgMonthlyExpense: number;
};
type ChartData = { name: string; expense: number; _rawExpense: number };
type PieData = { name: string; value: number };
type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string };
type Category = {
  category_id: string;
  category: string;
  subcategory: string | null;
};

// --- TIMEZONE BUG FIX: Add helper function ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END FIX ---

function ExpensesPage() {
  // --- Modal State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  // --- Filter State ---
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // --- Filter Data State ---
  const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);

  // --- Page Data State ---
  const [kpiData, setKpiData] = useState<KpiData>({
    totalExpense: 0,
    transactionCount: 0,
    averageExpense: 0,
    // --- NEW: Init new KPI fields ---
    topCategory: 'N/A',
    avgMonthlyExpense: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<Transaction[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // --- Data Fetching ---
  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_id, account_name');
      if (accounts) setFilterAccounts(accounts);

      const { data: categories } = await supabase
        .from('categories')
        .select('category_id, category, subcategory')
        .eq('type', 'Expense');
      if (categories) setFilterCategories(categories);
    };
    fetchFilterData();
  }, []);

  const fetchData = async () => {
    setLoading(true); // <-- Start loading
    setError('');

    let query = supabase
      .from('v_expenses')
      .select('*')
      .order('date', { ascending: false });
    
    // --- TIMEZONE BUG FIX: Use YYYY-MM-DD strings ---
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
    // --- END TIMEZONE FIX ---

    if (accountFilter !== 'all') {
      query = query.eq('account_id', accountFilter);
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      setError(error.message);
    } else if (data) {
      const typedData = data as Transaction[];

      const totalExpense = typedData.reduce((sum, tx) => sum + tx.amount, 0);
      const transactionCount = typedData.length;
      const averageExpense =
        transactionCount > 0 ? totalExpense / transactionCount : 0;
      
      // --- NEW KPI CARD LOGIC ---
      let topCategory = 'N/A';
      if (typedData.length > 0) {
        const categoryTotals: { [key: string]: number } = {};
        typedData.forEach((tx) => {
          const catName = tx.category || 'Uncategorized';
          categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(tx.amount);
        });
        topCategory = Object.entries(categoryTotals).reduce(
          (top, [name, amount]) => (amount > top.amount ? { name, amount } : top),
          { name: 'N/A', amount: 0 }
        ).name;
      }
      
      let avgMonthlyExpense = 0;
      if (typedData.length > 0) {
        const monthlyTotals: { [key: string]: number } = {};
        typedData.forEach((tx) => {
          const monthYear = tx.date.substring(0, 7); 
          monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + tx.amount;
        });
        const numMonths = Object.keys(monthlyTotals).length;
        if (numMonths > 0) {
          avgMonthlyExpense = totalExpense / numMonths; 
        }
      }
      // --- END NEW KPI LOGIC ---

      setKpiData({ 
        totalExpense, 
        transactionCount, 
        averageExpense,
        topCategory, 
        avgMonthlyExpense
      });

      setRecentExpenses(typedData.slice(0, 10));

      const monthlyExpense: { [key: string]: number } = {};
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      typedData.forEach((tx) => {
        const monthIndex = parseInt(tx.date.split('-')[1], 10) - 1;
        const monthName = monthNames[monthIndex];
        monthlyExpense[monthName] =
          (monthlyExpense[monthName] || 0) + tx.amount;
      });
      const processedBarData = monthNames
        .map((month) => ({
          name: month,
          expense: Math.abs(monthlyExpense[month] || 0), 
          _rawExpense: monthlyExpense[month] || 0
        }))
        .filter((d) => d.expense > 0);
      setBarChartData(processedBarData);

      const categoryExpense: { [key: string]: number } = {};
      typedData.forEach((tx) => {
        const catName = tx.category || 'Unknown';
        categoryExpense[catName] =
          (categoryExpense[catName] || 0) + Math.abs(tx.amount); 
      });
      const processedPieData = Object.keys(categoryExpense).map((name) => ({
        name: name,
        value: categoryExpense[name],
      }));
      setPieChartData(processedPieData);
    }
    setLoading(false);
  };

  // --- FIX: Reverted to the simple, original hook ---
  useEffect(() => {
    fetchData();
  }, [dateFilter, accountFilter, categoryFilter]);
  // --- END FIX ---

  // --- Event Handlers ---
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
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      fetchData(); // Just refetch data
    }
  };
  // --- End Event Handlers ---

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
        <h1 className={styles.title}>Expense Overview</h1>

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
        {/* --- SECTION 1: KPI Cards (UPDATED) --- */}
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles.red}`}>
            <h3 className={styles.kpiTitle}>Total Expense (Filtered)</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.totalExpense)}
            </p>
          </div>
          {/* --- KPI CARD 2: CHANGED --- */}
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>Top Category</h3>
            <p className={styles.kpiValue} style={{ fontSize: '1.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {kpiData.topCategory}
            </p>
          </div>
          {/* --- KPI CARD 3: CHANGED --- */}
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}>Average Monthly Expense</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.avgMonthlyExpense)}
            </p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.tableSection}`}>
          <div className={styles.listHeader}>
            <h2
              className={styles.cardTitle}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              Recent Expenses (Filtered)
            </h2>
            <button className={styles.addButton} onClick={handleOpenAddModal}>
              <HiPlus /> Add Expense
            </button>
          </div>

          <RecentTransactions
            transactions={recentExpenses}
            type="Expense"
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            allLinkPath="/expenses/all"
          />
        </div>

        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Expense by Month</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" fontSize="0.7rem" />
                  <YAxis
                    fontSize="0.7rem"
                    tickFormatter={(val) => formatCurrency(val)}
                  />
                  {/* --- WARNING FIX: Replace unused 'value' and 'name' with '_' --- */}
                  <Tooltip
                    formatter={(_value: number, _name: string, props: any) => 
                      formatCurrency(props.payload._rawExpense)
                    }
                  />
                  {/* --- END FIX --- */}
                  <Bar dataKey="expense" fill={COLOR_EXPENSE} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Expense by Category (Filtered)</h2>
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
                    nameKey="name" // Added for safety
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                  >
                    {/* --- UPDATED: Use new centralized palette --- */}
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
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={fetchData} // FIX: Reverted to simple fetchData
        transactionType="Expense"
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

export default ExpensesPage;