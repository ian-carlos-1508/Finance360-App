/* Replace file: src/components/Investments/InvestmentManager.tsx */

import { useState, useEffect } from 'react';
import listStyles from './InvestmentList.module.css';
import sharedStyles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../Modal/Modal';
// --- NEW: Added HiCalendarDays ---
import { HiPlus, HiPencil, HiTrash, HiExclamationTriangle, HiCalendarDays } from 'react-icons/hi2';
import AddInvestmentForm, { type Investment } from './AddInvestmentForm';
import AddTradeModal from './AddTradeModal';
import { formatCurrency } from '../../lib/utils';
// --- NEW: Import snapshot modal ---
import AddInvestmentSnapshotModal from './AddInvestmentSnapshotModal';

interface InvestmentManagerProps {
  onDataUpdated: () => void;
}

function InvestmentManager({ onDataUpdated }: InvestmentManagerProps) {
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // --- NEW: State for snapshot modal ---
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [investmentToLog, setInvestmentToLog] = useState<Investment | null>(null);

  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInvestments = async () => {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching investments:', error);
      setError('Could not fetch investments.');
    } else {
      setInvestments(data || []);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  // --- Modal Handlers ---
  const handleAddNew = () => {
    setEditingInvestment(null);
    setIsEditModalOpen(true);
  };
  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setIsEditModalOpen(true);
  };
  const handleDelete = (investment: Investment) => {
    setInvestmentToDelete(investment);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setInvestmentToDelete(null);
    setError('');
  };

  const handleSaveSuccess = () => {
    fetchInvestments();
    onDataUpdated();
    setIsEditModalOpen(false);
    setEditingInvestment(null);
  };

  const handleTradeSuccess = () => {
    fetchInvestments();
    onDataUpdated();
    setIsTradeModalOpen(false);
  };

  // --- NEW: Snapshot modal handlers ---
  const handleOpenSnapshotModal = (investment: Investment) => {
    setInvestmentToLog(investment);
    setIsSnapshotModalOpen(true);
  };

  const handleCloseSnapshotModal = () => {
    setInvestmentToLog(null);
    setIsSnapshotModalOpen(false);
  };

  const handleSnapshotSaved = () => {
    fetchInvestments(); // Refetch investments to get new current_price
    onDataUpdated(); // Refresh dashboard KPIs
    handleCloseSnapshotModal();
  };

  const handleConfirmDelete = async () => {
    if (!investmentToDelete) return;
    setLoading(true);

    const { error } = await supabase
      .from('investments')
      .delete()
      .match({ investment_id: investmentToDelete.investment_id });

    if (error) {
      setError(error.message);
    } else {
      await fetchInvestments();
      onDataUpdated();
      handleCloseDeleteModal();
    }
    setLoading(false);
  };

  return (
    <div className={sharedStyles.tabContent}>
      <div className={sharedStyles.listHeader}>
        <h3 className={sharedStyles.listTitle}>My Investments</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className={sharedStyles.addButton}
            onClick={() => setIsTradeModalOpen(true)}
            style={{ backgroundColor: '#42A5F5' }}
          >
            Log Trade (Buy/Sell)
          </button>
          <button className={sharedStyles.addButton} onClick={handleAddNew}>
            <HiPlus /> Add New Holding
          </button>
        </div>
      </div>

      {error && <p className={sharedStyles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}

      {/* --- Investment Table --- */}
      <div className={listStyles.tableWrapper}>
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Ticker</th>
              <th>Type</th>
              <th className={listStyles.right}>Quantity</th>
              <th className={listStyles.right}>Avg. Price</th>
              <th className={listStyles.right}>Current Price</th>
              <th className={listStyles.right}>Current Value</th>
              <th className={listStyles.right}>P/L</th>
              <th className={listStyles.right}>% P/L</th>
              <th className={listStyles.right}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {investments.length === 0 ? (
              <tr><td colSpan={10} style={{textAlign: 'center', padding: '1rem'}}>No investments found.</td></tr>
            ) : (
              investments.map((inv) => {
                const currentValue = inv.current_price * inv.quantity;
                const costBasis = inv.average_price * inv.quantity;
                const pl = currentValue - costBasis;
                const plPercent = (costBasis === 0) ? 0 : (pl / costBasis) * 100;
                const isPositive = pl >= 0;

                return (
                  <tr key={inv.investment_id}>
                    <td><strong>{inv.name}</strong></td>
                    <td>{inv.ticker || '---'}</td>
                    <td>{inv.type}</td>
                    <td className={listStyles.right}>{inv.quantity}</td>
                    <td className={listStyles.right}>{formatCurrency(inv.average_price)}</td>
                    <td className={listStyles.right}>{formatCurrency(inv.current_price)}</td>
                    <td className={listStyles.right}><strong>{formatCurrency(currentValue)}</strong></td>
                    <td className={`${listStyles.right} ${isPositive ? listStyles.positive : listStyles.negative}`}>
                      {pl.toLocaleString(undefined, { signDisplay: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`${listStyles.right} ${isPositive ? listStyles.positive : listStyles.negative}`}>
                      {plPercent.toFixed(2)}%
                    </td>
                    <td className={listStyles.actions}>
                      {/* --- NEW: Log New Value Button --- */}
                      <button 
                        className={sharedStyles.iconButton} 
                        onClick={() => handleOpenSnapshotModal(inv)}
                        title="Log New Value"
                      >
                        <HiCalendarDays />
                      </button>
                      <button className={sharedStyles.iconButton} onClick={() => handleEdit(inv)} title="Edit">
                        <HiPencil />
                      </button>
                      <button className={sharedStyles.iconButtonDanger} onClick={() => handleDelete(inv)} title="Delete">
                        <HiTrash />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingInvestment ? 'Edit Investment' : 'Add New Investment'}
      >
        <AddInvestmentForm 
          investmentToEdit={editingInvestment}
          onSave={handleSaveSuccess}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        title="Log a New Trade"
      >
        <AddTradeModal 
          onSave={handleTradeSuccess}
          onCancel={() => setIsTradeModalOpen(false)}
        />
      </Modal>
      
      {/* --- NEW: Snapshot Modal --- */}
      {investmentToLog && (
        <Modal
          isOpen={isSnapshotModalOpen}
          onClose={handleCloseSnapshotModal}
          title="Log New Investment Value"
          isNested={true}
        >
          <AddInvestmentSnapshotModal
            investment={investmentToLog}
            onSave={handleSnapshotSaved}
            onCancel={handleCloseSnapshotModal}
          />
        </Modal>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        <div className={sharedStyles.deleteModalContent}>
          <HiExclamationTriangle className={sharedStyles.warningIcon} />
          <p className={sharedStyles.deleteModalText}>
            Are you sure you want to delete this investment?
          </p>
          <p className={sharedStyles.deleteModalText}>
            <strong>{investmentToDelete?.name}</strong>
          </p>
          {error && <p className={sharedStyles.errorText} style={{marginTop: '1rem'}}>{error}</p>}
          <div className={sharedStyles.modalFooter}>
            <button
              type="button"
              className={sharedStyles.cancelButton}
              onClick={handleCloseDeleteModal}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={sharedStyles.deleteButton}
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

export default InvestmentManager;