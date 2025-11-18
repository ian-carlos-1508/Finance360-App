/* Create file: src/components/Debts/AddDebtSnapshotModal.tsx */

import React, { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { type Debt } from './AddDebtForm'; // Use the same Debt type

interface AddDebtSnapshotProps {
  debt: Debt;
  onSave: () => void;
  onCancel: () => void;
}

function AddDebtSnapshotModal({ debt, onSave, onCancel }: AddDebtSnapshotProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [balance, setBalance] = useState(debt.current_balance.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const newBalance = parseFloat(balance);
    if (isNaN(newBalance) || newBalance < 0) {
      setError('Please enter a valid balance.');
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc('fn_log_debt_snapshot', {
      p_debt_id: debt.debt_id,
      p_date: date,
      p_balance: newBalance,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onSave(); // Close modal and refresh data
    }
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSubmit}>
      <p className={styles.profileInfo} style={{ textAlign: 'center', marginTop: '-0.5rem', marginBottom: '1rem' }}>
        Logging new balance for: <strong>{debt.debt_name}</strong>
      </p>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="snapshot-date">Date</label>
        <input
          id="snapshot-date"
          className={styles.input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="snapshot-balance">New Balance</label>
        <input
          id="snapshot-balance"
          className={styles.input}
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="e.g., 5300.25"
          required
        />
      </div>
      
      {error && <p className={styles.errorText}>{error}</p>}
      
      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Logging...' : 'Log Balance'}
        </button>
      </div>
    </form>
  );
}

export default AddDebtSnapshotModal;