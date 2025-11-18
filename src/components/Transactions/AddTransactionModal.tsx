/* Replace file: src/components/Transactions/AddTransactionModal.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import AddAccountForm from '../Accounts/AddAccountForm';
import AddCategoryForm from '../Categories/AddCategoryForm';
import type { Account } from '../Accounts/AddAccountForm';
import type { Category as RawCategory } from '../Categories/AddCategoryForm';
import type { Transaction as IncomeExpenseTransaction } from './RecentTransactions';
import type { Transfer as TransferTransaction } from './RecentTransfers';
import { HiPlus } from 'react-icons/hi';

// --- Type Definitions ---
type Category = {
  category_id: string;
  name: string;
  subcategory: string | null;
};
type GroupedCategory = {
  name: string;
  subcategories: Category[];
};
type EditableTransaction = IncomeExpenseTransaction | TransferTransaction;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  transactionType: 'Income' | 'Expense' | 'Transfer';
  transactionToEdit: EditableTransaction | null;
}

// --- DATE BUG FIX 1: Helper to get local date string ---
// This avoids the .toISOString() bug when it's late at night.
const getLocalYyyyMmDd = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END FIX ---


function AddTransactionModal({
  isOpen,
  onClose,
  onTransactionAdded,
  transactionType,
  transactionToEdit,
}: AddTransactionModalProps) {
  // Form state
  const [amount, setAmount] = useState('');
  // --- DATE BUG FIX 1: Use helper for default state ---
  const [date, setDate] = useState(getLocalYyyyMmDd());
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  const [nwType, setNwType] = useState<'Need' | 'Want' | null>(null);

  // Fee State
  const [showFee, setShowFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [feeCategoryId, setFeeCategoryId] = useState('');

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupedCategories, setGroupedCategories] = useState<GroupedCategory[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Data Fetching Functions (unchanged) ---
  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*');
    if (data) setAccounts(data);
    return data || [];
  };

  const fetchCategories = async (type: 'Income' | 'Expense') => {
    const { data } = await supabase
      .from('categories')
      .select('category_id, category, subcategory, type')
      .eq('type', type);

    if (data) {
      const groups: { [key: string]: Category[] } = {};
      data.forEach((cat) => {
        const catData = {
          category_id: cat.category_id,
          name: cat.category,
          subcategory: cat.subcategory,
        };
        if (!groups[cat.category]) groups[cat.category] = [];
        groups[cat.category].push(catData);
      });
      const groupedArray = Object.keys(groups).map((name) => ({
        name: name,
        subcategories: groups[name],
      }));
      setGroupedCategories(groupedArray);
      return groupedArray;
    }
    return [];
  };

  const fetchExpenseCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('category_id, category, subcategory')
      .eq('type', 'Expense');
    if (data) {
      const flatCategories = data.map((cat) => ({
        category_id: cat.category_id,
        name: cat.category,
        subcategory: cat.subcategory,
      }));
      setExpenseCategories(flatCategories);
    }
  };

  // Main data load on modal open
  useEffect(() => {
    if (isOpen) {
      const loadAllData = async () => {
        setLoading(true);
        await fetchAccounts();
        await fetchExpenseCategories();

        let allCategories: GroupedCategory[] = [];
        if (transactionType !== 'Transfer') {
          allCategories = await fetchCategories(transactionType);
        }

        // Pre-fill logic for EDIT mode
        if (transactionToEdit) {
          // --- EXPENSE SIGN FIX: Use Math.abs to show positive num in form ---
          setAmount(Math.abs(transactionToEdit.amount).toString());
          
          /* --- TIMEZONE BUG FIX (WHEN EDITING) --- */
          setDate(transactionToEdit.date);
          
          setDescription(transactionToEdit.description || '');

          if (transactionType === 'Transfer') {
            const tx = transactionToEdit as TransferTransaction;
            setAccountId(tx.from_account_id);
            setToAccountId(tx.to_account_id || '');
          } else {
            const tx = transactionToEdit as IncomeExpenseTransaction;
            setAccountId(tx.account_id);

            if (transactionType === 'Expense') {
              setNwType(tx.nw_type || null);
            }

            if (tx.category_id) {
              const { data: cat } = await supabase
                .from('categories')
                .select('category, category_id')
                .eq('category_id', tx.category_id)
                .single();

              if (cat) {
                setMainCategory(cat.category);
                const selectedGroup = allCategories.find(
                  (g) => g.name === cat.category
                );
                setAvailableSubcategories(
                  selectedGroup ? selectedGroup.subcategories : []
                );
                setSubCategoryId(cat.category_id);
              }
            }
          }
        } else {
          // Reset default date for new transactions
          setDate(getLocalYyyyMmDd());
          // Clear form fields for "Add New"
          setAmount('');
          setDescription('');
          setAccountId('');
          setToAccountId('');
          setMainCategory('');
          setSubCategoryId('');
          setNwType(null);
          setShowFee(false);
          setFeeAmount('');
          setFeeCategoryId('');
        }
        setLoading(false);
      };
      loadAllData();
    }
  }, [isOpen, transactionToEdit, transactionType]); // Added clearForm fields to reset

  // Update subcategories (unchanged)
  useEffect(() => {
    if (mainCategory) {
      const selectedGroup = groupedCategories.find(
        (g) => g.name === mainCategory
      );
      setAvailableSubcategories(
        selectedGroup ? selectedGroup.subcategories : []
      );

      if (!transactionToEdit) {
        setSubCategoryId('');
      } else if (transactionType !== 'Transfer') {
        const tx = transactionToEdit as IncomeExpenseTransaction;
        if (mainCategory !== tx.category) {
          setSubCategoryId('');
        }
      }
    } else {
      setAvailableSubcategories([]);
      setSubCategoryId('');
    }
  }, [mainCategory, groupedCategories, transactionToEdit, transactionType]);

  const clearForm = () => {
    setAmount('');
    setDate(getLocalYyyyMmDd()); // Use local date on clear
    setDescription('');
    setAccountId('');
    setToAccountId('');
    setMainCategory('');
    setSubCategoryId('');
    setNwType(null);
    setShowFee(false);
    setFeeAmount('');
    setFeeCategoryId('');
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ... (validation checks)
    if (transactionType === 'Transfer') {
      if (!accountId || !toAccountId) {
        setError('Please select both a "From" and "To" account.');
        setLoading(false);
        return;
      }
      if (accountId === toAccountId) {
        setError('Cannot transfer to the same account.');
        setLoading(false);
        return;
      }
    } else {
      if (transactionType === 'Expense' && !nwType) {
        setError('Please classify this expense as a "Need" or "Want".');
        setLoading(false);
        return;
      }
      if (!accountId || !subCategoryId) {
        setError('Please select an account, category, and subcategory.');
        setLoading(false);
        return;
      }
    }
    if (showFee && (!feeCategoryId || !feeAmount)) {
      setError('Please enter a fee amount and select a fee category.');
      setLoading(false);
      return;
    }

    /* --- EXPENSE SIGN FIX ---
       User always enters a positive amount.
       We convert it to negative *only* if it's an 'Expense'.
    */
    const finalAmount = Math.abs(parseFloat(amount) || 0);
    const finalFeeAmount = Math.abs(parseFloat(feeAmount) || 0);

    const transactionsToInsert = [];
    const mainTransaction = {
      date: date, // 'YYYY-MM-DD' string
      type: transactionType,
      description: description,
      // Apply signage based on type
      amount: transactionType === 'Expense' ? -finalAmount : finalAmount, 
      account_id: accountId,
      to_account_id: transactionType === 'Transfer' ? toAccountId : null,
      category_id: transactionType === 'Transfer' ? null : subCategoryId,
      nw_type: transactionType === 'Expense' ? nwType : null,
    };

    if (showFee && !transactionToEdit) {
      const feeTransaction = {
        date: date, // 'YYYY-MM-DD' string
        type: 'Expense',
        description: `Fee: ${description}`,
        // Fees are always expenses, so make it negative
        amount: -finalFeeAmount, 
        account_id: accountId,
        to_account_id: null,
        category_id: feeCategoryId,
        nw_type: 'Need', // Default fees to 'Need'
      };
      transactionsToInsert.push(feeTransaction);
    }
    /* --- END EXPENSE SIGN FIX --- */

    let dbError: any = null;
    if (transactionToEdit) {
      const { error } = await supabase
        .from('transactions')
        .update(mainTransaction)
        .match({ transaction_id: transactionToEdit.transaction_id });
      dbError = error;
    } else {
      transactionsToInsert.push(mainTransaction);
      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else {
      clearForm();
      onTransactionAdded();
      onClose();
    }
    setLoading(false);
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const handleAccountSaved = (newAccount: Account) => {
    fetchAccounts();
    setAccountId(newAccount.account_id);
    setShowAddAccount(false);
  };

  const handleCategorySaved = (newCategory: RawCategory) => {
    fetchCategories(transactionType as 'Income' | 'Expense').then(
      (newGroups) => {
        const group = newGroups.find((g) => g.name === newCategory.category);
        if (group) {
          setMainCategory(group.name);
          setAvailableSubcategories(group.subcategories);
          setSubCategoryId(newCategory.category_id);
        }
      }
    );
    setShowAddCategory(false);
  };

  let title = `Add New ${transactionType}`;
  if (transactionToEdit) {
    title = `Edit ${transactionType}`;
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={title}>
        <form className={styles.modalForm} onSubmit={handleSave}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="amount">Amount</label>
            <input id="amount" className={styles.input} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="date">Date</label>
            <input id="date" className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="description">Description</label>
            <input id="description" className={styles.input} type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Paycheck, Groceries" />
          </div>

          {/* --- UPDATED: Account Row --- */}
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="account">
              {transactionType === 'Transfer' ? 'From Account' : 'Account'}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                id="account"
                className={styles.input}
                style={{ flexGrow: 1 }}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                <option value="" disabled>Select an account</option>
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
                onClick={() => setShowAddAccount(true)}
              >
                <HiPlus />
              </button>
            </div>
          </div>
          
          {transactionType === 'Transfer' ? (
            // --- UPDATED: To Account Row ---
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor="to-account">To Account</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  id="to-account"
                  className={styles.input}
                  style={{ flexGrow: 1 }}
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select an account</option>
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
                  onClick={() => setShowAddAccount(true)}
                >
                  <HiPlus />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* --- UPDATED: Category Row --- */}
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="category">Category</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    id="category"
                    className={styles.input}
                    style={{ flexGrow: 1 }}
                    value={mainCategory}
                    onChange={(e) => setMainCategory(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    {groupedCategories.map((group) => (
                      <option key={group.name} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.addButton}
                    style={{ padding: '0 0.75rem' }}
                    onClick={() => setShowAddCategory(true)}
                  >
                    <HiPlus />
                  </button>
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="subcategory">Subcategory</label>
                <select
                  id="subcategory"
                  className={styles.input}
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  required
                  disabled={availableSubcategories.length === 0}
                >
                  <option value="" disabled>Select a subcategory</option>
                  {availableSubcategories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.subcategory || cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {/* --- N/W SECTION (Unchanged) --- */}
          {transactionType === 'Expense' && (
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor="nw-type">
                Expense Type
              </label>
              <select
                id="nw-type"
                className={styles.input}
                value={nwType || ''}
                onChange={(e) =>
                  setNwType((e.target.value as 'Need' | 'Want') || null)
                }
                required // Make it required
              >
                <option value="" disabled>Select Need or Want</option>
                <option value="Need">Need</option>
                <option value="Want">Want</option>
              </select>
            </div>
          )}
          
          {/* --- Fee Section (Unchanged) --- */}
          {transactionType === 'Transfer' && !transactionToEdit && (
            <div className={styles.formRow} style={{ alignItems: 'center' }}>
              <label className={styles.label} htmlFor="show-fee">Fee?</label>
              <input id="show-fee" type="checkbox" checked={showFee} onChange={(e) => setShowFee(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            </div>
          )}
          {showFee && !transactionToEdit && (
            <>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="fee-amount">Fee Amount</label>
                <input id="fee-amount" className={styles.input} type="number" step="0.01" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="fee-category">Fee Category</label>
                <select id="fee-category" className={styles.input} value={feeCategoryId} onChange={(e) => setFeeCategoryId(e.target.value)}>
                  <option value="" disabled>Select a fee category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                      {cat.subcategory ? ` / ${cat.subcategory}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Saving...' : (transactionToEdit ? 'Save Changes' : 'Save Transaction')}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Nested Modals --- */}
      <Modal
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Add New Account"
        isNested={true}
      >
        <AddAccountForm
          accountToEdit={null}
          onSave={handleAccountSaved}
          onCancel={() => setShowAddAccount(false)}
        />
      </Modal>

      <Modal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        title="Add New Category"
        isNested={true}
      >
        <AddCategoryForm
          categoryToEdit={null}
          defaultType={
            transactionType === 'Transfer' ? 'Expense' : transactionType
          }
          onSave={handleCategorySaved}
          onCancel={() => setShowAddCategory(false)}
        />
      </Modal>
    </>
  );
}

export default AddTransactionModal;