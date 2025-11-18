/* Replace file: src/components/Investments/AddInvestmentSnapshotModal.tsx */

import React, { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { type Investment } from './AddInvestmentForm'; // Use the same Investment type
import { formatCurrency } from '../../lib/utils';

interface AddInvestmentSnapshotProps {
  investment: Investment;
  onSave: () => void;
  onCancel: () => void;
}

function AddInvestmentSnapshotModal({ investment, onSave, onCancel }: AddInvestmentSnapshotProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // --- CHANGE: Track Price Per Share instead of Total Value ---
  const [pricePerShare, setPricePerShare] = useState(investment.current_price.toString());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to calculate total value dynamically
  const calculateTotalValue = (priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return 0;
    return price * investment.quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const price = parseFloat(pricePerShare);
    const totalValue = calculateTotalValue(pricePerShare);

    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price per share.');
      setLoading(false);
      return;
    }

    // We send the TOTAL VALUE to the database, preserving your existing SQL logic
    const { error: rpcError } = await supabase.rpc('fn_log_investment_snapshot', {
      p_investment_id: investment.investment_id,
      p_date: date,
      p_value: totalValue, // Calculated automatically (Price * Qty)
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
        Logging new value for: <strong>{investment.name}</strong>
        <br />
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Holding: {investment.quantity} shares
        </span>
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

      {/* --- INPUT 1: Current Stock Price (User Types This) --- */}
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="price-per-share">Current Price</label>
        <div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
            <input
            id="price-per-share"
            className={styles.input}
            type="number"
            step="0.01"
            value={pricePerShare}
            onChange={(e) => setPricePerShare(e.target.value)}
            placeholder="e.g. 150.00"
            required
            />
            <span className={styles.listItemSubtext} style={{ marginTop: '0.25rem' }}>
                Enter the current market price per share/unit.
            </span>
        </div>
      </div>

      {/* --- INPUT 2: Total Value (Calculated Automatically) --- */}
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="total-value">Total Value</label>
        <div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
            <input
                id="total-value"
                className={styles.input}
                type="text"
                // This calculates automatically: Price * Quantity
                value={formatCurrency(calculateTotalValue(pricePerShare))} 
                disabled // Read-only
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
            />
             <span className={styles.listItemSubtext} style={{ marginTop: '0.25rem' }}>
                Calculated: Price × {investment.quantity} shares
            </span>
        </div>
      </div>
      
      {error && <p className={styles.errorText} style={{marginTop: '1rem'}}>{error}</p>}
      
      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Logging...' : 'Log Value'}
        </button>
      </div>
    </form>
  );
}

export default AddInvestmentSnapshotModal;