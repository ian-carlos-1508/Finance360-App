import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './AllTransfers.module.css'; // Use the new CSS
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import type { Transfer as TransferTransaction } from '../../components/Transactions/RecentTransfers';

// --- Type Definitions ---
type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string; };

const ITEMS_PER_PAGE = 40;

function AllTransfersPage() {
  const [transactions, setTransactions] = useState<TransferTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransferTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<TransferTransaction | null>(null);
  const [error, setError] = useState('');

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [fromAccountFilter, setFromAccountFilter] = useState<string>('all');
  const [toAccountFilter, setToAccountFilter] = useState<string>('all');

  const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: accounts } = await supabase.from('accounts').select('account_id, account_name');
      if (accounts) setFilterAccounts(accounts);
    };
    fetchFilterData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fetchPaginatedTransfers = async () => {
    setLoading(true);
    setError('');
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('v_transfers') // <-- Queries v_transfers
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (dateFilter === 'month') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      query = query.gte('date', firstDay);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('date', thirtyDaysAgo);
    }
    
    if (fromAccountFilter !== 'all') {
      query = query.eq('from_account_id', fromAccountFilter);
    }
    
    if (toAccountFilter !== 'all') {
      query = query.eq('to_account_id', toAccountFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching paginated transfers:', error);
      setError(error.message);
    } else if (data) {
      setTransactions(data as TransferTransaction[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPaginatedTransfers();
  }, [currentPage, dateFilter, fromAccountFilter, toAccountFilter]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, fromAccountFilter, toAccountFilter]);

  const handleOpenEditModal = (tx: TransferTransaction) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (tx: TransferTransaction) => {
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
      fetchPaginatedTransfers();
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
    setLoading(false);
  };
  const handleTransactionAdded = () => {
    fetchPaginatedTransfers();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className={styles.title}>All Transfer Transactions</h1>
      
      <div className={sharedStyles.filterWrapper} style={{justifyContent: 'flex-start', marginBottom: '1.5rem'}}>
        <label className={sharedStyles.label} htmlFor="from-account-filter">From:</label>
        <select 
          id="from-account-filter"
          className={sharedStyles.input}
          value={fromAccountFilter}
          onChange={(e) => setFromAccountFilter(e.target.value)}
        >
          <option value="all">All Accounts</option>
          {filterAccounts.map(acc => (
            <option key={acc.account_id} value={acc.account_id}>
              {acc.account_name}
            </option>
          ))}
        </select>

        <label className={sharedStyles.label} htmlFor="to-account-filter">To:</label>
        <select 
          id="to-account-filter"
          className={sharedStyles.input}
          value={toAccountFilter}
          onChange={(e) => setToAccountFilter(e.target.value)}
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

      <Link to="/transfers" className={styles.backLink}>
        &larr; Back to Transfers Overview
      </Link>
      
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Description</th>
                <th style={{textAlign: 'right'}}>Amount</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign: 'center'}}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign: 'center'}}>No transfers found.</td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td>{formatDate(tx.date)}</td>
                    <td>{tx.from_account_name}</td>
                    <td>{tx.to_account_name}</td>
                    <td>{tx.description || '---'}</td>
                    <td className={styles.amount}>
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        transactionType="Transfer"
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
            Are you sure you want to delete this transfer?
          </p>
          <p className={sharedStyles.deleteModalText}>
            <strong>{transactionToDelete?.description || 'Transfer'}</strong>
          </p>
          {error && <p className={sharedStyles.errorText}>{error}</p>}
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

export default AllTransfersPage;