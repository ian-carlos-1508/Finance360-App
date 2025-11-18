/* Replace file: src/components/Transactions/RecentTransfers.tsx */

import React from 'react';
import styles from './RecentTransfers.module.css'; // <-- Use new CSS
import sharedStyles from '../../pages/Settings/Settings.module.css';
import { HiPencil, HiTrash } from 'react-icons/hi2'; // v2 icons
import { HiSwitchHorizontal } from 'react-icons/hi'; // v1 icon
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';

// This type is based on v_transfers
export type Transfer = {
  transaction_id: string;
  date: string;
  description: string | null;
  amount: number;
  from_account_id: string;
  from_account_name: string;
  to_account_id: string | null;
  to_account_name: string | null;
};

interface RecentTransfersProps {
  transfers: Transfer[];
  onEdit: (tx: Transfer) => void;
  onDelete: (tx: Transfer) => void;
  allLinkPath: string; // <-- NEW PROP
}

const RecentTransfers: React.FC<RecentTransfersProps> = ({
  transfers,
  onEdit,
  onDelete,
  allLinkPath, // <-- NEW PROP
}) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.listWrapper}>
      <ul className={styles.list}>
        {transfers.length === 0 ? (
          <li className={styles.emptyItem}>
            No recent transfers found.
          </li>
        ) : (
          transfers.map((tx) => (
            <li key={tx.transaction_id} className={styles.listItem}>
              {/* --- NEW: Compact Grid Layout --- */}
              <div className={styles.iconWrapper}>
                <HiSwitchHorizontal />
              </div>
              
              <div className={styles.details}>
                <p className={styles.description}>
                  {tx.from_account_name} &rarr; {tx.to_account_name}
                </p>
                <span className={styles.meta}>
                  {formatDate(tx.date)}
                  {tx.description && ` • ${tx.description}`}
                </span>
              </div>
              
              <div className={styles.amount}>
                {formatCurrency(tx.amount)}
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
      
      {/* --- NEW: Dynamic "View All" Link --- */}
      {transfers.length > 0 && (
        <Link to={allLinkPath} className={styles.viewAllLink}>
          View All Transfers &rarr;
        </Link>
      )}
    </div>
  );
};

export default RecentTransfers;