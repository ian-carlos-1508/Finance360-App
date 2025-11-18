/* Replace file: src/components/Categories/AddCategoryForm.tsx */

import React, { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

// --- REVERTED ---
// Back to the original type, without nw_type
export type Category = {
  category_id: string;
  category: string;
  subcategory: string | null;
  type: 'Income' | 'Expense';
};

interface AddCategoryFormProps {
  categoryToEdit: Category | null;
  defaultType?: 'Income' | 'Expense'; 
  onSave: (newCategory: Category) => void;
  onCancel: () => void;
}

function AddCategoryForm({ categoryToEdit, defaultType, onSave, onCancel }: AddCategoryFormProps) {
  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'Income' | 'Expense'>(
    defaultType || 'Expense'
  );
  // --- REMOVED nwType state ---

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form if editing
  useEffect(() => {
    if (categoryToEdit) {
      setCategoryName(categoryToEdit.category);
      setSubcategoryName(categoryToEdit.subcategory || '');
      setCategoryType(categoryToEdit.type);
      // --- REMOVED nwType logic ---
    } else {
      // Clear form for "add new"
      setCategoryName('');
      setSubcategoryName('');
      setCategoryType(defaultType || 'Expense');
    }
  }, [categoryToEdit, defaultType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- REVERTED ---
    const categoryData = {
      category: categoryName,
      subcategory: subcategoryName || null,
      type: categoryType,
      // --- REMOVED nw_type from data object ---
    };
    
    let savedCategory: Category | null = null;
    let dbError: any = null;

    if (categoryToEdit) {
      // UPDATE
      const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .match({ category_id: categoryToEdit.category_id })
        .select()
        .single();
      savedCategory = data;
      dbError = error;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();
      savedCategory = data;
      dbError = error;
    }

    if (dbError) {
      setError(dbError.message);
    } else if (savedCategory) {
      onSave(savedCategory);
    }
    setLoading(false);
  };

  return (
    <form className={styles.modalForm} onSubmit={handleSave}>
      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="category-name">
          Category Name
        </label>
        <input
          id="category-name"
          className={styles.input}
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g., Food, Transport"
          required
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="subcategory-name">
          Subcategory
        </label>
        <input
          id="subcategory-name"
          className={styles.input}
          type="text"
          value={subcategoryName}
          onChange={(e) => setSubcategoryName(e.target.value)}
          placeholder="e.g., Groceries, Uber (Optional)"
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="category-type">
          Category Type
        </label>
        <select
          id="category-type"
          className={styles.input}
          value={categoryType}
          onChange={(e) =>
            setCategoryType(e.target.value as 'Income' | 'Expense')
          }
          disabled={!!defaultType} 
        >
          <option value="Expense">Expense</option>
          <option value="Income">Income</option>
        </select>
      </div>
      
      {/* --- REMOVED conditional N/W section --- */}
      
      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.modalFooter}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={loading}
        >
          {loading ? 'Saving...' : (categoryToEdit ? 'Save Changes' : 'Save Category')}
        </button>
      </div>
    </form>
  );
}

export default AddCategoryForm;