/* File: src/pages/Income/AllIncomePage.tsx */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './AllIncome.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import type { Transaction as IncomeTransaction } from '../../components/Transactions/RecentTransactions';
import { formatCurrency } from '../../lib/utils';

type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string; };
type Category = { category_id: string; category: string; subcategory: string | null };

const ITEMS_PER_PAGE = 40;

// --- TIMEZONE BUG FIX ---
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function AllIncomePage() {
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<IncomeTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<IncomeTransaction | null>(null);
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
        .eq('type', 'Income');
      if (categories) setFilterCategories(categories);
    };
    fetchFilterData();
  }, []);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 12, 0, 0);
    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fetchPaginatedIncome = async () => {
    setLoading(true);
    setError('');
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('v_income')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (dateFilter === 'month') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      query = query.gte('date', getLocalYyyyMmDd(firstDay));
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('date', getLocalYyyyMmDd(thirtyDaysAgo));
    }

    if (accountFilter !== 'all') {
      query = query.eq('account_id', accountFilter);
    }

    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching paginated income:', error);
      setError(error.message);
    } else if (data) {
      setTransactions(data as IncomeTransaction[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  // --- RECURRING TRANSACTIONS TRIGGER ---
  useEffect(() => {
    const processTransactions = async () => {
      const { error } = await supabase.rpc('fn_process_recurring_transactions');
      if (error) {
        console.error("Error processing recurring transactions:", error.message);
      }
      fetchPaginatedIncome();
    };
    
    processTransactions();
  }, [currentPage, dateFilter, accountFilter, categoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, accountFilter, categoryFilter]);

  const handleOpenEditModal = (tx: IncomeTransaction) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (tx: IncomeTransaction) => {
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
      fetchPaginatedIncome();
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
    setLoading(false);
  };
  const handleTransactionAdded = () => {
    fetchPaginatedIncome();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className={styles.title}>All Income Transactions</h1>

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

      {/* --- NAV FIX: Point back to Transaction Hub (INCOME Tab) --- */}
      <Link 
        to="/transactions-hub" 
        state={{ defaultTab: 'INCOME' }} 
        className={styles.backLink}
      >
        &larr; Back to Transaction Hub
      </Link>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
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
                <tr><td colSpan={6} style={{textAlign: 'center'}}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign: 'center'}}>No transactions found.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td>{formatDate(tx.date)}</td>
                    <td>{tx.category}</td>
                    <td>{tx.subcategory || '---'}</td>
                    <td>{tx.from_account_name}</td>
                    <td className={styles.amount} style={{color: '#10b981'}}>
                      {formatCurrency(tx.amount)}
                    </td>
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
        onTransactionAdded={handleTransactionAdded}
        transactionType="Income"
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
              className={sharedStyles.cancelButton}
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={sharedStyles.deleteButton}
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

export default AllIncomePage;