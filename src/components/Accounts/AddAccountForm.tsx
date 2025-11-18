/* Replace file: src/components/Accounts/AddAccountForm.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

// --- UPDATED: Added 'investment' to the type ---
export type Account = {
  account_id: string;
  account_name: string;
  bank_name: string;
  initial_balance: number;
  current_balance: number;
  type: 'cash' | 'credit' | 'investment';
  credit_limit: number | null; // Allow null
  apr: number | null;
  minimum_payment: number | null;
};
// --- End Update ---

interface AddAccountFormProps {
  accountToEdit: Account | null;
  onSave: (newAccount: Account) => void;
  onCancel: () => void;
}

function AddAccountForm({ accountToEdit, onSave, onCancel }: AddAccountFormProps) {
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  // --- UPDATED: Use the specific union type ---
  const [type, setType] = useState<'cash' | 'credit' | 'investment'>('cash');
  const [creditLimit, setCreditLimit] = useState('0');
  const [apr, setApr] = useState('0');
  const [minimumPayment, setMinimumPayment] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setAccountName(accountToEdit.account_name);
      setBankName(accountToEdit.bank_name);
      
      // FIX: When editing, show the positive "owed" amount
      setInitialBalance(Math.abs(accountToEdit.initial_balance).toString());
      
      // --- UPDATED: Cast the type correctly ---
      setType(accountToEdit.type as 'cash' | 'credit' | 'investment');
      setCreditLimit(accountToEdit.credit_limit?.toString() || '0');
      setApr(accountToEdit.apr?.toString() || '0');
      setMinimumPayment(accountToEdit.minimum_payment?.toString() || '0');
    } else {
      setAccountName('');
      setBankName('');
      setInitialBalance('0');
      setType('cash');
      setCreditLimit('0');
      setApr('0');
      setMinimumPayment('0');
    }
  }, [accountToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isCredit = type === 'credit';
    const parsedBalance = parseFloat(initialBalance) || 0;

    /* --- THIS IS THE CRITICAL BUG FIX ---
       If the type is 'credit', save the 'initial_balance' as a
       negative number to represent debt.
    */
    const accountData = {
      account_name: accountName,
      bank_name: bankName,
      initial_balance: isCredit ? -Math.abs(parsedBalance) : parsedBalance, // <-- THE FIX
      type: type,
      credit_limit: isCredit ? parseFloat(creditLimit) || 0 : 0, 
      apr: isCredit ? parseFloat(apr) || 0 : 0, 
      minimum_payment: isCredit ? parseFloat(minimumPayment) || 0 : 0,
    };
    /* --- END BUG FIX --- */

    let savedAccount: Account | null = null;
    let dbError: any = null;

    if (accountToEdit) {
      // --- SYNTAX FIX: Removed the 'U' ---
      const { data, error } = await supabase
        .from('accounts')
        .update(accountData)
        .match({ account_id: accountToEdit.account_id })
        .select()
        .single();
      savedAccount = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single();
      savedAccount = data;
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else if (savedAccount) {
      onSave(savedAccount as Account); // Cast to be sure
    }
    setLoading(false);
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSave}>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="account-name">Account Name</label>
        <input
          id="account-name"
          className={styles.input}
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g., Checking, Visa, IBKR"
          required
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="bank-name">Bank / Institution</label>
        <input
          id="bank-name"
          className={styles.input}
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g., Banco General, Interactive Brokers"
          required
        />
      </div>
      
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="account-type">Account Type</label>
        <select
          id="account-type"
          className={styles.input}
          value={type}
          onChange={(e) => setType(e.target.value as 'cash' | 'credit' | 'investment')}
        >
          <option value="cash">Cash (Checking, Savings, etc.)</option>
          <option value="credit">Credit Card</option>
          {/* --- NEWLY ADDED OPTION --- */}
          <option value="investment">Investment (Brokerage)</option>
        </select>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="initial-balance">
          {type === 'credit' ? 'Current Owed' : 'Initial Balance'}
        </label>
        <input
          id="initial-balance"
          className={styles.input}
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder={type === 'credit' ? 'e.g., 500 (what you owe)' : 'e.g., 1000'}
          required
        />
      </div>
      
      {/* --- Conditional Fields for Credit Cards (this logic is already correct) --- */}
      {type === 'credit' && (
        <>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="credit-limit">Credit Limit</label>
            <input
              id="credit-limit"
              className={styles.input}
              type="number"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="e.g., 10000"
              required
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="apr">Interest Rate (APR)</label>
            <input
              id="apr"
              className={styles.input}
              type="number"
              step="0.01"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              placeholder="e.g., 29.99"
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="minimum-payment">Minimum Payment</label>
            <input
              id="minimum-payment"
              className={styles.input}
              type="number"
              step="0.01"
              value={minimumPayment}
              onChange={(e) => setMinimumPayment(e.target.value)}
              placeholder="e.g., 50"
            />
          </div>
        </>
      )}
      
      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Saving...' : (accountToEdit ? 'Save Changes' : 'Save Account')}
        </button>
      </div>
    </form>
  );
}

export default AddAccountForm;