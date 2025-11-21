/* Replace file: src/pages/Goals/Goals.tsx */

import React, { useState, useEffect } from 'react';
import styles from './Goals.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { HiBanknotes, HiShieldCheck } from 'react-icons/hi2';
import { HiTrendingUp, HiFlag } from 'react-icons/hi';
import Modal from '../../components/Modal/Modal';
import AddGoalModal from './AddGoalModal'; 
import { type Goal } from './types'; 

// NEW: Import BackToHub
import BackToHub from '../../components/Navigation/BackToHub'; 

// --- Goal Card Component ---
interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onEdit, onDelete }) => {
  const progress = (goal.current_amount / goal.target_amount) * 100;
  const progressPercent = Math.min(progress, 100).toFixed(0);

  const getGoalIcon = () => {
    switch(goal.goal_type) {
      case 'Savings': return <HiBanknotes />;
      case 'Debt Payoff': return <HiShieldCheck />;
      case 'Investment': return <HiTrendingUp />;
      default: return <HiFlag />; // Fallback icon
    }
  };

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalHeader}>
        <h3 className={styles.goalName}>{getGoalIcon()} {goal.goal_name}</h3>
        <div className={styles.goalActions}>
          <button className={sharedStyles.iconButton} onClick={() => onEdit(goal)}>
            <FaEdit />
          </button>
          <button className={sharedStyles.iconButtonDanger} onClick={() => onDelete(goal)}>
            <FaTrash />
          </button>
        </div>
      </div>
      {goal.target_date && (
        <p className={styles.goalDate}>
          Target: {new Date(goal.target_date + 'T12:00:00').toLocaleDateString()}
        </p>
      )}

      <div className={styles.goalProgress}>
        <div className={styles.progressHeader}>
          <span className={styles.currentAmount}>
            {formatCurrency(goal.current_amount)}
          </span>
          <span className={styles.targetAmount}>
            / {formatCurrency(goal.target_amount)}
          </span>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={styles.progressPercent}>{progressPercent}% Complete</p>
      </div>
    </div>
  );
};

// --- Main Page Component ---
function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // For the KPIs
  const [totalTarget, setTotalTarget] = useState(0);
  const [totalCurrent, setTotalCurrent] = useState(0);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('fn_get_goals_with_progress');
    if (error) {
      setError(error.message);
      console.error("Error fetching goals:", error);
    } else {
      const goalsData = data as Goal[];
      setGoals(goalsData);
      
      // Calculate KPIs
      let targetSum = 0;
      let currentSum = 0;
      goalsData.forEach(goal => {
        targetSum += goal.target_amount;
        currentSum += goal.current_amount;
      });
      setTotalTarget(targetSum);
      setTotalCurrent(currentSum);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenAddModal = () => {
    setGoalToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: Goal) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (goal: Goal) => {
    setGoalToDelete(goal);
    setIsDeleteModalOpen(true);
  };

  const handleSave = () => {
    setIsModalOpen(false);
    fetchGoals(); // Refresh all data
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    setLoading(true);
    const { error: dbError } = await supabase.from('goals').delete().eq('goal_id', goalToDelete.goal_id);
    if (dbError) {
      setError(dbError.message);
    } else {
      setIsDeleteModalOpen(false);
      setGoalToDelete(null);
      fetchGoals(); // Refresh all data
    }
    setLoading(false);
  };

  const overallProgress = (totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0).toFixed(1);

  return (
    <div>
      {/* NEW: Back to Hub Navigation */}
      <BackToHub to="/build" label="Back to Fortress Dashboard" />

      <div className={sharedStyles.listHeader}>
        <h1 className={sharedStyles.title} style={{ marginBottom: 0 }}>My Goals</h1>
        <button className={sharedStyles.addButton} onClick={handleOpenAddModal}>
          <FaPlus /> Add New Goal
        </button>
      </div>

      {error && <p className={sharedStyles.errorText}>{error}</p>}

      {/* --- Goal Overview KPIs --- */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Total Goals Value</h3>
          <p className={styles.kpiValue}>{formatCurrency(totalTarget)}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Total Saved</h3>
          <p className={styles.kpiValue}>{formatCurrency(totalCurrent)}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Overall Progress</h3>
          <p className={styles.kpiValue}>{overallProgress}%</p>
        </div>
      </div>

      {/* --- Active Goals Dashboard --- */}
      <h2 className={sharedStyles.cardTitle} style={{border: 'none', padding: 0, margin: '2rem 0 1rem 0'}}>
        Active Goals
      </h2>
      <div className={styles.goalGrid}>
        {loading ? (
          <p>Loading goals...</p>
        ) : (
          goals.map(goal => (
            <GoalCard 
              key={goal.goal_id} 
              goal={goal} 
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteModal}
            />
          ))
        )}
        <div className={styles.addGoalCard} onClick={handleOpenAddModal}>
          <div className={styles.addGoalContent}>
            <FaPlus />
            <p>Add New Goal</p>
          </div>
        </div>
      </div>

      {/* --- Add/Edit Modal --- */}
      {isModalOpen && (
        <AddGoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          goalToEdit={goalToEdit}
        />
      )}

      {/* --- Delete Confirmation Modal --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className={sharedStyles.deleteModalContent}>
          <FaTrash style={{ color: '#ef4444', fontSize: '2.5rem', marginBottom: '1rem' }} />
          <p className={sharedStyles.deleteModalText}>
            Are you sure you want to delete this goal?
          </p>
          <p className={sharedStyles.deleteModalText}>
            <strong>{goalToDelete?.goal_name}</strong>
          </p>
          {error && <p className={sharedStyles.errorText}>{error}</p>}
          <div className={sharedStyles.modalFooter} style={{ justifyContent: 'center' }}>
            <button className={sharedStyles.cancelButton} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button className={sharedStyles.deleteButton} onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default GoalsPage;