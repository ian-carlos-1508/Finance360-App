/* Replace file: src/pages/Budgets/BudgetsPage.tsx */

import { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css';
import budgetStyles from './Budgets.module.css';
import { supabase } from '../../lib/supabaseClient';
import {
  HiPlus,
  HiExclamationTriangle,
  HiPencil,
  HiTrash,
} from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddBudgetModal from '../../components/Budgets/AddBudgetModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_INCOME,
  COLOR_EXPENSE,
  COLOR_TRANSFER,
} from '../../lib/chartColors';

// --- Type Definitions ---
type Budget = {
  budget_id: string;
  month: number;
  year: number;
  budgeted_amount: number;
  actual_amount: number;
  category_name: string;
  category_id: string | null;
  main_category: string | null;
  allow_rollover: boolean;
  rollover_amount: number;
};

type KpiData = {
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
};

type DateFilter = {
  month: number;
  year: number;
};

type PieData = {
  name: string;
  value: number;
};

// --- REMOVED old PIE_COLORS constants ---

// --- FIX: Moved this constant OUTSIDE the component function ---
const PIE_COLORS_SINGLE_SEMANTIC = [
  COLOR_TRANSFER, // Spent (using the 'Transfer' blue)
  COLOR_INCOME, // Remaining (using the 'Income' green/teal)
  COLOR_EXPENSE, // Overspent (using the 'Expense' red)
];
// --- END FIX ---

