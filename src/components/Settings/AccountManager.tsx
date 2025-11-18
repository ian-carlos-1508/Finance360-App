/* Replace file: src/components/Settings/AccountManager.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import AddAccountForm, { type Account } from '../Accounts/AddAccountForm';
import { formatCurrency } from '../../lib/utils';

interface AccountManagerProps {
  onDataUpdated: () => void;
  onAccountSelect: (account: Account) => void;
  selectedAccountId: string | null;
  accounts: Account[];
  filter: 'all' | 'cash' | 'credit';
}

function AccountManager({ onDataUpdated, onAccountSelect, selectedAccountId, accounts, filter }: AccountManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  
  const handleSaveSuccess = () => {
    onDataUpdated(); // Tell parent to refresh
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
      onDataUpdated();
      handleCloseDeleteModal();
    }
    setLoading(false);
  };
  // --- End Handlers ---

  let title = 'My Accounts';
  if (filter === 'cash') title = 'My Cash Accounts';
  if (filter === 'credit') title = 'My Credit Cards';

  return (
    <div className={styles.tabContent}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>{title}</h3>
        <button className={styles.addButton} onClick={handleAddNew}>
          <HiPlus /> Add New
        </button>
      </div>
      
      {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      <ul className={styles.list}>
        {accounts.length === 0 ? (
          <li className={styles.listItem}>No accounts found for this filter.</li>
        ) : (
          accounts.map((account) => {
            const isCredit = account.type === 'credit';
            
            // --- BUG FIX (TypeScript Error) ---
            // Use (account.credit_limit || 0) to prevent 'possibly null' error.
            // This safely defaults to 0 for cash accounts (where it's not used).
            const availableCredit = (account.credit_limit || 0) + account.current_balance;
            // --- END FIX ---

            return (
              <li 
                key={account.account_id} 
                className={styles.listItem}
                style={{
                  backgroundColor: selectedAccountId === account.account_id ? '#f3f4f6' : 'transparent'
                }}
              >
                <div>
                  <p>
                    <button 
                      className={styles.linkButton}
                      onClick={() => onAccountSelect(account)}
                    >
                      {account.account_name}
                    </button>
                    <br />
                    <span className={styles.listItemSubtext}>
                      {account.bank_name} - <strong>{account.type}</strong>
                    </span>
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {isCredit ? (
                    <div>
                      <p style={{ color: '#ef4444', fontWeight: 600, margin: 0 }}>
                        {formatCurrency(account.current_balance * -1)}
                      </p>
                      <span className={styles.listItemSubtext}>
                        Available: {formatCurrency(availableCredit)}
                      </span>
                    </div>
                  ) : (
                    <p style={{ color: '#111827', fontWeight: 600 }}>
                      {formatCurrency(account.current_balance)}
                    </p>
                  )}
                  
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <button className={styles.iconButton} onClick={() => handleEdit(account)}>
                      <HiPencil />
                    </button>
                    <button className={styles.iconButtonDanger} onClick={() => handleDelete(account)}>
                      <HiTrash />
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
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

export default AccountManager;