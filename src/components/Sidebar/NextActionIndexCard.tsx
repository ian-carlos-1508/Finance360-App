/* File: src/components/Sidebar/NextActionIndexCard.tsx */

import React from 'react';
import { Link } from 'react-router-dom';
import { HiLightningBolt, HiPlay } from 'react-icons/hi';
import type { FinancialJourney, JourneyModule } from '../../types/journey';
// IMPORT THE NEW CSS MODULE
import styles from './NextActionIndexCard.module.css';

interface Props {
  journey: FinancialJourney | null;
  isCollapsed: boolean;
}

const NextActionIndexCard: React.FC<Props> = ({ journey, isCollapsed }) => {
  if (!journey) return null;

  // --- LOGIC: FIND THE NEXT QUEST ---
  const activeStep = journey.steps.find(step => step.status === 'IN_PROGRESS') 
                     || journey.steps.find(step => step.status === 'PENDING')
                     || journey.steps[0];

  const nextModule: JourneyModule | undefined = activeStep.modules.find(m => m.status === 'PENDING');
  // Default to the first module of the active step if everything else fails
  const activeModule = nextModule || activeStep.modules[0];

  // XP Reward Mapping
  const getXpReward = (moduleId: string) => {
    if (moduleId.includes('track')) return 5;
    if (moduleId.includes('budget')) return 50;
    if (moduleId.includes('goal')) return 100;
    return 25;
  };

  const xpReward = getXpReward(activeModule.id);

  // --- SVG RING MATH ---
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  // Since this is the "next action", we show a full ring ready to start (0 offset)
  const strokeOffset = 0; 

  // --- RENDER: COLLAPSED STATE ---
  if (isCollapsed) {
    // (Keep the simple collapsed view as it was, or style it if needed later)
    return (
      <Link 
        to={activeModule.path}
        className="mx-auto w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors group relative"
      >
        <HiLightningBolt className="animate-pulse" />
        <div className="absolute left-14 bg-gray-900 text-white text-xs p-2 rounded w-32 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          <strong>Next:</strong> {activeModule.title} (+{xpReward} XP)
        </div>
      </Link>
    );
  }

  // --- RENDER: EXPANDED STATE (NEW STYLES) ---
  return (
    <Link to={activeModule.path} className={styles.cardContainer}>
        
        {/* 1. Absolute XP Badge */}
        <div className={styles.xpBadge}>
           +{xpReward} XP
        </div>

        <div className={styles.content}>
           
           {/* 2. Left Section (Icon + Text) */}
           <div className={styles.leftSection}>
              <div className={styles.iconBox}>
                 <HiLightningBolt />
              </div>
              <div className={styles.textGroup}>
                 <span className={styles.label}>Current Quest</span>
                 {/* Use title attribute for truncation tooltip */}
                 <h3 className={styles.title} title={activeModule.title}>
                    {activeModule.title}
                 </h3>
              </div>
           </div>

           {/* 3. Right Section (Progress Ring + Play Button) */}
           <div className={styles.progressRingWrapper}>
              <HiPlay className={styles.playIcon} />
              
              <svg className={styles.ringSvg} width="32" height="32">
                 {/* Background Circle (Gray) */}
                 <circle
                    className={styles.ringBg}
                    strokeWidth="2"
                    fill="transparent"
                    r={radius}
                    cx="16"
                    cy="16"
                 />
                 {/* Progress Circle (Blue) */}
                 <circle
                    className={styles.ringProgress}
                    strokeWidth="2"
                    fill="transparent"
                    r={radius}
                    cx="16"
                    cy="16"
                    style={{
                       strokeDasharray: `${circumference} ${circumference}`,
                       strokeDashoffset: strokeOffset
                    }}
                 />
              </svg>
           </div>

        </div>
    </Link>
  );
};

export default NextActionIndexCard;