/* Replace file: src/components/Debts/DebtManager.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
// --- NEW: Added HiCalendarDays ---
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle, HiCalendarDays } from 'react-icons/hi2';
import AddDebtForm, { type Debt } from './AddDebtForm';
import { formatCurrency } from '../../lib/utils';
// --- NEW: Import snapshot modal ---
import AddDebtSnapshotModal from './AddDebtSnapshotModal';

interface DebtManagerProps {
  onDataUpdated: () => void;
}

function DebtManager({ onDataUpdated }: DebtManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // --- NEW: State for snapshot modal ---
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [debtToLog, setDebtToLog] = useState<Debt | null>(null);

  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('debt_name', { ascending: true });

    if (error) {
      console.error('Error fetching debts:', error);
      setError('Could not fetch debts.');
    } else {
      setError('');
      setDebts(data || []);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  // --- Modal Handlers ---
  const handleAddNew = () => {
    setEditingDebt(null);
    setIsEditModalOpen(true);
  };
  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setIsEditModalOpen(true);
  };
  const handleDelete = (debt: Debt) => {
    setDebtToDelete(debt);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDebtToDelete(null);
    setError('');
  };
  
  const handleSaveSuccess = () => {
    fetchDebts();
    onDataUpdated();
    setIsEditModalOpen(false);
    setEditingDebt(null);
  };
  
  // --- NEW: Snapshot modal handlers ---
  const handleOpenSnapshotModal = (debt: Debt) => {
    setDebtToLog(debt);
    setIsSnapshotModalOpen(true);
  };

  const handleCloseSnapshotModal = () => {
    setDebtToLog(null);
    setIsSnapshotModalOpen(false);
  };

  const handleSnapshotSaved = () => {
    fetchDebts(); // Refetch debts to get new current_balance
    onDataUpdated(); // Refresh dashboard KPIs
    handleCloseSnapshotModal();
  };
  
  const handleConfirmDelete = async () => {
    if (!debtToDelete) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('debts')
      .delete()
      .match({ debt_id: debtToDelete.debt_id });

    if (error) {
      setError(error.message);
    } else {
      await fetchDebts();
      onDataUpdated();
      handleCloseDeleteModal();
    }
    setLoading(false);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>My Liabilities (Debts)</h3>
        <button className={styles.addButton} onClick={handleAddNew}>
          <HiPlus /> Add New
        </button>
      </div>
      
      {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      <ul className={styles.list}>
        {debts.length === 0 ? (
          <li className={styles.listItem} style={{ justifyContent: 'center' }}>
            No debts found.
          </li>
        ) : (
          debts.map((debt) => (
            <li key={debt.debt_id} className={styles.listItem}>
              <div>
                <p>
                  <strong>{debt.debt_name}</strong>
                  <br />
                  <span className={styles.listItemSubtext}>
                    {debt.interest_rate_apr}% APR / {formatCurrency(debt.minimum_payment)} min. pmt.
                  </span>
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', minWidth: '100px' }}>
                  {formatCurrency(debt.current_balance * -1)}
                </p>
                
                {/* --- NEW: Log New Balance Button --- */}
                <button 
                  className={styles.iconButton} 
                  onClick={() => handleOpenSnapshotModal(debt)}
                  title="Log New Balance"
                >
                  <HiCalendarDays />
                </button>
                
                <button className={styles.iconButton} onClick={() => handleEdit(debt)} title="Edit">
                  <HiPencil />
                </button>
                <button className={styles.iconButtonDanger} onClick={() => handleDelete(debt)} title="Delete">
                  <HiTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* --- Edit/Add Modal --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingDebt ? 'Edit Debt' : 'Add New Debt'}
      >
        <AddDebtForm 
          debtToEdit={editingDebt}
          onSave={handleSaveSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* --- NEW: Snapshot Modal --- */}
      {debtToLog && (
        <Modal
          isOpen={isSnapshotModalOpen}
          onClose={handleCloseSnapshotModal}
          title="Log New Debt Balance"
          isNested={true}
        >
          <AddDebtSnapshotModal
            debt={debtToLog}
            onSave={handleSnapshotSaved}
            onCancel={handleCloseSnapshotModal}
          />
        </Modal>
      )}

      {/* --- Delete Modal --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this debt?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{debtToDelete?.debt_name}</strong>
          </p>
          {error && <p className={styles.errorText} style={{marginTop: '1rem'}}>{error}</p>}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCloseDeleteModal}
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

export default DebtManager;