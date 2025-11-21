/* Replace file: src/pages/Subscriptions/SubscriptionsPage.tsx */

import { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css'; // Master styles
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '../../components/Modal/Modal';
import { type Account } from '../../components/Accounts/AddAccountForm';
import AddAccountForm from '../../components/Accounts/AddAccountForm';
import AddCategoryForm from '../../components/Categories/AddCategoryForm';
// NEW: Import BackToHub
import BackToHub from '../../components/Navigation/BackToHub'; 
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_EXPENSE,
  COLOR_INCOME,
} from '../../lib/chartColors';

// --- Type Definitions ---
type Category = { category_id: string; type: 'Income' | 'Expense'; category: string; subcategory: string | null; };
type TransactionType = 'Income' | 'Expense';
type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
// --- FIX: Add nw_type ---
type NeedWantType = 'Need' | 'Want' | null;

type RecurringTransaction = {
  recurring_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  account_id: string;
  category_id: string;
  frequency_type: FrequencyType;
  interval: number;
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  last_processed_date: string | null;
  nw_type: NeedWantType; // <-- NEW
  account_name?: string;
  category_name?: string;
  next_due_date: string;
  accounts?: { account_name: string };
  categories?: { category: string };
};
// --- END FIX ---

type FormData = Omit<
  RecurringTransaction,
  | 'recurring_id'
  | 'account_name'
  | 'category_name'
  | 'next_due_date'
  | 'amount'
  | 'accounts'
  | 'categories'
> & {
  main_category: string;
  amount: number | '';
};

// --- DATE BUG FIX: Add helper function ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END FIX ---

const defaultRecurring: FormData = {
  description: '',
  amount: '',
  type: 'Expense',
  account_id: '',
  category_id: '',
  main_category: '',
  frequency_type: 'monthly',
  interval: 1,
  day_of_week: null,
  day_of_month: 1,
  start_date: getLocalYyyyMmDd(), // <-- FIX: Use local date
  end_date: null,
  last_processed_date: null,
  nw_type: 'Need', // <-- NEW: Default to 'Need'
};

type KpiData = {
  monthlyTotal: number;
  yearlyTotal: number;
  count: number;
};
type PieData = { name: string; value: number };
type BarData = { name: string; amount: number };

