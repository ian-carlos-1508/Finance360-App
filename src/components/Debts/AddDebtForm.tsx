/* Replace file: src/components/Debts/AddDebtForm.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

// --- FIX: This type now matches your Supabase table ---
export type Debt = {
  debt_id: string;
  debt_name: string;
  current_balance: number;
  interest_rate_apr: number;
  minimum_payment: number;
};

interface AddDebtFormProps {
  debtToEdit: Debt | null;
  onSave: (newDebt: Debt) => void;
  onCancel: () => void;
}

function AddDebtForm({ debtToEdit, onSave, onCancel }: AddDebtFormProps) {
  // --- FIX: Use correct field names ---
  const [debtName, setDebtName] = useState('');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [interestRate, setInterestRate] = useState('0');
  const [minPayment, setMinPayment] = useState('0');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (debtToEdit) {
      setDebtName(debtToEdit.debt_name);
      setCurrentBalance(debtToEdit.current_balance.toString());
      setInterestRate(debtToEdit.interest_rate_apr.toString());
      setMinPayment(debtToEdit.minimum_payment.toString());
    } else {
      setDebtName('');
      setCurrentBalance('0');
      setInterestRate('0');
      setMinPayment('0');
    }
  }, [debtToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- FIX: Map state to the correct DB columns ---
    const debtData = {
      debt_name: debtName,
      current_balance: parseFloat(currentBalance) || 0,
      interest_rate_apr: parseFloat(interestRate) || 0,
      minimum_payment: parseFloat(minPayment) || 0,
    };

    let savedDebt: Debt | null = null;
    let dbError: any = null;

    if (debtToEdit) {
      const { data, error } = await supabase
        .from('debts')
        .update(debtData)
        .match({ debt_id: debtToEdit.debt_id })
        .select()
        .single();
      savedDebt = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from('debts')
        .insert(debtData)
        .select()
        .single();
      savedDebt = data;
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else if (savedDebt) {
      onSave(savedDebt);
    }
    setLoading(false);
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSave}>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="debt-name">Debt Name</label>
        <input
          id="debt-name"
          className={styles.input}
          type="text"
          value={debtName}
          onChange={(e) => setDebtName(e.target.value)}
          placeholder="e.g., Visa, Car Loan"
          required
        />
      </div>

      {/* --- REMOVED 'type' field as it's not in the DB --- */}

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="debt-balance">Current Balance</label>
        <input
          id="debt-balance"
          className={styles.input}
          type="number"
          step="0.01"
          value={currentBalance}
          onChange={(e) => setCurrentBalance(e.target.value)}
          placeholder="Amount you owe (e.g., 500.00)"
          required
        />
      </div>
      
      {/* --- NEW: Added fields from your DB schema --- */}
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="debt-apr">Interest Rate (APR)</label>
        <input
          id="debt-apr"
          className={styles.input}
          type="number"
          step="0.01"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          placeholder="e.g., 19.99"
          required
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="debt-min-payment">Minimum Payment</label>
        <input
          id="debt-min-payment"
          className={styles.input}
          type="number"
          step="0.01"
          value={minPayment}
          onChange={(e) => setMinPayment(e.target.value)}
          placeholder="e.g., 50.00"
          required
        />
      </div>
      
      {error && <p className={styles.errorText}>{error}</p>}
      
      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Saving...' : (debtToEdit ? 'Save Changes' : 'Save Debt')}
        </button>
      </div>
    </form>
  );
}

export default AddDebtForm;