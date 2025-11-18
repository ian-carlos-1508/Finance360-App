/* Replace file: src/components/Tooltip/TooltipInfo.tsx */

import React from 'react';
import styles from './TooltipInfo.module.css';
import { HiQuestionMarkCircle } from 'react-icons/hi2';

interface TooltipInfoProps {
  children: React.ReactNode;
  align?: 'right'; // Prop to align the tooltip to the right
}

const TooltipInfo: React.FC<TooltipInfoProps> = ({ children, align }) => {
  // Add the .alignRight class if the prop is passed
  const containerClass = `${styles.tooltipContainer} ${
    align === 'right' ? styles.alignRight : ''
  }`;

  return (
    <div className={containerClass}>
      <HiQuestionMarkCircle />
      <span className={styles.tooltipText}>{children}</span>
    </div>
  );
};

export default TooltipInfo;