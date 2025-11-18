/* Replace file: src/pages/Expenses/AllExpensesPage.tsx */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './AllExpenses.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import type { Transaction as ExpenseTransaction } from '../../components/Transactions/RecentTransactions';
import { formatCurrency } from '../../lib/utils';
import { COLOR_EXPENSE } from '../../lib/chartColors';

type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string; };
type Category = { category_id: string; category: string; subcategory: string | null };

const ITEMS_PER_PAGE = 40;

// --- TIMEZONE BUG FIX: Add helper function ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END FIX ---

function AllExpensesPage() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<ExpenseTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<ExpenseTransaction | null>(null);
  const [error, setError] = useState('');

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);
  
  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: accounts } = await supabase.from('accounts').select('account_id, account_name');
      if (accounts) setFilterAccounts(accounts);

      const { data: categories } = await supabase
        .from('categories')
        .select('category_id, category, subcategory')
        .eq('type', 'Expense');
      if (categories) setFilterCategories(categories);
    };
    fetchFilterData();
  }, []);

  /* --- TIMEZONE BUG FIX --- */
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 12, 0, 0);

    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  /* --- END TIMEZONE BUG FIX --- */

  const fetchPaginatedExpenses = async () => {
    setLoading(true);
    setError('');
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('v_expenses')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    // --- TIMEZONE BUG FIX: Use YYYY-MM-DD strings ---
    if (dateFilter === 'month') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      query = query.gte('date', getLocalYyyyMmDd(firstDay));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('date', getLocalYyyyMmDd(thirtyDaysAgo));
    }
    // --- END TIMEZONE FIX ---

    if (accountFilter !== 'all') {
      query = query.eq('account_id', accountFilter);
    }

    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching paginated expenses:', error);
      setError(error.message);
    } else if (data) {
      setTransactions(data as ExpenseTransaction[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  // --- FIX: Reverted to simple data fetching hook ---
  useEffect(() => {
    fetchPaginatedExpenses();
  }, [currentPage, dateFilter, accountFilter, categoryFilter]);
  // --- END FIX ---

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, accountFilter, categoryFilter]);

  const handleOpenEditModal = (tx: ExpenseTransaction) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (tx: ExpenseTransaction) => {
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
      fetchPaginatedExpenses(); // Just refetch
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  };
  
  const handleTransactionAdded = () => {
    fetchPaginatedExpenses(); // Just refetch
  };
  
  // FIX: Re-added totalPages calculation
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className={styles.title}>All Expense Transactions</h1>

      <div className={sharedStyles.filterWrapper} style={{justifyContent: 'flex-start', marginBottom: '1.5rem'}}>
        <label className={sharedStyles.label} htmlFor="category-filter">Category:</label>
        <select
          id="category-filter"
          className={sharedStyles.input}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {filterCategories.map(cat => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category}{cat.subcategory ? ` / ${cat.subcategory}` : ''}
            </option>
          ))}
        </select>

        <label className={sharedStyles.label} htmlFor="account-filter">Account:</label>
        <select
          id="account-filter"
          className={sharedStyles.input}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        >
          <option value="all">All Accounts</option>
          {filterAccounts.map(acc => (
            <option key={acc.account_id} value={acc.account_id}>
              {acc.account_name}
            </option>
          ))}
        </select>

        <label className={sharedStyles.label} htmlFor="date-filter">Show:</label>
        <select
          id="date-filter"
          className={sharedStyles.input}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
        >
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="30days">Last 30 Days</option>
        </select>
      </div>

      <Link to="/expenses" className={styles.backLink}>
        &larr; Back to Expense Overview
      </Link>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N/W</th>
                <th>Date</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Account</th>
                <th style={{textAlign: 'right'}}>Amount</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign: 'center'}}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign: 'center'}}>No transactions found.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td style={{ textAlign: 'center' }}>
                      {/* --- FIX: Changed "N" to "Needs" and "W" to "Wants" --- */}
                      {tx.nw_type === 'Need' && <span className={`${sharedStyles.tag} ${sharedStyles.tagNeed}`}>Needs</span>}
                      {tx.nw_type === 'Want' && <span className={`${sharedStyles.tag} ${sharedStyles.tagWant}`}>Wants</span>}
                    </td>
                    <td>{formatDate(tx.date)}</td>
                    <td>{tx.category}</td>
                    <td>{tx.subcategory || '---'}</td>
                    <td>{tx.from_account_name}</td>
                    
                    {/* --- CONSISTENCY FIX --- */}
                    <td className={styles.amount} style={{ color: COLOR_EXPENSE }}>
                      - {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    {/* --- END FIX --- */}
                    
                    <td style={{textAlign: 'right'}}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className={sharedStyles.iconButton}
                          onClick={() => handleOpenEditModal(tx)}
                        >
                          <HiPencil />
                        </button>
                        <button
                          className={sharedStyles.iconButtonDanger}
                          onClick={() => handleOpenDeleteModal(tx)}
                        >
                          <HiTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong>
            -<strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</strong> of <strong>{totalCount}</strong>
          </span>
          <div className={styles.pageButtons}>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={handleTransactionAdded} // FIX: Use correct handler
        transactionType="Expense"
        transactionToEdit={transactionToEdit}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className={sharedStyles.deleteModalContent}>
          <HiExclamationTriangle className={sharedStyles.warningIcon} />
          <p className={sharedStyles.deleteModalText}>
            Are you sure you want to delete this transaction?
          </p>
          <p className={sharedStyles.deleteModalText}>
            <strong>{transactionToDelete?.description || 'Transaction'}</strong>
          </p>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={sharedStyles.modalFooter}>
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

export default AllExpensesPage;