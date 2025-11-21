/* File: src/components/UI/EmptyState.tsx */

import React from 'react';

interface Props {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<Props> = ({ 
  message = "Quiet... too quiet. Log a transaction to wake up the engine.", 
  actionLabel,
  onAction 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
      
      {/* Zen Visuals */}
      <div className="text-6xl mb-4 animate-pulse opacity-80">
        🎋
      </div>
      
      {/* Message */}
      <h3 className="text-gray-900 font-bold text-lg mb-2">Zen Garden Mode</h3>
      <p className="text-gray-500 max-w-xs text-sm mb-6 leading-relaxed">
        {message}
      </p>

      {/* Optional Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-lg shadow-sm hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;