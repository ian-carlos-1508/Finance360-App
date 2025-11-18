import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css'; // Use master CSS
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle } from 'react-icons/hi2';
import AddRealEstateForm, { type RealEstate } from './AddRealEstateForm';

interface RealEstateManagerProps {
  onDataUpdated: () => void;
}

function RealEstateManager({ onDataUpdated }: RealEstateManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstate | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<RealEstate | null>(null);
  
  const [properties, setProperties] = useState<RealEstate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRealEstate = async () => {
    const { data, error } = await supabase
      .from('real_estate')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching real estate:', error);
      setError('Could not fetch properties.');
    } else {
      setProperties(data || []);
    }
  };

  useEffect(() => {
    fetchRealEstate();
  }, []);

  // --- Modal Handlers ---
  const handleAddNew = () => {
    setEditingProperty(null);
    setIsEditModalOpen(true);
  };
  const handleEdit = (property: RealEstate) => {
    setEditingProperty(property);
    setIsEditModalOpen(true);
  };
  const handleDelete = (property: RealEstate) => {
    setPropertyToDelete(property);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPropertyToDelete(null);
    setError('');
  };
  
  const handleSaveSuccess = () => {
    fetchRealEstate();
    onDataUpdated();
    setIsEditModalOpen(false);
    setEditingProperty(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('real_estate')
      .delete()
      .match({ property_id: propertyToDelete.property_id });

    if (error) {
      setError(error.message);
    } else {
      await fetchRealEstate();
      onDataUpdated();
      handleCloseDeleteModal();
    }
    setLoading(false);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>My Real Estate</h3>
        <button className={styles.addButton} onClick={handleAddNew}>
          <HiPlus /> Add New
        </button>
      </div>
      
      {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      {/* We re-use the standard "listItem" from the master CSS */}
      <ul className={styles.list}>
        {properties.length === 0 ? (
          <li className={styles.listItem}>No properties found.</li>
        ) : (
          properties.map((prop) => (
            <li key={prop.property_id} className={styles.listItem}>
              <div>
                <p>
                  <strong>{prop.name}</strong>
                  <br />
                  <span className={styles.listItemSubtext}>
                    {prop.address || 'No address'}
                  </span>
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <p>
                  ${prop.market_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <button className={styles.iconButton} onClick={() => handleEdit(prop)}>
                  <HiPencil />
                </button>
                <button className={styles.iconButtonDanger} onClick={() => handleDelete(prop)}>
                  <HiTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* --- EDIT/ADD MODAL --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingProperty ? 'Edit Property' : 'Add New Property'}
      >
        <AddRealEstateForm 
          propertyToEdit={editingProperty}
          onSave={handleSaveSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        <div className={styles.deleteModalContent}>
          <HiExclamationTriangle className={styles.warningIcon} />
          <p className={styles.deleteModalText}>
            Are you sure you want to delete this property?
          </p>
          <p className={styles.deleteModalText}>
            <strong>{propertyToDelete?.name}</strong>
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

export default RealEstateManager;