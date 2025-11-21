/* File: src/components/Sidebar/DynamicSidebar.tsx */

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';
import NextActionIndexCard from './NextActionIndexCard';
import { 
  HiLockClosed, 
  HiCheckCircle, 
  HiFire,
  HiCog,
  HiUserCircle,
  HiAcademicCap // Used for Level Badge
} from 'react-icons/hi';
import type { JourneyStep } from '../../types/journey';
import styles from './DynamicSidebar.module.css';

interface Props { isCollapsed?: boolean; }

const DynamicSidebar: React.FC<Props> = ({ isCollapsed = false }) => {
  const { journey, loading } = useFinancialJourney();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('Loading...');

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
      case 'control': return { bg: '#EFF6FF', text: '#2563EB', activeClass: styles.levelCardControlActive };
      case 'build': return { bg: '#ECFDF5', text: '#059669', activeClass: styles.levelCardBuildActive };
      case 'optimize': return { bg: '#FFFBEB', text: '#D97706', activeClass: styles.levelCardOptimizeActive };
      default: return { bg: '#F3F4F6', text: '#6B7280', activeClass: '' };
    }
  };

  if (loading || !journey) {
    return <div className="p-4 text-xs text-gray-400">Loading...</div>;
  }

  // Get streak safely
  const currentStreak = journey.streak?.currentStreak || 0;
  const isStreakActive = currentStreak > 0;

  return (
    <div className={styles.sidebarContainer}>
      
      {/* 1. BRANDING & STREAK HEADER (Polished Logo) */}
      {!isCollapsed && (
        <div className={styles.brandHeader}>
            <HiFire 
                className={styles.brandIcon} 
            />
            <span className={styles.brandTitle}>
                <span className={styles.brandTextFinance}>Finance</span>
                <span className={styles.brandText360}>360</span>
            </span>
            
            {/* Right: Active Streak Indicator */}
            <div className={styles.streakWrapper}>
                <span className={styles.xpLabel}>Streak</span>
                <span className={isStreakActive ? styles.streakValue : 'text-gray-400'}>
                    {currentStreak}
                </span>
            </div>
        </div>
      )}

      {/* 2. PLAYER CARD (Level/XP/Streak Metrics) */}
      {!isCollapsed && (
        <div className={styles.playerCard}>
           
           {/* Level Badge (The blue circle) */}
           <div className={styles.levelBadge} title={`Level ${journey.userLevel || 1}`}>
              <HiAcademicCap size={20} />
           </div>
           
           {/* XP Info */}
           <div className={styles.xpInfo}>
              <span className={styles.xpLabel}>Current XP</span>
              <span className={styles.xpValue}>{journey.userXP || 0} XP</span>
           </div>
           
           {/* Removed old redundant XP display */}
        </div>
      )}

      {/* 3. NEXT ACTION CARD */}
      <div className="pt-1 pb-4">
        <NextActionIndexCard journey={journey} isCollapsed={isCollapsed} />
      </div>

      {/* 4. MAIN NAVIGATION */}
      <div className={styles.navArea}>
        {journey.steps.map((step: JourneyStep) => {
          const isLocked = step.status === 'LOCKED';
          const isCompleted = step.status === 'COMPLETED';
          const style = getStepStyles(step.id);
          const routePath = `/${step.id}`;

          const InnerContent = (
            <>
              {/* Icon Box */}
              <div 
                className={styles.cardIcon} 
                style={{ backgroundColor: style.bg, color: style.text }}
              >
                {isLocked ? <HiLockClosed /> : step.icon}
              </div>

              {/* Text Content */}
              {!isCollapsed && (
                <div className={styles.cardContent}>
                  <span className={styles.cardTitle}>{step.title}</span>
                  <span className={styles.cardSubtitle}>
                    {isLocked ? 'Locked' : step.microScore ? `${step.microScore.label}: ${step.microScore.value}` : 'Active'}
                  </span>
                </div>
              )}

              {/* Checkmark */}
              {!isCollapsed && isCompleted && (
                 <HiCheckCircle className={styles.statusIcon} />
              )}
            </>
          );

          // If locked, render a DIV (no onClick needed).
          if (isLocked) {
            return (
              <div key={step.id} className={`${styles.levelCard} ${styles.levelCardLocked}`}>
                {InnerContent}
              </div>
            );
          }

          // If unlocked, render a NavLink.
          return (
            <NavLink
              key={step.id}
              to={routePath}
              className={({ isActive }) => 
                `${styles.levelCard} ${isActive ? style.activeClass : ''}` // Applied dynamic active color
              }
            >
              {InnerContent}
            </NavLink>
          );
        })}
      </div>

      {/* 5. FOOTER */}
      {!isCollapsed && (
        <div className={styles.footer}>
          {/* Settings Link */}
          <div 
            className={styles.footerLink} 
            onClick={() => navigate('/settings')} 
            style={{ cursor: 'pointer' }}
          >
            <HiCog size={20} />
            <span>Settings</span>
          </div>
          
          {/* Profile Link */}
          <div className={styles.footerLink} style={{cursor: 'default', marginTop: '0.25rem'}}>
            <HiUserCircle size={28} className="text-gray-400 flex-shrink-0" />
            <div className={styles.userProfile}>
              <span className={styles.userLabel}>Profile</span>
              <span className={styles.userName} title={userEmail}>{userEmail}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DynamicSidebar;