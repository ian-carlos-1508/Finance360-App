/* File: src/components/Layout/Layout.tsx */

import React, { useState, useEffect } from 'react';
import styles from './Layout.module.css';
import { Outlet } from 'react-router-dom';
import { HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi';
import DynamicSidebar from '../Sidebar/DynamicSidebar';
import LevelUpModal from '../Gamification/LevelUpModal';
import OnboardingWizard from '../../pages/Onboarding/OnboardingWizard'; // New Import
import { useGameMechanics } from '../../hooks/useGameMechanics';
import { supabase } from '../../lib/supabaseClient';

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // --- Game Mechanics Hook ---
  const { showLevelModal, setShowLevelModal, modalTier, modalLevel, isNewUser } = useGameMechanics();

  // --- NEW: Check if we need the Wizard ---
  const [showWizard, setShowWizard] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data } = await supabase
            .from('game_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
         
         // If no profile exists, SHOW WIZARD
         if (!data) {
            setShowWizard(true);
         }
      }
      setCheckingStatus(false);
    };
    checkProfile();
  }, []);

  const handleWizardComplete = () => {
      setShowWizard(false);
      // Force a window reload to trigger the useGameMechanics hook 
      // which will see the new profile and trigger the "Welcome Commander" modal.
      window.location.reload(); 
  };

  if (checkingStatus) return null; // Prevent flash

  return (
    <div className={styles.layout}>
      
      {/* If Wizard is active, show it OVER the app */}
      {showWizard && <OnboardingWizard onComplete={handleWizardComplete} />}

      <aside className={isCollapsed ? styles.sidebarCollapsed : styles.sidebar}>
        <div className={styles.navWrapper}>
           <DynamicSidebar isCollapsed={isCollapsed} />
        </div> 
        <div className={styles.toggleWrapper}>
          <button
            className={styles.toggleButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <HiChevronDoubleRight /> : <HiChevronDoubleLeft />}
            {!isCollapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>

      {/* The Level Up Modal will fire via the hook AFTER the wizard creates the profile and we reload */}
      <LevelUpModal 
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        tier={modalTier}
        level={modalLevel}
        isNewUser={isNewUser}
      />
    </div>
  );
};

export default Layout;