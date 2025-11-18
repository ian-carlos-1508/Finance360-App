/* Replace file: src/components/Transactions/GenericTransactionList.tsx */

import React from 'react';
import styles from './GenericTransactionList.module.css';
import sharedStyles from '../../pages/Settings/Settings.module.css'; 
import { 
  HiArrowSmDown, 
  HiArrowSmUp, 
  HiSwitchHorizontal 
} from 'react-icons/hi';

export type AllTransaction = {
  transaction_id: string;
  date: string;
  type: 'Income' | 'Expense' | 'Transfer';
  description: string | null;
  amount: number;
  from_account_name: string | null;
  to_account_name: string | null;
  category: string | null;
  subcategory: string | null;
  
  account_id: string;
  category_id: string | null;
  
  to_account_id: string | null;
  from_account_id: string; 

  nw_type: 'Need' | 'Want' | null;
};

interface GenericTransactionListProps {
  transactions: AllTransaction[];
}

const GenericTransactionList: React.FC<GenericTransactionListProps> = ({ 
  transactions 
}) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { // Back to en-US
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTransactionDetails = (tx: AllTransaction) => {
    if (tx.type === 'Income') {
      return (
        <>
          <div className={`${styles.iconWrapper} ${styles.income}`}>
            <HiArrowSmDown />
          </div>
          <div className={styles.details}>
            <p><strong>{tx.description || tx.category}</strong></p>
            <span>{formatDate(tx.date)} &bull; {tx.category}</span>
          </div>
          <div className={`${styles.amount} ${styles.income}`}>
            +${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </>
      );
    }

    if (tx.type === 'Expense') {
      return (
        <>
          <div className={`${styles.iconWrapper} ${styles.expense}`}>
            <HiArrowSmUp />
          </div>
          <div className={styles.details}>
            <p>
              {tx.nw_type === 'Need' && <span className={`${sharedStyles.tag} ${sharedStyles.tagNeed} ${styles.inlineTag}`}>N</span>}
              {tx.nw_type === 'Want' && <span className={`${sharedStyles.tag} ${sharedStyles.tagWant} ${styles.inlineTag}`}>W</span>}
              <strong>{tx.description || tx.category}</strong>
            </p>
            <span>{formatDate(tx.date)} &bull; {tx.category}</span>
          </div>
          <div className={`${styles.amount} ${styles.expense}`}>
            -${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </>
      );
    }

    if (tx.type === 'Transfer') {
      return (
        <>
          <div className={`${styles.iconWrapper} ${styles.iconTransfer}`}>
            <HiSwitchHorizontal />
          </div>
          <div className={styles.details}>
            <p><strong>{tx.from_account_name} &rarr; {tx.to_account_name}</strong></p>
            <span>{formatDate(tx.date)} &bull; {tx.description || 'Transfer'}</span>
          </div>
          <div className={`${styles.amount} ${styles.amountTransfer}`}>
            ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </>
      );
    }
    
    return null;
  };

  return (
    <div>
      <ul className={styles.list}>
        {transactions.length === 0 ? (
          <li style={{textAlign: 'center', padding: '1rem', fontSize: '0.9rem', color: '#6b7280'}}>
            No transactions found.
          </li>
        ) : (
          transactions.map((tx) => (
            <li key={tx.transaction_id} className={styles.listItem}>
              {renderTransactionDetails(tx)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default GenericTransactionList;