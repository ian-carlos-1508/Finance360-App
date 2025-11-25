/* Replace file: src/pages/Goals/AddGoalModal.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal/Modal';
import { type Account } from '../../components/Accounts/AddAccountForm';
import { formatCurrency } from '../../lib/utils';
import { type Goal } from './types'; 

// --- GAMIFICATION IMPORTS ---
import { useGamificationToast } from '../../context/GamificationToastContext';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';

// --- Type Definitions ---
type Debt = {
  id: string;
  name: string;
  type: 'Debt' | 'Credit Card';
};

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  goalToEdit: Goal | null;
}

function AddGoalModal({ isOpen, onClose, onSave, goalToEdit }: AddGoalModalProps) {
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalType, setGoalType] = useState<string>('Savings');
  
  const [linkedAccountId, setLinkedAccountId] = useState('manual');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [monthlyContribution, setMonthlyContribution] = useState('0');

  const [savingsAccounts, setSavingsAccounts] = useState<Account[]>([]);
  const [allDebts, setAllDebts] = useState<Debt[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- GAMIFICATION HOOKS ---
  const { showXpToast } = useGamificationToast();
  const { refreshJourney } = useFinancialJourney();

  useEffect(() => {
    if (!isOpen) return;

    const fetchDropdownData = async () => {
      setLoading(true);
      // 1. Fetch Savings
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('type', 'cash');
      if (accounts) setSavingsAccounts(accounts);

      // 2. Fetch Debts (Cards + Loans)
      const { data: creditCards } = await supabase
        .from('accounts')
        .select('account_id, account_name')
        .eq('type', 'credit');
      
      const { data: loans } = await supabase
        .from('debts')
        .select('debt_id, debt_name');

      const combinedDebts: Debt[] = [];
      if (creditCards) {
        creditCards.forEach(cc => combinedDebts.push({ id: cc.account_id, name: cc.account_name, type: 'Credit Card' }));
      }
      if (loans) {
        loans.forEach(loan => combinedDebts.push({ id: loan.debt_id, name: loan.debt_name, type: 'Debt' }));
      }
      setAllDebts(combinedDebts);
      setLoading(false);
    };

    fetchDropdownData();
  }, [isOpen]);

  useEffect(() => {
    if (goalToEdit) {
      setGoalName(goalToEdit.goal_name);
      setTargetAmount(goalToEdit.target_amount.toString());
      setTargetDate(goalToEdit.target_date || '');
      setGoalType(goalToEdit.goal_type);
      setLinkedAccountId(goalToEdit.linked_account_id || 'manual');
      setCurrentAmount(goalToEdit.current_amount.toString());
      setMonthlyContribution(goalToEdit.monthly_contribution?.toString() || '0');
    } else {
      setGoalName('');
      setTargetAmount('');
      setTargetDate('');
      setGoalType('Savings');
      setLinkedAccountId('manual');
      setCurrentAmount('0');
      setMonthlyContribution('0');
    }
  }, [goalToEdit, isOpen]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleGoalTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGoalType(e.target.value);
    setLinkedAccountId('manual');
    setCurrentAmount('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const dataToSave = {
      goal_name: goalName,
      target_amount: parseFloat(targetAmount),
      target_date: targetDate || null,
      goal_type: goalType,
      linked_account_id: linkedAccountId === 'manual' ? null : linkedAccountId,
      current_amount: linkedAccountId === 'manual' ? parseFloat(currentAmount) : 0,
      monthly_contribution: parseFloat(monthlyContribution) || 0,
    };

    let query;
    if (goalToEdit) {
      query = supabase.from('goals').update(dataToSave).eq('goal_id', goalToEdit.goal_id);
    } else {
      query = supabase.from('goals').insert(dataToSave);
    }

    const { error: dbError } = await query;
    if (dbError) {
      setError(dbError.message);
    } else {
      // --- GAMIFICATION TRIGGER ---
      // We need to check the ACTUAL current balance to see if they won
      let actualCurrent = parseFloat(currentAmount);
      const target = parseFloat(targetAmount);

      if (linkedAccountId !== 'manual') {
         // If linked, fetch the real balance from DB to check progress
         // (Note: Credit cards/debts use negative balance, so we use ABS)
         const { data: acc } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('account_id', linkedAccountId)
            .single();
         
         if (acc) {
            actualCurrent = Math.abs(acc.current_balance); 
         }
      }

      if (actualCurrent >= target) {
         showXpToast(100, "GOAL CRUSHED! 🏆");
         refreshJourney(); // Trigger sidebar update
      } else if (!goalToEdit) {
         showXpToast(10, "Goal Set! 🎯");
         refreshJourney();
      }

      onSave();
      handleClose();
    }
    setLoading(false);
  };

  const renderTrackingOptions = () => {
    if (goalType === 'Savings') {
      return (
        <select
          name="linked_account_id"
          className={styles.input}
          value={linkedAccountId}
          onChange={(e) => setLinkedAccountId(e.target.value)}
        >
          <option value="manual">Track Manually</option>
          {savingsAccounts.map(acc => (
            <option key={acc.account_id} value={acc.account_id}>
              Link to: {acc.account_name} ({formatCurrency(acc.current_balance)})
            </option>
          ))}
        </select>
      );
    }
    if (goalType === 'Debt Payoff') {
      return (
        <select
          name="linked_account_id"
          className={styles.input}
          value={linkedAccountId}
          onChange={(e) => setLinkedAccountId(e.target.value)}
        >
          <option value="manual">Track Manually</option>
          {allDebts.map(debt => (
            <option key={debt.id} value={debt.id}>
              Link to: {debt.name} ({debt.type})
            </option>
          ))}
        </select>
      );
    }
    return (
      <select className={styles.input} disabled>
        <option>Select a goal type first</option>
      </select>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={goalToEdit ? 'Edit Goal' : 'Add New Goal'}
    >
      <form className={styles.modalForm} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.label}>Goal Name</label>
          <input
            name="goal_name"
            className={styles.input}
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g., New Car Fund"
            required
          />
        </div>
        
        <div className={styles.formRow}>
          <label className={styles.label}>Goal Type</label>
          <select
            name="goal_type"
            className={styles.input}
            value={goalType}
            onChange={handleGoalTypeChange}
          >
            <option value="Savings">Savings Goal</option>
            <option value="Debt Payoff">Debt Payoff Goal</option>
          </select>
        </div>

        <div className={styles.formRow}>
          <label className={styles.label}>Target Amount</label>
          <input
            name="target_amount"
            className={styles.input}
            type="number"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="10000"
            required
          />
        </div>
        
        <div className={styles.formRow}>
          <label className={styles.label}>Target Date</label>
          <input
            name="target_date"
            className={styles.input}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <hr style={{border: 'none', borderTop: '1px solid #e5e7eb'}} />
        <h4 className={styles.listTitle} style={{margin: 0}}>How to Fund It?</h4>

        <div className={styles.formRow}>
          <label className={styles.label}>Track Progress</label>
          {renderTrackingOptions()}
        </div>

        {linkedAccountId === 'manual' && (
          <div className={styles.formRow}>
            <label className={styles.label}>Current Amount</label>
            <input
              name="current_amount"
              className={styles.input}
              type="number"
              step="0.01"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              required
            />
          </div>
        )}

        <div className={styles.formRow}>
          <label className={styles.label}>Monthly Contribution</label>
          <input
            name="monthly_contribution"
            className={styles.input}
            type="number"
            step="0.01"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="e.g., 200"
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>Cancel</button>
          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? 'Saving...' : 'Save Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddGoalModal;