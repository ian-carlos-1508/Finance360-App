import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
// NEW: Import our reusable form
import AddCategoryForm from '../Categories/AddCategoryForm';

// This type is now shared
export type Category = {
  category_id: string;
  category: string;
  subcategory: string | null;
  type: 'Income' | 'Expense';
};

interface CategoryManagerProps {
  onDataUpdated: () => void;
  categories: Category[];
  fetchCategories: () => void;
}

function CategoryManager({ onDataUpdated, categories, fetchCategories }: CategoryManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Modal Open/Close Handlers ---
  const handleAddNew = () => {
    setEditingCategory(null);
    setIsEditModalOpen(true);
  };
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };
  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCategoryToDelete(null);
    setError('');
  };

  // --- NEW: This is called by the form on a successful save ---
  const handleSaveSuccess = () => {
    fetchCategories(); // Tell parent to re-fetch list
    onDataUpdated();   // Tell parent to re-calculate KPIs
    setIsEditModalOpen(false);
    setEditingCategory(null);
  };
  
  // --- This logic is now simplified ---
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setLoading(true);
    
    // Check for transactions
    const { data, error: txError } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('category_id', categoryToDelete.category_id)
      .limit(1);

    if (txError) {
      setError(txError.message);
      setLoading(false);
      return;
    }
    if (data && data.length > 0) {
      setError('Cannot delete category: it has transactions linked to it.');
      setLoading(false);
      return;
    }

    // Proceed with delete
    const { error } = await supabase
      .from('categories')
      .delete()
      .match({ category_id: categoryToDelete.category_id });

    if (error) {
      setError(error.message);
    } else {
      await fetchCategories();
      onDataUpdated();
      handleCloseDeleteModal();
    }
    setLoading(false);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>My Categories</h3>
        <button className={styles.addButton} onClick={handleAddNew}>
          <HiPlus /> Add New
        </button>
      </div>
      
      {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      <ul className={styles.list}>
        {categories.length === 0 ? (
          <li className={styles.listItem}>No categories found.</li>
        ) : (
          categories.map((cat) => (
            <li key={cat.category_id} className={styles.listItem}>
              <div>
                <p>
                  <strong>{cat.category}</strong>
                  {cat.subcategory && (
                    <span className={styles.listItemSubtext}>
                      {' / ' + cat.subcategory}
                    </span>
                  )}
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <p className={styles.listItemSubtext} style={{ minWidth: '50px' }}>
                  {cat.type}
                </p>
                <button className={styles.iconButton} onClick={() => handleEdit(cat)}>
                  <HiPencil />
                </button>
                <button className={styles.iconButtonDanger} onClick={() => handleDelete(cat)}>
                  <HiTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* --- UPDATED: EDIT/ADD MODAL --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
      >
        <AddCategoryForm 
          categoryToEdit={editingCategory}
          onSave={handleSaveSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* --- DELETE CONFIRMATION MODAL (Unchanged) --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this category?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{categoryToDelete?.category}</strong>
          </p>
          <p className={styles.deleteModalText} style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '1rem'}}>
            Note: Categories with transactions cannot be deleted.
          </p>

          {error && <p className={styles.errorText} style={{marginTop: '1rem'}}>{error}</p>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCloseDeleteModal}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CategoryManager;