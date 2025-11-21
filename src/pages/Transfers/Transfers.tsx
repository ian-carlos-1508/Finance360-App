/* Replace file: src/pages/Transfers/Transfers.tsx */

import { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { HiPlus, HiExclamationTriangle } from 'react-icons/hi2';
import Modal from '../../components/Modal/Modal';
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import RecentTransfers, {
  type Transfer,
} from '../../components/Transactions/RecentTransfers';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { COLOR_TRANSFER } from '../../lib/chartColors';
// --- NEW: Import Navigation ---
import BackToHub from '../../components/Navigation/BackToHub';

type KpiData = {
  totalTransferred: number;
  transactionCount: number;
};
type ChartData = { name: string; amount: number };
type DateFilter = 'all' | 'month' | '30days';
type Account = { account_id: string; account_name: string };

function TransfersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transfer | null>(
    null
  );
  const [transactionToDelete, setTransactionToDelete] = useState<Transfer | null>(
    null
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [fromAccountFilter, setFromAccountFilter] = useState<string>('all');
  const [toAccountFilter, setToAccountFilter] = useState<string>('all');

  const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);

  const [kpiData, setKpiData] = useState<KpiData>({
    totalTransferred: 0,
    transactionCount: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [barChartData, setBarChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFilterData = async () => {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_id, account_name');
      if (accounts) setFilterAccounts(accounts);
    };
    fetchFilterData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('v_transfers')
      .select('*')
      .order('date', { ascending: false });

    if (dateFilter === 'month') {
      const today = new Date();
      const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      query = query.gte('date', firstDay);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      query = query.gte('date', thirtyDaysAgo);
    }

    if (fromAccountFilter !== 'all') {
      query = query.eq('from_account_id', fromAccountFilter);
    }

    if (toAccountFilter !== 'all') {
      query = query.eq('to_account_id', toAccountFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transfers:', error);
      setError(error.message);
    } else if (data) {
      const typedData = data as Transfer[];

      const totalTransferred = typedData.reduce((sum, tx) => sum + tx.amount, 0);
      const transactionCount = typedData.length;
      setKpiData({ totalTransferred, transactionCount });

      setRecentTransfers(typedData.slice(0, 10));

      const monthlyTransfers: { [key: string]: number } = {};
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      typedData.forEach((tx) => {
        const monthName = monthNames[new Date(tx.date).getMonth()];
        monthlyTransfers[monthName] =
          (monthlyTransfers[monthName] || 0) + tx.amount;
      });
      const processedBarData = monthNames
        .map((month) => ({
          name: month,
          amount: monthlyTransfers[month] || 0,
        }))
        .filter((d) => d.amount > 0);
      setBarChartData(processedBarData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter, fromAccountFilter, toAccountFilter]);

  const handleOpenAddModal = () => {
    setTransactionToEdit(null);
    setIsAddModalOpen(true);
  };
  const handleOpenEditModal = (tx: Transfer) => {
    setTransactionToEdit(tx);
    setIsAddModalOpen(true);
  };
  const handleOpenDeleteModal = (tx: Transfer) => {
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
        <h1 className={styles.title}>Transfers Overview</h1>

        <div className={styles.filterWrapper}>
          <label className={styles.label} htmlFor="from-account-filter">
            From:
          </label>
          <select
            id="from-account-filter"
            className={styles.input}
            value={fromAccountFilter}
            onChange={(e) => setFromAccountFilter(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {filterAccounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name}
              </option>
            ))}
          </select>

          <label className={styles.label} htmlFor="to-account-filter">
            To:
          </label>
          <select
            id="to-account-filter"
            className={styles.input}
            value={toAccountFilter}
            onChange={(e) => setToAccountFilter(e.target.value)}
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
          <div className={`${styles.kpiCard} ${styles.blue}`}>
            <h3 className={styles.kpiTitle}>Total Transferred (Filtered)</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData.totalTransferred)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.gray}`}>
            <h3 className={styles.kpiTitle}># of Transfers</h3>
            <p className={styles.kpiValue}>{kpiData.transactionCount}</p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.tableSection}`}>
          <div className={styles.listHeader}>
            <h2
              className={styles.cardTitle}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              Recent Transfers (Filtered)
            </h2>
            <button className={styles.addButton} onClick={handleOpenAddModal}>
              <HiPlus /> Add Transfer
            </button>
          </div>

          <RecentTransfers
            transfers={recentTransfers}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            allLinkPath="/transfers/all"
          />
        </div>

        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Transfers by Month</h2>
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
                  <Bar dataKey="amount" fill={COLOR_TRANSFER} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={fetchData}
        transactionType="Transfer"
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
            Are you sure you want to delete this transfer?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{transactionToDelete?.description || 'Transfer'}</strong>
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

export default TransfersPage;