/* File: src/components/Sidebar/NextActionIndexCard.tsx */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { HiLightningBolt, HiPlay } from 'react-icons/hi';
import type { FinancialJourney } from '../../types/journey';
import styles from './NextActionIndexCard.module.css';

interface Props {
  journey: FinancialJourney;
  isCollapsed: boolean;
}

const NextActionIndexCard: React.FC<Props> = ({ journey, isCollapsed }) => {
  if (isCollapsed) return null;

  const activeStep = journey.steps.find(s => s.status !== 'COMPLETED');
  const nextModule = activeStep?.modules.find(m => m.status !== 'COMPLETED');

  if (!activeStep || !nextModule) return null;

  // --- CIRCLE CONFIG ---
  const radius = 14;
  const stroke = 2.5;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Calculate progress (using step percent for now)
  // If step percent is 0, we show a tiny bit (5%) just for visuals
  const percent = Math.max(activeStep.progressPercent, 5); 
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <NavLink to={nextModule.path} className={styles.cardContainer}>
      
      <div className={styles.xpBadge}>+50 XP</div>
      
      <div className={styles.content}>
        <div className={styles.leftSection}>
          <div className={styles.iconBox}>
             <HiLightningBolt />
          </div>
          
          <div className={styles.textGroup}>
            <span className={styles.label}>Current Quest</span>
            <div className={styles.title}>
              {nextModule.title}
            </div>
          </div>
        </div>

        {/* Circular Progress Button */}
        <div className={styles.progressRingWrapper}>
          <svg
            height={radius * 2}
            width={radius * 2}
            className={styles.ringSvg}
          >
            <circle
              className={styles.ringBg}
              strokeWidth={stroke}
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              className={styles.ringProgress}
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <HiPlay className={styles.playIcon} />
        </div>
      </div>
    </NavLink>
  );
};

export default NextActionIndexCard;