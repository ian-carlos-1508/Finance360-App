/* File: src/context/GamificationToastContext.tsx */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { HiLightningBolt, HiExclamationCircle } from 'react-icons/hi';

type ToastType = 'success' | 'warning';

interface Toast {
  id: number;
  amount: number; // XP amount (0 for warnings)
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
      
      {/* TOAST CONTAINER (Fixed Bottom Center) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border transform transition-all duration-500 ease-out animate-bounce-in
              ${toast.type === 'success' 
                ? 'bg-gray-900 text-white border-gray-700' 
                : 'bg-red-50 text-red-700 border-red-200'
              }
            `}
            style={{ minWidth: '240px' }}
          >
            <div 
              className={`p-1.5 rounded-full ${toast.type === 'success' ? 'bg-yellow-500 text-gray-900' : 'bg-red-200 text-red-700'}`}
            >
              {toast.type === 'success' ? <HiLightningBolt size={16} /> : <HiExclamationCircle size={16} />}
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                {toast.type === 'success' ? 'Level Up Protocol' : 'System Alert'}
              </span>
              <span className="font-bold text-sm">
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