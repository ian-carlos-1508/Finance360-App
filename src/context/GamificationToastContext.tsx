/* File: src/context/GamificationToastContext.tsx */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { HiLightningBolt, HiExclamationCircle } from 'react-icons/hi';
import styles from './GamificationToastContext.module.css';

type ToastType = 'success' | 'warning';

interface Toast {
  id: number;
  amount: number; 
  message: string;
  type: ToastType;
}

interface GamificationToastContextType {
  showXpToast: (amount: number, message: string) => void;
  showWarningToast: (message: string) => void;
}

const GamificationToastContext = createContext<GamificationToastContextType | undefined>(undefined);

export const GamificationToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = (amount: number, message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, amount, message, type }]);
    // Auto dismiss after 3 seconds
    setTimeout(() => removeToast(id), 3000);
  };

  const showXpToast = (amount: number, message: string) => {
    addToast(amount, message, 'success');
  };

  const showWarningToast = (message: string) => {
    addToast(0, message, 'warning');
  };

  return (
    <GamificationToastContext.Provider value={{ showXpToast, showWarningToast }}>
      {children}
      
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toastItem} ${toast.type === 'success' ? styles.success : styles.warning}`}
          >
            <div 
              className={`${styles.iconWrapper} ${toast.type === 'success' ? styles.iconSuccess : styles.iconWarning}`}
            >
              {toast.type === 'success' ? <HiLightningBolt size={16} /> : <HiExclamationCircle size={16} />}
            </div>
            
            <div className={styles.content}>
              <span className={styles.label}>
                {toast.type === 'success' ? 'Level Up Protocol' : 'System Alert'}
              </span>
              <span className={styles.message}>
                {toast.type === 'success' && `+${toast.amount} XP | `} 
                {toast.message}
              </span>
            </div>
          </div>
        ))}
      </div>

    </GamificationToastContext.Provider>
  );
};

export const useGamificationToast = () => {
  const context = useContext(GamificationToastContext);
  if (!context) {
    throw new Error('useGamificationToast must be used within a GamificationToastProvider');
  }
  return context;
};