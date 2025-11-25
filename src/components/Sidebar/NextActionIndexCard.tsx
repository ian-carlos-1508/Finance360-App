/* File: src/components/Sidebar/NextActionIndexCard.tsx */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLightningBolt, HiPlay, HiCheckCircle, HiArrowRight } from 'react-icons/hi';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';
import styles from './NextActionIndexCard.module.css';

const NextActionIndexCard: React.FC = () => {
  const navigate = useNavigate();
  const { journey, loading } = useFinancialJourney();

  if (loading || !journey) {
    return <div className="animate-pulse h-32 bg-blue-50 rounded-2xl m-3 border border-blue-100" />;
  }

  // 1. FIND ACTIVE QUEST
  const allModules = journey.steps.flatMap(s => s.modules);
  const activeQuest = allModules.find(m => m.status === 'IN_PROGRESS') 
                   || allModules.find(m => m.status === 'LOCKED');

  // Scenario: All Complete
  if (!activeQuest) {
     return (
       <div className={`${styles.cardContainer} ${styles.cardSuccess}`}>
          <div className={styles.content}>
            <div className={styles.leftSection}>
              <div className={styles.iconBox}>
                <HiCheckCircle />
              </div>
              <div className={styles.textGroup}>
                 <div className={styles.label}>Mission Status</div>
                 <div className={styles.title}>All Systems Go</div>
              </div>
            </div>
          </div>
       </div>
     );
  }

  return (
    <div 
      className={styles.cardContainer} 
      onClick={() => navigate(activeQuest.path)}
    >
      {/* XP Badge - NOW DYNAMIC */}
      <div className={styles.xpBadge}>
        <HiLightningBolt style={{ display: 'inline', marginBottom: 1 }} /> {activeQuest.xp_reward} XP
      </div>

      <div className={styles.content}>
        <div className={styles.leftSection}>
          <div className={styles.iconBox}>
            <HiLightningBolt />
          </div>
          <div className={styles.textGroup}>
            <div className={styles.label}>Current Objective</div>
            <div className={styles.title}>{activeQuest.title}</div>
          </div>
        </div>

        <div className={styles.progressRingWrapper}>
           <HiPlay className={styles.playIcon} />
           <svg className={styles.ringSvg} width="32" height="32">
             <circle className={styles.ringBg} strokeWidth="2" fill="transparent" r="14" cx="16" cy="16" />
             <circle className={styles.ringProgress} strokeWidth="2" fill="transparent" r="14" cx="16" cy="16" strokeDasharray="87.96" strokeDashoffset="20" />
           </svg>
        </div>
      </div>

      <div className={styles.instruction}>
         <HiArrowRight className={styles.arrowIcon} />
         <span style={{ textTransform: 'uppercase' }}>
            {activeQuest.instruction}
         </span>
      </div>
    </div>
  );
};

export default NextActionIndexCard;