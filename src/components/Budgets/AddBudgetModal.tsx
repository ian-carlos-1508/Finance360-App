/* Replace file: src/components/Budgets/AddBudgetModal.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import budgetStyles from '../../pages/Budgets/Budgets.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import TooltipInfo from '../Tooltip/TooltipInfo'; // <-- NEW: Import Tooltip

// Types
type SubCategory = {
  category_id: string;
  category: string;
  subcategory: string | null;
};
type MainCategory = string;

// Budget type from our DB (now has new fields)
type Budget = {
  budget_id: string;
  month: number;
  year: number;
  budgeted_amount: number;
  category_id: string | null; 
  main_category: string | null; 
  allow_rollover: boolean; // NEW FIELD
};

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetAdded: () => void;
  budgetToEdit: Budget | null;
}

function AddBudgetModal({
  isOpen,
  onClose,
  onBudgetAdded,
  budgetToEdit,
}: AddBudgetModalProps) {
  // Form state
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(new Date().getFullYear());
  const [allowRollover, setAllowRollover] = useState(false); // NEW STATE
  
  const [budgetLevel, setBudgetLevel] = useState<'main' | 'sub'>('main');
  const [mainCategory, setMainCategory] = useState<string>('');
  const [subCategoryId, setSubCategoryId] = useState<string>('');

  // Data state
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch expense categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        const { data } = await supabase
          .from('categories')
          .select('category_id, category, subcategory')
          .eq('type', 'Expense');
          
        if (data) {
          setSubCategories(data);
          const uniqueMain = [...new Set(data.map(c => c.category))];
          setMainCategories(uniqueMain);
        }
      };
      fetchCategories();
      
      // Pre-fill form if editing
      if (budgetToEdit) {
        setAmount(budgetToEdit.budgeted_amount.toString());
        setMonth(budgetToEdit.month);
        setYear(budgetToEdit.year);
        setAllowRollover(budgetToEdit.allow_rollover || false); // Set toggle state
        
        if (budgetToEdit.main_category) {
          setBudgetLevel('main');
          setMainCategory(budgetToEdit.main_category);
          setSubCategoryId('');
        } else {
          setBudgetLevel('sub');
          setMainCategory('');
          setSubCategoryId(budgetToEdit.category_id || '');
        }
      } else {
        // Reset form for "Add New"
        setAmount('');
        setMonth(new Date().getMonth() + 1);
        setYear(new Date().getFullYear());
        setBudgetLevel('main');
        setMainCategory('');
        setSubCategoryId('');
        setAllowRollover(false); // Reset toggle
      }
    }
  }, [isOpen, budgetToEdit]);

  const clearForm = () => {
    setAmount('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setBudgetLevel('main');
    setMainCategory('');
    setSubCategoryId('');
    setAllowRollover(false);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const budgetData = {
      month: Number(month),
      year: Number(year),
      budgeted_amount: parseFloat(amount),
      main_category: budgetLevel === 'main' ? mainCategory : null,
      category_id: budgetLevel === 'sub' ? subCategoryId : null,
      allow_rollover: allowRollover, // Add new value
    };
    
    let dbError: any = null;

    if (budgetToEdit) {
      const { error } = await supabase
        .from('budgets')
        .update(budgetData)
        .match({ budget_id: budgetToEdit.budget_id });
      dbError = error;
    } else {
      const { error } = await supabase.from('budgets').insert(budgetData);
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else {
      clearForm();
      onBudgetAdded();
      onClose();
    }
    setLoading(false);
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = [2024, 2025, 2026];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={budgetToEdit ? 'Edit Budget' : 'Add New Budget'}
    >
      <form className={styles.modalForm} onSubmit={handleSave}>
        
        {/* --- Budget Level Selector --- */}
        <div className={styles.formRow}>
          <label className={styles.label}>Budget Level</label>
          <select
            className={styles.input}
            value={budgetLevel}
            onChange={(e) => setBudgetLevel(e.target.value as 'main' | 'sub')}
            disabled={!!budgetToEdit} // Can't change level when editing
          >
            <option value="main">By Main Category (e.g., Food)</option>
            <option value="sub">By Subcategory (e.g., Restaurants)</option>
          </select>
        </div>

        {/* --- Conditional Category Dropdowns --- */}
        {budgetLevel === 'main' ? (
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="main-category">Main Category</label>
            <select
              id="main-category"
              className={styles.input}
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              required
            >
              <option value="" disabled>Select a main category</option>
              {mainCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="sub-category">Subcategory</label>
            <select
              id="sub-category"
              className={styles.input}
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>Select a subcategory</option>
              {subCategories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category}{cat.subcategory ? ` / ${cat.subcategory}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="amount">Amount</label>
          <input
            id="amount"
            className={styles.input}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="month">Month</label>
          <select
            id="month"
            className={styles.input}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            required
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="year">Year</label>
          <select
            id="year"
            className={styles.input}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            required
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* --- UPDATED: Allow Rollover Toggle --- */}
        <div className={styles.formRow}>
            {/* This label now uses flex to align the text and icon.
              The <TooltipInfo> component replaces the old span.
            */}
            <label 
              className={styles.label} 
              htmlFor="allow_rollover"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>Allow Rollover</span>
              <TooltipInfo>
                If enabled, any unused (or overspent) amount from the previous month will be carried over to this month's available balance.
              </TooltipInfo>
            </label>
            <input
                id="allow_rollover"
                type="checkbox"
                className={budgetStyles.toggleSwitch} 
                checked={allowRollover}
                onChange={(e) => setAllowRollover(e.target.checked)}
            />
        </div>

        {error && <p className={styles.errorText}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? 'Saving...' : (budgetToEdit ? 'Save Changes' : 'Save Budget')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddBudgetModal;