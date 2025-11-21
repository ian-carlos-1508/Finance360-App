/* File: src/components/Tooltip/TooltipInfo.tsx */

import React from 'react';
import styles from './TooltipInfo.module.css';
import { HiQuestionMarkCircle } from 'react-icons/hi2';

interface TooltipInfoProps {
  children: React.ReactNode;
  align?: 'right'; // Horizontal alignment
  position?: 'bottom'; // NEW: Vertical alignment
}

const TooltipInfo: React.FC<TooltipInfoProps> = ({ children, align, position }) => {
  const containerClass = `
    ${styles.tooltipContainer} 
    ${align === 'right' ? styles.alignRight : ''}
    ${position === 'bottom' ? styles.positionBottom : ''}
  `;

  return (
    <div className={containerClass}>
      <HiQuestionMarkCircle />
      <span className={styles.tooltipText}>{children}</span>
    </div>
  );
};

export default TooltipInfo;