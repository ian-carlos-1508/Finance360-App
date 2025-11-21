/* File: src/components/Sidebar/DynamicSidebar.tsx */

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
// UPDATED: Import supabase to fetch real user
import { supabase } from '../../lib/supabaseClient';
import { useFinancialJourney } from '../../hooks/useFinancialJourney';
import NextActionIndexCard from './NextActionIndexCard';
import { HiCog, HiUserCircle, HiLockClosed, HiCheckCircle, HiFire } from 'react-icons/hi';
import type { JourneyStep, JourneyModule } from '../../types/journey';
import styles from './DynamicSidebar.module.css';

const COLORS = {
  CONTROL: '#3D5A80',
  BUILD: '#548C2F',
  OPTIMIZE: '#EE6C4D',
  INACTIVE: '#d1d5db'
};

interface Props { isCollapsed?: boolean; }

const DynamicSidebar: React.FC<Props> = ({ isCollapsed = false }) => {
  const { journey, loading } = useFinancialJourney();
  const navigate = useNavigate();
  // --- NEW: Real User State ---
  const [userEmail, setUserEmail] = useState<string>('Loading...');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use email or metadata if available
        setUserEmail(user.email || 'Explorer');
      }
    };
    getUser();
  }, []);

  const getStepColor = (stepId: string) => {
    if (stepId === 'control') return COLORS.CONTROL;
    if (stepId === 'build') return COLORS.BUILD;
    if (stepId === 'optimize') return COLORS.OPTIMIZE;
    return COLORS.INACTIVE;
  };

  const handleStepClick = (stepId: string) => {
    if (stepId === 'control') navigate('/control');
    if (stepId === 'build') navigate('/build');
    if (stepId === 'optimize') navigate('/optimize');
  };

  if (loading || !journey) {
    return <div className="p-4 text-xs text-gray-400">Loading...</div>;
  }

  return (
    <div className={styles.sidebarContainer}>
      
      {/* 1. BRAND HEADER */}
      <div className={isCollapsed ? styles.brandHeaderCollapsed : styles.brandHeader}>
        <HiFire className={styles.brandIcon} />
        {!isCollapsed && <span className={styles.brandTitle}>Finance360</span>}
      </div>

      {/* 2. PLAYER CARD */}
      {!isCollapsed && (
        <div className={styles.playerCard}>
           <div className={styles.levelBadge} title="Current Level">
              {journey.userLevel || 1}
           </div>
           <div className={styles.xpInfo}>
              <span className={styles.xpLabel}>Current XP</span>
              <span className={styles.xpValue}>{journey.userXP || 0} XP</span>
           </div>
        </div>
      )}

      {/* 3. NEXT ACTION CARD */}
      <div className="pt-1 pb-2">
        <NextActionIndexCard journey={journey} isCollapsed={isCollapsed} />
      </div>

      {/* 4. SCROLLABLE STEPS AREA */}
      <div className={styles.scrollArea}>
        {journey.steps.map((step: JourneyStep) => {
          const isLocked = step.status === 'LOCKED';
          const isCompleted = step.status === 'COMPLETED';
          const isActiveStep = journey.currentStepId === step.id;
          const stepColor = isLocked ? COLORS.INACTIVE : getStepColor(step.id);

          return (
            <div key={step.id} className={`${styles.accordionItem} ${isLocked ? styles.lockedItem : ''}`}>
              <div 
                className={`${styles.stepHeader} ${isActiveStep ? 'bg-gray-50' : ''}`}
                style={{ cursor: isLocked ? 'default' : 'pointer' }}
                onClick={() => !isLocked && handleStepClick(step.id)}
              >
                <div className={styles.stepTopRow}>
                  <div className={styles.stepTitleGroup}>
                    <div 
                      className={styles.stepIconWrapper}
                      style={{ 
                        backgroundColor: isActiveStep && !isLocked ? `${stepColor}15` : '#f3f4f6', 
                        color: stepColor,
                        border: isActiveStep && !isLocked ? `1px solid ${stepColor}30` : '1px solid transparent'
                      }}
                    >
                      {isLocked ? <HiLockClosed size={14} /> : step.icon}
                    </div>
                    
                    {!isCollapsed && (
                      <span className={`${styles.stepTitle} ${isActiveStep ? styles.activeStepTitle : ''}`}>
                        {step.title}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && isCompleted && (
                      <HiCheckCircle className="text-green-500" size={16} />
                  )}
                </div>

                {!isCollapsed && !isLocked && (
                  <div className={styles.progressBarContainer}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ 
                        width: `${step.progressPercent}%`,
                        backgroundColor: isCompleted ? '#10b981' : stepColor 
                      }} 
                    />
                  </div>
                )}
              </div>

              {!isCollapsed && !isLocked && (
                 <div className={styles.timelineContainer}>
                    <nav className={styles.nav}>
                       {step.modules.map((module: JourneyModule) => (
                          <NavLink
                             key={module.id}
                             to={module.path}
                             className={({ isActive }) => 
                                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
                             }
                          >
                             {module.title}
                          </NavLink>
                       ))}
                    </nav>
                    
                    {step.microScore && (
                       <div className="mt-3 px-2 pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                             {step.microScore.label}
                          </span>
                          <span className="text-xs font-bold text-blue-600">
                             {step.microScore.value}
                          </span>
                       </div>
                    )}
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      {!isCollapsed && (
        <div className={styles.footer}>
          <NavLink to="/settings" className={styles.footerLink}>
            <HiCog size={20} />
            <span>Settings</span>
          </NavLink>
          <div className={styles.footerLink} style={{cursor: 'default', marginTop: '0.25rem'}}>
            <HiUserCircle size={28} className="text-gray-400 flex-shrink-0" />
            <div className={styles.userProfile}>
              <span className={styles.userLabel}>Profile</span>
              {/* UPDATED: Real User Email */}
              <span className={styles.userName} title={userEmail}>{userEmail}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DynamicSidebar;