/* Replace file: src/components/Layout/Layout.tsx */

import React, { useState, useEffect } from 'react';
import styles from './Layout.module.css';
import { Outlet } from 'react-router-dom';
import { HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi';
import DynamicSidebar from '../Sidebar/DynamicSidebar';
import LevelUpModal from '../Gamification/LevelUpModal';
import OnboardingWizard from '../../pages/Onboarding/OnboardingWizard';
import { useGameMechanics } from '../../hooks/useGameMechanics';
import { supabase } from '../../lib/supabaseClient';
// NEW: Import the toast provider to ensure it wraps the layout content properly if needed, 
// though it's usually in main.tsx. We just ensure layout logic is clean.

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Import triggerWelcome from our hook
  const { showLevelModal, setShowLevelModal, modalTier, modalLevel, isNewUser, triggerWelcome } = useGameMechanics();

  const [showWizard, setShowWizard] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data, error } = await supabase
            .from('game_profiles')
            .select('user_id') // <--- FIX: Select 'user_id', NOT 'id'
            .eq('user_id', user.id)
            .single();
         
         // Only show wizard if no profile exists
         if (!data && !error) { 
            // Double check error isn't just "row not found"
            // actually if !data is safer for single() logic in some clients, 
            // but explicitly, if we get data, we know profile exists.
            setShowWizard(true);
         } else if (error && error.code === 'PGRST116') {
             // PGRST116 is the specific code for "0 rows returned" from .single()
             setShowWizard(true);
         }
      }
      setCheckingStatus(false);
    };
    checkProfile();
  }, []);

  const handleWizardComplete = () => {
      setShowWizard(false);
      // Trigger the Welcome Modal without reloading
      triggerWelcome();
  };

  if (checkingStatus) return <div className="h-screen w-screen bg-white"></div>;

  return (
    <div className={styles.layout}>
      
      {/* Wizard Overlay - Only shows if profile is missing */}
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

      {/* The Level Up Modal */}
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