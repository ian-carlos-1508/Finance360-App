import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

// Type for the Investment object (matches our new DB table)
export type Investment = {
  investment_id: string;
  name: string;
  type: string;
  ticker: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
};

interface AddInvestmentFormProps {
  investmentToEdit: Investment | null;
  onSave: (newInvestment: Investment) => void;
  onCancel: () => void;
}

function AddInvestmentForm({ investmentToEdit, onSave, onCancel }: AddInvestmentFormProps) {
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('Stock');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [averagePrice, setAveragePrice] = useState('0');
  const [currentPrice, setCurrentPrice] = useState('0');

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (investmentToEdit) {
      setName(investmentToEdit.name);
      setType(investmentToEdit.type);
      setTicker(investmentToEdit.ticker || '');
      setQuantity(investmentToEdit.quantity.toString());
      setAveragePrice(investmentToEdit.average_price.toString());
      setCurrentPrice(investmentToEdit.current_price.toString());
    } else {
      setName('');
      setType('Stock');
      setTicker('');
      setQuantity('0');
      setAveragePrice('0');
      setCurrentPrice('0');
    }
  }, [investmentToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const investmentData = {
      name,
      type,
      ticker: ticker || null,
      quantity: parseFloat(quantity) || 0,
      average_price: parseFloat(averagePrice) || 0,
      current_price: parseFloat(currentPrice) || 0,
    };

    let savedInvestment: Investment | null = null;
    let dbError: any = null;

    if (investmentToEdit) {
      const { data, error } = await supabase
        .from('investments')
        .update(investmentData)
        .match({ investment_id: investmentToEdit.investment_id })
        .select()
        .single();
      savedInvestment = data;
      dbError = error;
    } else {
      const { data, error } = await supabase
        .from('investments')
        .insert(investmentData)
        .select()
        .single();
      savedInvestment = data;
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else if (savedInvestment) {
      onSave(savedInvestment);
    }
    setLoading(false);
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSave}>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-name">Name</label>
        <input
          id="inv-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Apple, Bitcoin"
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-type">Type</label>
        <select
          id="inv-type"
          className={styles.input}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="Stock">Stock</option>
          <option value="ETF">ETF</option>
          <option value="Crypto">Crypto</option>
          <option value="Bond">Bond</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-ticker">Ticker</label>
        <input
          id="inv-ticker"
          className={styles.input}
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g., AAPL (Optional)"
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-quantity">Quantity</label>
        <input
          id="inv-quantity"
          className={styles.input}
          type="number"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-avg-price">Average Price</label>
        <input
          id="inv-avg-price"
          className={styles.input}
          type="number"
          step="any"
          value={averagePrice}
          onChange={(e) => setAveragePrice(e.target.value)}
          placeholder="Your cost basis"
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="inv-current-price">Current Price</label>
        <input
          id="inv-current-price"
          className={styles.input}
          type="number"
          step="any"
          value={currentPrice}
          onChange={(e) => setCurrentPrice(e.target.value)}
          placeholder="Manual market price"
          required
        />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.modalFooter}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? 'Saving...' : (investmentToEdit ? 'Save Changes' : 'Save Investment')}
        </button>
      </div>
    </form>
  );
}

export default AddInvestmentForm;