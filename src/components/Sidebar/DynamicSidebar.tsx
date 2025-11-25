/* File: src/components/Sidebar/DynamicSidebar.tsx */

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';
import NextActionIndexCard from './NextActionIndexCard';
import FlightManualModal from '../Gamification/FlightManualModal'; // <--- NEW IMPORT
import { 
  HiLockClosed, 
  HiCheckCircle, 
  HiFire,
  HiCog,
  HiUserCircle,
  HiAcademicCap,
  HiGlobeAlt,
  HiExclamationCircle,
  HiBookOpen // <--- NEW ICON
} from 'react-icons/hi';
import type { JourneyStep } from '../../types/journey';
import styles from './DynamicSidebar.module.css';

interface Props { isCollapsed?: boolean; }

const DynamicSidebar: React.FC<Props> = ({ isCollapsed = false }) => {
  const { journey, loading } = useFinancialJourney();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('Loading...');
  
  // --- FLIGHT MANUAL STATE ---
  const [showFlightManual, setShowFlightManual] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'Explorer');
      }
    };
    getUser();
  }, []);

  const getStepStyles = (stepId: string) => {
    switch (stepId) {
      case 'control': 
        return { iconBg: '#EFF6FF', iconColor: '#2563EB', activeClass: styles.levelCardControlActive };
      case 'build': 
        return { iconBg: '#ECFDF5', iconColor: '#059669', activeClass: styles.levelCardBuildActive };
      case 'optimize': 
        return { iconBg: '#FFFBEB', iconColor: '#D97706', activeClass: styles.levelCardOptimizeActive };
      default: 
        return { iconBg: '#F3F4F6', iconColor: '#6B7280', activeClass: '' };
    }
  };

  if (loading || !journey) {
    return <div className="p-4 text-xs text-gray-400">Loading...</div>;
  }

  const currentStreak = journey.streak?.currentStreak || 0;
  const isStreakActive = currentStreak > 0;

  // Probation Visuals
  const isProbation = journey.rankStatus === 'PROBATION';

  const badgeStyle = isProbation 
    ? { bg: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' } 
    : { bg: '#ECFDF5', color: '#059669', border: '1px solid #6EE7B7' }; 
    
  const badgeTitle = isProbation ? "Acting Captain (Probation)" : `Level ${journey.userLevel || 1}`;

  // Determine Tier String for Modal
  const currentTierString = (journey.currentStepId || 'control').toUpperCase() as 'CONTROL' | 'BUILD' | 'OPTIMIZE';

  return (
    <div className={styles.sidebarContainer}>
      
      {/* 1. BRAND HEADER */}
      <div className={isCollapsed ? styles.brandHeaderCollapsed : styles.brandHeader}>
        <HiFire className={styles.brandIcon} />
        {!isCollapsed && (
            <span className={styles.brandTitle}>
                <span className={styles.brandTextFinance}>Finance</span>
                <span className={styles.brandText360}>360</span>
            </span>
        )}
      </div>

      {/* 2. PLAYER CARD */}
      {!isCollapsed && (
        <div className={styles.playerCard} style={{ borderColor: isProbation ? '#FCD34D' : 'transparent' }}>
           <div 
             className={styles.levelBadge} 
             title={badgeTitle}
             style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color, border: badgeStyle.border }}
           >
              {isProbation ? <HiExclamationCircle size={20} /> : <HiAcademicCap size={20} />}
           </div>

           <div className={styles.xpInfo}>
              <span className={styles.xpLabel}>
                  {isProbation ? 'PROBATION STATUS' : 'CURRENT XP'}
              </span>
              <span className={styles.xpValue}>{journey.userXP || 0} XP</span>
           </div>
           
           <div className={styles.streakWrapper}>
                <span className={styles.xpLabel}>Streak</span>
                <span className={isStreakActive ? styles.streakValue : 'text-gray-400'}>
                    {currentStreak}
                </span>
           </div>
        </div>
      )}

      {/* 3. NEXT ACTION CARD */}
      {!isCollapsed && (
        <div className="pt-1 pb-4">
          <NextActionIndexCard />
        </div>
      )}

      {/* 4. MAIN NAVIGATION */}
      <div className={styles.navArea}>
        {!isCollapsed && <div className={styles.timelineConnector} />}

        {journey.steps.map((step: JourneyStep) => {
          const isLocked = step.status === 'LOCKED';
          const isCompleted = step.status === 'COMPLETED';
          const style = getStepStyles(step.id);
          const routePath = step.id === 'control' ? '/cash-flow-command' 
                          : step.id === 'build' ? '/build'
                          : '/optimize'; 

          return (
            <div key={step.id} className={styles.levelCardWrapper}>
              <NavLink
                to={routePath}
                className={({ isActive }) => 
                  `${styles.levelCard} ${isActive ? style.activeClass : ''} ${isLocked ? styles.levelCardLocked : ''}`
                }
              >
                  <div 
                    className={styles.cardIcon} 
                    style={{ backgroundColor: style.iconBg, color: style.iconColor }}
                  >
                    {isLocked ? <HiLockClosed /> : step.icon}
                  </div>

                  {!isCollapsed && (
                    <div className={styles.cardContent}>
                      <span className={styles.cardTitle}>{step.title}</span>
                      <span className={styles.cardSubtitle}>
                        {isLocked ? 'Locked' : step.microScore ? `${step.microScore.label}: ${step.microScore.value}` : 'Active'}
                      </span>
                    </div>
                  )}

                  {!isCollapsed && isCompleted && (
                     <HiCheckCircle className={styles.statusIcon} />
                  )}
              </NavLink>
            </div>
          );
        })}

        {/* 5. THE ENDGAME */}
        {!isCollapsed && (
            <div className={styles.levelCardWrapper}>
                <div className={styles.freedomCard}>
                    <div className={styles.freedomIcon}>
                        <HiGlobeAlt />
                    </div>
                    <div className={styles.cardContent}>
                        <span className={styles.freedomText}>Financial Freedom</span>
                        <span className={styles.cardSubtitle} style={{fontSize: '0.65rem'}}>The Ultimate Goal</span>
                    </div>
                    <HiLockClosed className="text-gray-400" />
                </div>
            </div>
        )}

      </div>

      {/* 6. FOOTER */}
      {!isCollapsed && (
        <div className={styles.footer}>
          
          {/* FLIGHT MANUAL BUTTON */}
          <div 
            className={styles.footerLink} 
            onClick={() => setShowFlightManual(true)} 
            style={{ cursor: 'pointer', marginBottom: '0.25rem' }}
          >
            <HiBookOpen size={20} />
            <span>Flight Manual</span>
          </div>

          <div 
            className={styles.footerLink} 
            onClick={() => navigate('/settings')} 
            style={{ cursor: 'pointer' }}
          >
            <HiCog size={20} />
            <span>Settings</span>
          </div>
          
          <div className={styles.footerLink} style={{cursor: 'default', marginTop: '0.25rem'}}>
            <HiUserCircle size={28} className="text-gray-400 flex-shrink-0" />
            <div className={styles.userProfile}>
              <span className={styles.userLabel}>Profile</span>
              <span className={styles.userName} title={userEmail}>{userEmail}</span>
            </div>
          </div>
        </div>
      )}

      {/* THE MODAL COMPONENT */}
      <FlightManualModal 
         isOpen={showFlightManual} 
         onClose={() => setShowFlightManual(false)} 
         currentTier={currentTierString}
      />

    </div>
  );
};

export default DynamicSidebar;