function BudgetsPage() {
  // --- State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [pieFilter, setPieFilter] = useState<string>('all');
  const [kpiData, setKpiData] = useState<KpiData>({
    totalBudgeted: 0,
    totalSpent: 0,
    remaining: 0,
  });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<PieData[]>([]);
  const [pieChartColors, setPieChartColors] = useState<string[]>(CHART_COLORS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2024, 2025, 2026];

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase.rpc('fn_get_budgets_with_rollover', {
      p_month: dateFilter.month,
      p_year: dateFilter.year,
    });

    if (error) {
      console.error('Error fetching budgets:', error);
      setError(error.message);
    } else if (data) {
      const typedData = data as Budget[];
      setBudgets(typedData);

      const totalBudgeted = typedData.reduce(
        (sum, b) => sum + b.budgeted_amount,
        0
      );
      const totalSpent = typedData.reduce(
        (sum, b) => sum + b.actual_amount,
        0
      );
      const totalRemaining = typedData.reduce((sum, b) => {
        const adjustedBudget = b.budgeted_amount + b.rollover_amount;
        return sum + (adjustedBudget - b.actual_amount);
      }, 0);

      setKpiData({
        totalBudgeted,
        totalSpent,
        remaining: totalRemaining,
      });

      const processedBarData = typedData.map((b) => ({
        name: b.category_name,
        Budgeted: b.budgeted_amount,
        Spent: b.actual_amount,
        Rollover: b.rollover_amount,
      }));
      setBarChartData(processedBarData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  // --- UPDATED: This effect now uses the new color constants ---
  useEffect(() => {
    if (pieFilter === 'all') {
      const processedPieData = budgets.map((b) => ({
        name: b.category_name,
        value: b.budgeted_amount,
      }));
      setPieChartData(processedPieData);
      setPieChartColors(CHART_COLORS); // <-- Use main pastel palette
    } else {
      const selectedBudget = budgets.find((b) => b.budget_id === pieFilter);
      if (selectedBudget) {
        const adjustedBudget =
          selectedBudget.budgeted_amount + selectedBudget.rollover_amount;
        const spent = selectedBudget.actual_amount;
        const remaining = Math.max(0, adjustedBudget - spent);
        const overspent = Math.max(0, spent - adjustedBudget);

        const singleBudgetData = [
          { name: 'Spent', value: Math.min(spent, adjustedBudget) },
          { name: 'Remaining', value: remaining },
        ];
        if (overspent > 0) {
          singleBudgetData.push({ name: 'Overspent', value: overspent });
        }

        setPieChartData(singleBudgetData);
        setPieChartColors(PIE_COLORS_SINGLE_SEMANTIC); // <-- Use new semantic palette
      }
    }
  }, [pieFilter, budgets]); // <-- FIX: Removed the array from the dependency list

  // --- Event Handlers ---
  const handleOpenAddModal = () => {
    setBudgetToEdit(null);
    setIsAddModalOpen(true);
  };
  const handleOpenEditModal = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (budget: Budget) => {
    setBudgetToDelete(budget);
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;
    setLoading(true);
    const { error } = await supabase
      .from('budgets')
      .delete()
      .match({ budget_id: budgetToDelete.budget_id });

    if (error) setError(error.message);
    else {
      fetchData();
      setPieFilter('all');
      setIsDeleteModalOpen(false);
      setBudgetToDelete(null);
    }
    setLoading(false);
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
        <h1 className={styles.title}>Budgets</h1>

        <div className={styles.filterWrapper}>
          <label className={styles.label} htmlFor="month-filter">
            Month:
          </label>
          <select
            id="month-filter"
            className={styles.input}
            value={dateFilter.month}
            onChange={(e) => {
              setDateFilter((f) => ({ ...f, month: Number(e.target.value) }));
              setPieFilter('all');
            }}
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          <label className={styles.label} htmlFor="year-filter">
            Year:
          </label>
          <select
            id="year-filter"
            className={styles.input}
            value={dateFilter.year}
            onChange={(e) => {
              setDateFilter((f) => ({ ...f, year: Number(e.target.value) }));
              setPieFilter('all');
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.pageGrid}>
        {/* --- SECTION 1: KPI Cards --- */}
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles.blue}`}>
            <h3 className={styles.kpiTitle}>Total Budgeted</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.totalBudgeted)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.red}`}>
            <h3 className={styles.kpiTitle}>Total Spent</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.totalSpent * -1)}
            </p>
          </div>
          <div
            className={`${styles.kpiCard} ${
              kpiData.remaining >= 0 ? styles.green : styles.red
            }`}
          >
            <h3 className={styles.kpiTitle}>Amount Remaining</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.remaining)}
            </p>
          </div>
        </div>

        {/* --- SECTION 2: Budgets Management --- */}
        <div className={`${styles.card} ${styles.tableSection}`}>
          <div className={styles.listHeader}>
            <h2
              className={styles.cardTitle}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              Your Budgets for {monthNames[dateFilter.month - 1]}{' '}
              {dateFilter.year}
            </h2>
            <button className={styles.addButton} onClick={handleOpenAddModal}>
              <HiPlus /> Add Budget
            </button>
          </div>

          <ul className={budgetStyles.budgetList}>
            {budgets.length === 0 ? (
              <li
                style={{
                  textAlign: 'center',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  color: '#6b7280',
                }}
              >
                No budgets found for this month.
              </li>
            ) : (
              budgets.map((b) => {
                const adjustedBudget = b.budgeted_amount + b.rollover_amount;
                const remaining = adjustedBudget - b.actual_amount;
                const percent =
                  adjustedBudget > 0
                    ? (b.actual_amount / adjustedBudget) * 100
                    : 0;
                const isOver = remaining < 0;

                // NEW: Logic for progress bar color
                let progressBarClass = budgetStyles.progressBar; // Default blue
                if (isOver || percent > 90) {
                  progressBarClass = `${budgetStyles.progressBar} ${budgetStyles.atRisk}`; // Red
                } else if (percent > 70) {
                  progressBarClass = `${budgetStyles.progressBar} ${budgetStyles.warning}`; // Yellow
                }

                return (
                  <li key={b.budget_id} className={budgetStyles.budgetItem}>
                    <div className={budgetStyles.budgetName}>
                      <span>{b.category_name}</span>
                      {b.allow_rollover && b.rollover_amount !== 0 && (
                        <span
                          className={budgetStyles.rolloverText}
                          style={{
                            color:
                              b.rollover_amount > 0
                                ? COLOR_INCOME
                                : COLOR_EXPENSE,
                          }}
                        >
                          ({b.rollover_amount > 0 ? '+' : ''}
                          {formatCurrency(b.rollover_amount)} from last month)
                        </span>
                      )}
                      <span
                        className={budgetStyles.budgetAmount}
                        style={isOver ? { color: '#ef4444' } : {}}
                      >
                        <strong>{formatCurrency(remaining)}</strong> remaining
                      </span>
                    </div>
                    <div className={budgetStyles.progressBarContainer}>
                      <div
                        className={progressBarClass} // <-- USES NEW CSS
                        style={{
                          width: `${isOver ? 100 : Math.max(0, percent)}%`,
                        }}
                      ></div>
                    </div>
                    <div className={budgetStyles.budgetActions}>
                      <button
                        className={styles.iconButton}
                        onClick={() => handleOpenEditModal(b)}
                      >
                        <HiPencil />
                      </button>
                      <button
                        className={styles.iconButtonDanger}
                        onClick={() => handleOpenDeleteModal(b)}
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* --- SECTION 3: Analytics --- */}
        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Budget vs. Actual</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" fontSize="0.7rem" />
                  <YAxis fontSize="0.7rem" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                  {/* --- UPDATED: Use centralized colors --- */}
                  <Bar dataKey="Budgeted" fill={COLOR_TRANSFER} />
                  <Bar dataKey="Spent" fill={COLOR_EXPENSE} />
                  <Bar dataKey="Rollover" fill={COLOR_INCOME} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <div
              className={styles.listHeader}
              style={{
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <h2
                className={styles.cardTitle}
                style={{ border: 0, margin: 0, padding: 0 }}
              >
                Budget Allocation
              </h2>
              <select
                className={styles.input}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.6rem',
                  width: '150px',
                }}
                value={pieFilter}
                onChange={(e) => setPieFilter(e.target.value)}
              >
                <option value="all">All Budgets</option>
                {budgets.map((b) => (
                  <option key={b.budget_id} value={b.budget_id}>
                    {b.category_name}
                  </option>
                ))}
              </select>
            </div>

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
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                  >
                    {/* --- UPDATED: This now uses the new state variable --- */}
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          pieChartColors[index % pieChartColors.length]
                        }
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

      {/* --- MODALS --- */}
      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onBudgetAdded={fetchData}
        budgetToEdit={budgetToEdit}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this budget?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{budgetToDelete?.category_name}</strong>
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

export default BudgetsPage;