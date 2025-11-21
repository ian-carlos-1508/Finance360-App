/* File: src/pages/Transactions/TransactionHub.tsx */

// FIX: Removed 'useEffect' from imports
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../Settings/Settings.module.css';

import ExpensesPage from '../Expenses/Expenses';
import IncomePage from '../Income/Income';
import TransfersPage from '../Transfers/Transfers';

type TabType = 'EXPENSES' | 'INCOME' | 'TRANSFERS';

const TransactionHubPage: React.FC = () => {
  const location = useLocation();
  
  // Check navigation state for defaultTab, otherwise default to EXPENSES
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const state = location.state as { defaultTab?: TabType };
    return state?.defaultTab || 'EXPENSES';
  });

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className={styles.title}>Track Transactions</h1>
        <p className="text-sm text-gray-500 mb-4">
          Log your daily activity to ensure your Cash Flow and Budget data is accurate.
        </p>

        {/* Tab Navigation */}
        <div className={styles.tabHeader} style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            className={activeTab === 'EXPENSES' ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setActiveTab('EXPENSES')}
          >
            Expenses
          </button>
          
          <button
            className={activeTab === 'INCOME' ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setActiveTab('INCOME')}
          >
            Income
          </button>

          <button
            className={activeTab === 'TRANSFERS' ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setActiveTab('TRANSFERS')}
          >
            Transfers
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'EXPENSES' && <ExpensesPage />}
        {activeTab === 'INCOME' && <IncomePage />}
        {activeTab === 'TRANSFERS' && <TransfersPage />}
      </div>
    </div>
  );
};

export default TransactionHubPage;