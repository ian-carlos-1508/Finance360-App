/* Replace file: src/components/Transactions/RecentTransactions.tsx */

import React from 'react';
import styles from './RecentTransactions.module.css';
import sharedStyles from '../../pages/Settings/Settings.module.css';
import { HiPencil, HiTrash } from 'react-icons/hi2';
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';

export type Transaction = {
  transaction_id: string;
  date: string; // This is a "YYYY-MM-DD" string
  description: string | null;
  amount: number;
  account_id: string;
  category_id: string | null;
  from_account_name: string; 
  category: string | null;
  subcategory: string | null;
  nw_type: 'Need' | 'Want' | null; 
};

interface RecentTransactionsProps {
  transactions: Transaction[];
  type: 'Income' | 'Expense';
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  allLinkPath: string; // <-- NEW PROP
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  type,
  onEdit,
  onDelete,
  allLinkPath, // <-- NEW PROP
}) => {
  const isExpense = type === 'Expense';
  const amountColor = isExpense ? styles.amountExpense : styles.amountIncome;

  /* --- TIMEZONE BUG FIX ---
     'dateString' is a "YYYY-MM-DD" string.
     new Date("2025-10-30") creates a date at UTC midnight, which is
     "2025-10-29T19:00:00" in Panama (UTC-5).
     
     The fix is to parse the string and create a date at local noon.
  */
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create a date for noon in the user's local timezone
    const localDate = new Date(year, month - 1, day, 12, 0, 0);
    
    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  /* --- END TIMEZONE BUG FIX --- */


  return (
    <div className={styles.listWrapper}>
      <ul className={styles.list}>
        {transactions.length === 0 ? (
          <li className={styles.emptyItem}>
            No recent {isExpense ? 'expenses' : 'income'} found.
          </li>
        ) : (
          transactions.map((tx) => (
            <li key={tx.transaction_id} className={styles.listItem}>
              {/* This structure now matches the compact grid */}
              <div className={styles.tagWrapper}>
                {isExpense && tx.nw_type === 'Need' && <span className={`${sharedStyles.tag} ${sharedStyles.tagNeed}`}>N</span>}
                {isExpense && tx.nw_type === 'Want' && <span className={`${sharedStyles.tag} ${sharedStyles.tagWant}`}>W</span>}
              </div>
              
              <div className={styles.details}>
                <p className={styles.description}>
                  {tx.description || tx.category || 'Transaction'}
                </p>
                <span className={styles.meta}>
                  {formatDate(tx.date)} &bull; 
                  {tx.from_account_name} 
                  &bull; {tx.category}
                </span>
              </div>
              
              <div className={styles.amount}>
                <span className={amountColor}>
                  {isExpense ? '-' : '+'}
                  {formatCurrency(Math.abs(tx.amount))} {/* Use Math.abs here */}
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  className={sharedStyles.iconButton}
                  onClick={() => onEdit(tx)}
                >
                  <HiPencil />
                </button>
                <button
                  className={sharedStyles.iconButtonDanger}
                  onClick={() => onDelete(tx)}
                >
                  <HiTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
      
      {/* --- MODIFIED LINK LOGIC --- */}
      {transactions.length > 0 && (
        <Link to={allLinkPath} className={styles.viewAllLink}>
          View All {type === 'Expense' ? 'Expenses' : 'Income'} &rarr;
        </Link>
      )}
    </div>
  );
};

export default RecentTransactions;