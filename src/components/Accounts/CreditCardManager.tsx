import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import AddAccountForm, { type Account } from '../Accounts/AddAccountForm';

interface CreditCardManagerProps {
  onDataUpdated: () => void;
  // NEW: This component now receives its data
  accounts: Account[];
}

// This component is a copy of AccountManager, filtered for 'credit'
function CreditCardManager({ onDataUpdated, accounts }: CreditCardManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  
  // REMOVED: The 'accounts' state is now a prop
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // REMOVED: The 'fetchAccounts' useEffect is gone, as the parent page now handles fetching.

  // --- Modal Handlers ---
  const handleAddNew = () => {
    setEditingAccount(null);
    setIsEditModalOpen(true);
  };
  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  };
  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAccountToDelete(null);
    setError('');
  };
  
  // NEW: This function is simpler. It just tells the parent to refetch.
  const handleSaveSuccess = () => {
    onDataUpdated(); // Tell parent to refresh KPIs and list
    setIsEditModalOpen(false);
    setEditingAccount(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    setLoading(true);
    
    const { data, error: txError } = await supabase
      .from('transactions')
      .select('transaction_id')
      .or(`account_id.eq.${accountToDelete.account_id},to_account_id.eq.${accountToDelete.account_id}`)
      .limit(1);

    if (txError) {
      setError(txError.message); setLoading(false); return;
    }
    if (data && data.length > 0) {
      setError('Cannot delete account: it has transactions linked to it.');
      setLoading(false); return;
    }
    
    const { error } = await supabase
      .from('accounts')
      .delete()
      .match({ account_id: accountToDelete.account_id });

    if (error) {
      setError(error.message);
    } else {
      onDataUpdated(); // Tell parent to refresh
      handleCloseDeleteModal();
    }
    setLoading(false);
  };
  // --- End Handlers ---

  return (
    <div className={styles.tabContent}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>My Credit Cards</h3>
        <button className={styles.addButton} onClick={handleAddNew}>
          <HiPlus /> Add New
        </button>
      </div>
      
      {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      <ul className={styles.list}>
        {/* The 'accounts' prop is now used here */}
        {accounts.length === 0 ? (
          <li className={styles.listItem}>No credit cards found.</li>
        ) : (
          accounts.map((account) => (
            <li 
              key={account.account_id} 
              className={styles.listItem}
            >
              <div>
                <p>
                  <strong>{account.account_name}</strong>
                  <br />
                  <span className={styles.listItemSubtext}>
                    {account.bank_name} - <strong>{account.type}</strong>
                  </span>
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <p style={{ color: '#ef4444', fontWeight: 600 }}>
                  (${account.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </p>
                <button className={styles.iconButton} onClick={() => handleEdit(account)}>
                  <HiPencil />
                </button>
                <button className={styles.iconButtonDanger} onClick={() => handleDelete(account)}>
                  <HiTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingAccount ? 'Edit Credit Card' : 'Add New Credit Card'}
      >
        <AddAccountForm 
          accountToEdit={editingAccount}
          onSave={handleSaveSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this account?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{accountToDelete?.account_name}</strong>
          </p>
          <p className={styles.deleteModalText} style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '1rem'}}>
            Note: Accounts with transactions cannot be deleted.
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

export default CreditCardManager;