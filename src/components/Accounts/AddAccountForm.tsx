/* Replace file: src/components/Accounts/AddAccountForm.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

export type Account = {
  account_id: string;
  account_name: string;
  bank_name: string;
  initial_balance: number;
  current_balance: number;
  type: 'cash' | 'credit' | 'investment';
  credit_limit: number | null;
  apr: number | null;
  minimum_payment: number | null;
};

interface AddAccountFormProps {
  accountToEdit: Account | null;
  onSave: (newAccount: Account) => void;
  onCancel: () => void;
  // NEW: Allow locking the form to a specific type (for Wizard)
  forcedType?: 'cash' | 'credit' | 'investment';
}

function AddAccountForm({ accountToEdit, onSave, onCancel, forcedType }: AddAccountFormProps) {
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
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
      setInitialBalance(Math.abs(accountToEdit.initial_balance).toString());
      setType(accountToEdit.type as 'cash' | 'credit' | 'investment');
      setCreditLimit(accountToEdit.credit_limit?.toString() || '0');
      setApr(accountToEdit.apr?.toString() || '0');
      setMinimumPayment(accountToEdit.minimum_payment?.toString() || '0');
    } else {
      setAccountName('');
      setBankName('');
      setInitialBalance('0');
      // Use forced type if provided, otherwise default to cash
      setType(forcedType || 'cash');
      setCreditLimit('0');
      setApr('0');
      setMinimumPayment('0');
    }
  }, [accountToEdit, forcedType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const isCredit = type === 'credit';
    const parsedBalance = parseFloat(initialBalance) || 0;

    const accountData = {
      account_name: accountName,
      bank_name: bankName,
      // Credits are negative
      initial_balance: isCredit ? -Math.abs(parsedBalance) : parsedBalance,
      type: type,
      credit_limit: isCredit ? parseFloat(creditLimit) || 0 : 0, 
      apr: isCredit ? parseFloat(apr) || 0 : 0, 
      minimum_payment: isCredit ? parseFloat(minimumPayment) || 0 : 0,
    };

    let savedAccount: Account | null = null;
    let dbError: any = null;

    if (accountToEdit) {
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
      onSave(savedAccount as Account);
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
      
      {/* Only show Type Selector if NOT forced */}
      {!forcedType ? (
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="account-type">Account Type</label>
          <select
            id="account-type"
            className={styles.input}
            value={type}
            onChange={(e) => setType(e.target.value as 'cash' | 'credit' | 'investment')}
          >
            <option value="cash">Cash (Checking, Savings)</option>
            <option value="credit">Credit Card</option>
            <option value="investment">Investment (Brokerage)</option>
          </select>
        </div>
      ) : (
        /* Hidden visual cue so user knows what they are adding */
        <div className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-400">
           Adding: {forcedType === 'cash' ? 'Cash Account' : forcedType === 'credit' ? 'Credit Card' : 'Investment Account'}
        </div>
      )}

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="initial-balance">
          {type === 'credit' ? 'Current Owed' : 'Current Balance'}
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
        {/* In Wizard Mode, "Cancel" might just clear the form, but we keep the button for standard use */}
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Clear
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Saving...' : 'Save & Add'}
        </button>
      </div>
    </form>
  );
}

export default AddAccountForm;