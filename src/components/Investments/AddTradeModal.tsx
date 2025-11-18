/* Replace file: src/components/Investments/AddTradeModal.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { type Account } from '../Accounts/AddAccountForm';
import { formatCurrency } from '../../lib/utils';
// --- NEW IMPORTS ---
import Modal from '../Modal/Modal';
import AddInvestmentForm, { type Investment } from './AddInvestmentForm';
import { FaPlus } from 'react-icons/fa';

// --- RENAMED TYPE to avoid conflict ---
type InvestmentDropdownItem = {
  investment_id: string;
  name: string;
};

interface AddTradeModalProps {
  onSave: () => void;
  onCancel: () => void;
}

function AddTradeModal({ onSave, onCancel }: AddTradeModalProps) {
  // Form State
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [investmentId, setInvestmentId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('0');

  // Data for Dropdowns
  const [investments, setInvestments] = useState<InvestmentDropdownItem[]>([]);
  const [investmentAccounts, setInvestmentAccounts] = useState<Account[]>([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // --- NEW STATE for nested modal ---
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);

  // --- Extracted fetch logic to be reusable ---
  const fetchInvestmentsList = async () => {
    const { data: investmentsData } = await supabase
      .from('investments')
      .select('investment_id, name')
      .order('name');
    if (investmentsData) setInvestments(investmentsData);
  };
  
  // Fetch data for dropdowns on load
  useEffect(() => {
    const fetchAccountsList = async () => {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('type', 'investment')
        .order('account_name');
      if (accountsData) setInvestmentAccounts(accountsData as Account[]);
    };

    fetchInvestmentsList();
    fetchAccountsList();
  }, []);

  // --- NEW HANDLER for when a new investment is saved ---
  const handleInvestmentAdded = (newInvestment: Investment) => {
    // 1. Refresh the investment list
    fetchInvestmentsList();
    // 2. Close the nested modal
    setIsAddInvestmentOpen(false);
    // 3. Auto-select the new investment in the dropdown
    setInvestmentId(newInvestment.investment_id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('fn_log_trade', {
      p_trade_type: tradeType,
      p_investment_id: investmentId,
      p_account_id: accountId,
      p_quantity: parseFloat(quantity),
      p_price: parseFloat(price),
      p_commission: parseFloat(commission) || 0,
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
    <>
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="trade-type">Trade Type</label>
          <select
            id="trade-type"
            className={styles.input}
            value={tradeType}
            onChange={(e) => setTradeType(e.target.value as 'BUY' | 'SELL')}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="investment-id">Investment</label>
          {/* --- NEW: Added flex wrapper and button --- */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              id="investment-id"
              className={styles.input}
              value={investmentId}
              onChange={(e) => setInvestmentId(e.target.value)}
              required
              style={{ flexGrow: 1 }}
            >
              <option value="" disabled>Select an investment</option>
              {investments.map(inv => (
                <option key={inv.investment_id} value={inv.investment_id}>
                  {inv.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.addButton}
              style={{ padding: '0 0.75rem' }}
              onClick={() => setIsAddInvestmentOpen(true)}
            >
              <FaPlus />
            </button>
          </div>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="account-id">Cash Account</label>
          <select
            id="account-id"
            className={styles.input}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="" disabled>Select a cash account</option>
            {investmentAccounts.map(acc => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_name} ({formatCurrency(acc.current_balance)})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            className={styles.input}
            type="number"
            step="any" // Allow for fractional shares
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 3.5"
            required
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="price">Price per Share</label>
          <input
            id="price"
            className={styles.input}
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 150.25"
            required
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="commission">Commission / Fee</label>
          <input
            id="commission"
            className={styles.input}
            type="number"
            step="0.01"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            placeholder="e.g., 1.00"
            required
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}
        
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? 'Logging...' : 'Log Trade'}
          </button>
        </div>
      </form>

      {/* --- NEW: Nested Modal for Adding an Investment --- */}
      <Modal
        isOpen={isAddInvestmentOpen}
        onClose={() => setIsAddInvestmentOpen(false)}
        title="Add New Investment Holding"
      >
        <AddInvestmentForm
          investmentToEdit={null}
          onSave={handleInvestmentAdded}
          onCancel={() => setIsAddInvestmentOpen(false)}
        />
      </Modal>
    </>
  );
}

export default AddTradeModal;