// --- Helper Functions (Definidas una sola vez) ---
const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const formatFrequency = (tx: RecurringTransaction) => {
  const { frequency_type, interval, day_of_week, day_of_month } = tx;
  const s = interval > 1 ? 's' : '';

  switch (frequency_type) {
    case 'daily':
      return `Every ${interval} day${s}`;
    case 'weekly':
      const weekdays = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
      ];
      const dow = day_of_week === null ? 0 : day_of_week;
      return `Every ${interval} week${s} on ${weekdays[dow]}`;
    case 'monthly':
      const day = day_of_month === null ? 1 : day_of_month;
      return `Every ${interval} month${s} on the ${day}${getOrdinal(day)}`;
    case 'yearly':
      return `Every ${interval} year${s} on ${new Date(
        tx.start_date + 'T12:00:00'
      ).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    default:
      return 'N/A';
  }
};
// --- Fin Helper Functions ---

function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>([]);

  // --- State de Modales ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultRecurring);
  
  // --- NEW: State for hard delete ---
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // Dropdown Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // --- State del Dashboard ---
  const [kpiData, setKpiData] = useState<KpiData>({
    monthlyTotal: 0,
    yearlyTotal: 0,
    count: 0,
  });
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);
  const [barChartData, setBarChartData] = useState<BarData[]>([]);

  // --- Listas filtradas para los dropdowns ---
  const mainCategories = [
    ...new Set(
      categories.filter((c) => c.type === formData.type).map((c) => c.category)
    ),
  ];
  const subCategories = categories.filter(
    (c) => c.category === formData.main_category && c.subcategory
  );

  // --- Data Fetching ---
  async function fetchRecurringTransactions() {
    setLoading(true);
    
    // RLS/Data leak fix
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to see subscriptions.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('v_recurring_transactions')
      .select(
        `
          *,
          accounts ( account_name ),
          categories ( category )
        `
      )
      .eq('user_id', user.id) // RLS Fix
      .order('start_date', { ascending: true });

    if (error) {
      setError(error.message);
      console.error('Error fetching recurring transactions:', error);
    } else if (data) {
      const formattedData = data.map((tx: any) => ({
        ...tx,
        account_name: tx.accounts ? tx.accounts.account_name : 'Unknown',
        category_name: tx.categories ? tx.categories.category : 'Unknown',
      }));
      setRecurringTxs(formattedData);
      processDashboardData(formattedData);
    }
    setLoading(false);
  }

  async function fetchDropdownData() {
    const { data: accData, error: accError } = await supabase
      .from('accounts')
      .select('*');
    if (accData) setAccounts(accData);
    if (accError) console.error('Error fetching accounts:', accError.message);

    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*');
    if (catData) setCategories(catData as Category[]);
    if (catError)
      console.error('Error fetching categories:', catError.message);
  }

  useEffect(() => {
    // --- RECURRING TRANSACTIONS TRIGGER ---
    const processAndFetch = async () => {
      // Call the new SQL function to back-fill transactions
      const { error } = await supabase.rpc('fn_process_recurring_transactions');
      if (error) {
        console.error("Error processing recurring transactions:", error.message);
      }
      // After processing, fetch all other data
      fetchRecurringTransactions();
    };
    
    processAndFetch();
    fetchDropdownData();
  }, []); // Run only once on page load

  // --- Procesador de Datos del Dashboard (Original Logic) ---
  function processDashboardData(data: RecurringTransaction[]) {
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    const count = data.length;
    const categoryMap = new Map<string, number>();
    const accountMap = new Map<string, number>();

    data.forEach((tx) => {
      let txYearlyAmount = 0;
      if (tx.type === 'Expense') {
        switch (tx.frequency_type) {
          case 'monthly':
            txYearlyAmount = tx.amount * 12;
            monthlyTotal += tx.amount;
            break;
          case 'yearly':
            txYearlyAmount = tx.amount;
            break;
          case 'weekly':
            txYearlyAmount = tx.amount * 52;
            break;
          case 'daily':
            txYearlyAmount = tx.amount * 365;
            break;
        }
        yearlyTotal += txYearlyAmount;

        const catName = tx.category_name || 'Uncategorized';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + txYearlyAmount);

        const accName = tx.account_name || 'Unknown Account';
        accountMap.set(accName, (accountMap.get(accName) || 0) + txYearlyAmount);
      }
    });

    setKpiData({ monthlyTotal, yearlyTotal, count });
    setPieChartData(Array.from(categoryMap, ([name, value]) => ({ name, value })));
    setBarChartData(Array.from(accountMap, ([name, amount]) => ({ name, amount })));
  }

  // --- Form Handling (omitted for brevity) ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev };

      switch (name) {
        case 'description':
          updated.description = value;
          break;
        case 'amount':
          if (value === '') {
            updated.amount = '';
          } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              updated.amount = numValue;
            }
          }
          break;
        case 'type':
          updated.type = value as TransactionType;
          // --- FIX: Set nw_type based on type ---
          updated.nw_type = (value === 'Expense') ? 'Need' : null;
          updated.main_category = '';
          updated.category_id = '';
          break;
        case 'account_id':
          updated.account_id = value;
          break;
        case 'main_category':
          updated.main_category = value;
          updated.category_id = '';
          break;
        case 'category_id':
          updated.category_id = value;
          break;
        case 'frequency_type':
          updated.frequency_type = value as FrequencyType;
          updated.day_of_week = null;
          updated.day_of_month = null;
          if (value === 'weekly') updated.day_of_week = 0;
          if (value === 'monthly') updated.day_of_month = 1;
          break;
        case 'interval':
          updated.interval = value ? parseInt(value, 10) : 1;
          break;
        case 'day_of_week':
        case 'day_of_month':
          updated[name] = value ? parseInt(value, 10) : null;
          break;
        case 'start_date':
          updated.start_date = value;
          break;
        case 'end_date':
          updated.end_date = value ? value : null;
          break;
        // --- FIX: Handle nw_type change ---
        case 'nw_type':
          updated.nw_type = (value as NeedWantType) || null;
          break;
      }
      return updated;
    });
  };

  // --- CRUD Operations (omitted for brevity) ---
  const handleOpenAddModal = () => {
    setFormData(defaultRecurring);
    setSelectedTx(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: RecurringTransaction) => {
    const fullCategory = categories.find(
      (c: Category) => c.category_id === tx.category_id
    );

    const {
      next_due_date,
      account_name,
      category_name,
      accounts,
      categories: categoriesToRemove,
      ...editableTxData
    } = tx;

    setFormData({
      ...editableTxData,
      main_category: fullCategory ? fullCategory.category : '',
    });
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Use main loading state for form submit

    const { main_category, ...data } = formData;
    const submissionData = {
      ...data,
      amount: parseFloat(String(data.amount)) || 0,
      // --- FIX: Ensure nw_type is null for Income ---
      nw_type: data.type === 'Income' ? null : data.nw_type
    };

    if (submissionData.amount <= 0) {
      setError('Amount must be greater than 0.');
      setLoading(false);
      return;
    }
    // --- FIX: Ensure Need/Want is set for Expenses ---
    if (submissionData.type === 'Expense' && !submissionData.nw_type) {
      setError('Please classify this expense as a "Need" or "Want".');
      setLoading(false);
      return;
    }
    setError('');
    
    if (!submissionData.category_id && main_category) {
      const mainCat = categories.find(
        (c) => c.category === main_category && c.subcategory === null
      );
      if (mainCat) {
        submissionData.category_id = mainCat.category_id;
      } else {
        const firstSub = categories.find((c) => c.category === main_category);
        if (firstSub) {
          submissionData.category_id = firstSub.category_id;
        } else {
          setError('Please select a valid category.');
          setLoading(false);
          return;
        }
      }
    }

    let query;
    if (selectedTx) {
      query = supabase
        .from('recurring_transactions')
        .update(submissionData)
        .eq('recurring_id', selectedTx.recurring_id);
    } else {
      query = supabase.from('recurring_transactions').insert(submissionData);
    }

    const { error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setIsModalOpen(false);
      fetchRecurringTransactions(); // Re-fetch the list
    }
    setLoading(false);
  };

  const handleOpenDeleteModal = (tx: RecurringTransaction) => {
    setSelectedTx(tx);
    setIsDeleteModalOpen(true);
    setError(''); // Clear any previous errors
  };

  // --- UPDATED: This is now the "SOFT DELETE" (Cancel Subscription) ---
  const handleDelete = async () => {
    if (!selectedTx) return;
    setLoading(true); // Use the original loading state

    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('recurring_id', selectedTx.recurring_id);

    if (error) {
      setError(error.message);
    } else {
      setIsDeleteModalOpen(false);
      setSelectedTx(null);
      fetchRecurringTransactions();
    }
    setLoading(false); // Make sure to set this back
  };
  
  // --- NEW FUNCTION: The "HARD DELETE" (Erase History) ---
  const handleHardDelete = async () => {
    if (!selectedTx) return;
    setIsHardDeleting(true); // Use the new loading state
    setError('');

    const { error } = await supabase.rpc('fn_delete_recurring_and_children', {
      p_recurring_id: selectedTx.recurring_id
    });

    if (error) {
      setError(error.message);
    } else {
      setIsDeleteModalOpen(false);
      setSelectedTx(null);
      fetchRecurringTransactions();
    }
    setIsHardDeleting(false);
  };


  // --- Funciones de Cierre de Modal Anidado ---
  const handleAccountAdded = () => {
    setIsAccountModalOpen(false);
    fetchDropdownData();
  };

  const handleCategoryAdded = () => {
    setIsCategoryModalOpen(false);
    fetchDropdownData();
  };

  return (
    <div>
      {/* 1. BACK TO HUB NAVIGATION */}
      <BackToHub to="/build" label="Back to Fortress Dashboard" />
      
      <div className={`${styles.listHeader} no-print`}>
        <h1 className={styles.title}>Subscriptions & Recurring</h1>
        <button className={styles.addButton} onClick={handleOpenAddModal}>
          <FaPlus style={{ marginRight: '0.5rem' }} /> Add Recurring
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {/* --- Mini-Dashboard de KPIs --- */}
      {/* NOTE: We assume kpiSection is a 4-column grid for this page */}
      <div className={`${styles.kpiSection} no-print`}>
        
        {/* KPI 1: Monthly Cost */}
        <div className={`${styles.kpiCard} ${styles.red}`}>
          <h3 className={styles.kpiTitle}>Total Monthly Cost</h3>
          <p className={styles.kpiValue}>
            {formatCurrency(kpiData.monthlyTotal * -1)}
          </p>
        </div>
        
        {/* KPI 2: Total Count */}
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Total Subscriptions</h3>
          <p className={styles.kpiValue}>{kpiData.count}</p>
        </div>
        
        {/* KPI 3: Estimated Yearly Cost (Original 3rd KPI) */}
        <div className={`${styles.kpiCard} ${styles.blue}`}>
          <h3 className={styles.kpiTitle}>Estimated Yearly Cost</h3>
          <p className={styles.kpiValue}>
            {formatCurrency(kpiData.yearlyTotal * -1)}
          </p>
        </div>
        
        {/* KPI 4: Average Cost per Item (The new logical KPI) */}
        <div className={`${styles.kpiCard} ${styles.gray}`}>
          <h3 className={styles.kpiTitle}>Avg. Cost per Item</h3>
          <p className={styles.kpiValue}>
            {formatCurrency(kpiData.monthlyTotal / (kpiData.count || 1))}
          </p>
        </div>
      </div>

      {/* --- Mini-Dashboard de Gráficos --- */}
      <div
        className={`${styles.analyticsSection} no-print`}
        style={{ marginTop: '2rem' }}
      >
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Yearly Cost by Category</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
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
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Yearly Cost by Account</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  fontSize="0.7rem"
                  tickFormatter={(val) => formatCurrency(val)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  fontSize="0.7rem"
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="amount" fill={COLOR_EXPENSE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- Tabla de Suscripciones --- */}
      <div
        className={`${styles.card} ${styles.tableSection}`}
        style={{ marginTop: '2rem' }}
      >
        <h2 className={styles.cardTitle}>Recurring Transactions List</h2>
        {loading ? (
          <p>Loading subscriptions...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {/* --- FIX: Added N/W Column --- */}
                <th style={{ width: '50px' }}>N/W</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Account</th>
                <th>Frequency</th>
                <th>Next Due</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recurringTxs.length === 0 && (
                <tr>
                  <td
                    colSpan={8} 
                    style={{ textAlign: 'center', padding: '1rem' }}
                  >
                    No recurring transactions found. Add one to get started!
                  </td>
                </tr>
              )}
              {recurringTxs.map((tx) => {
                return (
                  <tr key={tx.recurring_id}>
                    {/* --- FIX: Added N/W Cell --- */}
                    <td style={{ textAlign: 'center' }}>
                      {tx.nw_type === 'Need' && <span className={`${styles.tag} ${styles.tagNeed}`}>N</span>}
                      {tx.nw_type === 'Want' && <span className={`${styles.tag} ${styles.tagWant}`}>W</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.description}</td>
                    <td
                      style={{
                        // --- UPDATED: Use central colors ---
                        color: tx.type === 'Expense' ? COLOR_EXPENSE : COLOR_INCOME,
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(
                        tx.type === 'Expense' ? -tx.amount : tx.amount
                      )}
                    </td>
                    <td>{tx.category_name}</td>
                    <td>{tx.account_name}</td>
                    <td>{formatFrequency(tx)}</td>
                    <td>
                      {new Date(
                        tx.next_due_date + 'T12:00:00'
                      ).toLocaleDateString()}
                    </td>
                    <td className="no-print">
                      <button
                        className={styles.iconButton}
                        onClick={() => handleOpenEditModal(tx)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className={styles.iconButtonDanger}
                        onClick={() => handleOpenDeleteModal(tx)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL DE AÑADIR/EDITAR (omitted for brevity) --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedTx ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'
        }
      >
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.label}>Description</label>
            <input
              type="text"
              name="description"
              className={styles.input}
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Type</label>
            <select
              name="type"
              className={styles.input}
              value={formData.type}
              onChange={handleInputChange}
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>
          
          {/* --- FIX: Conditionally show N/W selector --- */}
          {formData.type === 'Expense' && (
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor="nw_type">
                Expense Type
              </label>
              <select
                id="nw_type"
                name="nw_type"
                className={styles.input}
                value={formData.nw_type || ''}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>Select Need or Want</option>
                <option value="Need">Need</option>
                <option value="Want">Want</option>
              </select>
            </div>
          )}
          
          <div className={styles.formRow}>
            <label className={styles.label}>Amount</label>
            <input
              type="number"
              name="amount"
              className={styles.input}
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Account</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                name="account_id"
                className={styles.input}
                value={formData.account_id}
                onChange={handleInputChange}
                required
                style={{ flexGrow: 1 }}
              >
                <option value="" disabled>
                  Select an account
                </option>
                {accounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.addButton}
                style={{ padding: '0 0.75rem' }}
                onClick={() => setIsAccountModalOpen(true)}
              >
                <FaPlus />
              </button>
            </div>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Category</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                name="main_category"
                className={styles.input}
                value={formData.main_category}
                onChange={handleInputChange}
                required
                style={{ flexGrow: 1 }}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {mainCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.addButton}
                style={{ padding: '0 0.75rem' }}
                onClick={() => setIsCategoryModalOpen(true)}
              >
                <FaPlus />
              </button>
            </div>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Subcategory</label>
            <select
              name="category_id"
              className={styles.input}
              value={formData.category_id}
              onChange={handleInputChange}
              disabled={subCategories.length === 0}
            >
              <option value="">(None)</option>
              {subCategories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.subcategory}
                </option>
              ))}
            </select>
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #e5e7eb',
              margin: '1rem 0',
            }}
          />

          <div className={styles.formRow}>
            <label className={styles.label}>Frequency</label>
            <select
              name="frequency_type"
              className={styles.input}
              value={formData.frequency_type}
              onChange={handleInputChange}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {formData.frequency_type !== 'yearly' && (
            <div className={styles.formRow}>
              <label className={styles.label}>Every</label>
              <input
                type="number"
                name="interval"
                className={styles.input}
                value={formData.interval}
                onChange={handleInputChange}
                min="1"
              />
            </div>
          )}
          {formData.frequency_type === 'weekly' && (
            <div className={styles.formRow}>
              <label className={styles.label}>Day of Week</label>
              <select
                name="day_of_week"
                className={styles.input}
                value={formData.day_of_week ?? 0}
                onChange={handleInputChange}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          )}
          {formData.frequency_type === 'monthly' && (
            <div className={styles.formRow}>
              <label className={styles.label}>Day of Month</label>
              <input
                type="number"
                name="day_of_month"
                className={styles.input}
                value={formData.day_of_month ?? 1}
                onChange={handleInputChange}
                min="1"
                max="31"
              />
            </div>
          )}
          <div className={styles.formRow}>
            <label className={styles.label}>Start Date</label>
            <input
              type="date"
              name="start_date"
              className={styles.input}
              value={formData.start_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Saving...' : (selectedTx ? 'Save Changes' : 'Add Transaction')}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL DE ELIMINAR --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this recurring transaction?
            <br />
            <strong>
              {selectedTx?.description} ({formatCurrency(selectedTx?.amount || 0)})
            </strong>
          </p>
          
          {/* NEW: Explanation for the user */}
          <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'left', margin: '1rem 0' }}>
            <strong>Cancel Subscription:</strong> Stops future bills but keeps your past transaction history.
            <br />
            <strong>Erase History:</strong> Deletes this subscription AND all past transactions it created.
          </p>
          
          {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

          <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
            {/* Button 1: "Cancel Subscription" (Soft Delete) */}
            <button
              className={styles.cancelButton} // Re-using cancel button style
              onClick={handleDelete} // Calls the original "soft delete"
              disabled={loading || isHardDeleting}
            >
              {loading ? 'Cancelling...' : 'Cancel Subscription'}
            </button>

            {/* Button 2: "Erase History" (Hard Delete) */}
            <button
              className={styles.deleteButton} // The red "danger" button
              onClick={handleHardDelete} // Calls the new "hard delete"
              disabled={loading || isHardDeleting}
            >
              {isHardDeleting ? 'Erasing...' : 'Erase History'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL ANIDADO DE AÑADIR CUENTA (ARREGLADO) --- */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={handleAccountAdded}
        title="Add New Account"
      >
        <AddAccountForm
          accountToEdit={null}
          onSave={handleAccountAdded}
          onCancel={() => setIsAccountModalOpen(false)}
        />
      </Modal>

      {/* --- MODAL ANIDADO DE AÑADIR CATEGORÍA (ARREGLADO) --- */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={handleCategoryAdded}
        title="Add New Category"
      >
        <AddCategoryForm
          categoryToEdit={null}
          onSave={handleCategoryAdded}
          onCancel={() => setIsCategoryModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default SubscriptionsPage;