import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GameTier } from '../components/Gamification/LevelUpModal';

export const useGameMechanics = () => {
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [modalTier, setModalTier] = useState<GameTier>('CONTROL');
  const [modalLevel, setModalLevel] = useState(1);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Keep track of previous level to detect changes (0 initially to ensure we capture load)
  const prevLevelRef = useRef<number>(0);

  // 1. Listen for Realtime Level Changes
  useEffect(() => {
    let channel: any;

    const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch initial level to set baseline
        const { data } = await supabase
            .from('game_profiles')
            .select('current_level')
            .eq('user_id', user.id)
            .single();
        
        if (data) {
             prevLevelRef.current = data.current_level;
        }

        // Subscribe to changes on my specific profile row
        channel = supabase
            .channel('level-up-tracker')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_profiles',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newLevel = payload.new.current_level;
                    const oldLevel = prevLevelRef.current;

                    console.log(`⚡ Level Change Detected: ${oldLevel} -> ${newLevel}`);

                    // If Level INCREASED, trigger modal
                    if (newLevel > oldLevel && oldLevel !== 0) {
                        let tier: GameTier = 'CONTROL';
                        if (newLevel >= 2) tier = 'BUILD';
                        if (newLevel >= 3) tier = 'OPTIMIZE';

                        setModalTier(tier);
                        setModalLevel(newLevel);
                        setIsNewUser(false); // It's a promotion
                        setShowLevelModal(true);
                        
                        // Play sound effect here if you wanted
                    }
                    
                    // Update ref for next time
                    prevLevelRef.current = newLevel;
                }
            )
            .subscribe();
    };

    setupSubscription();

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, []);


  // 2. Function to trigger the welcome modal manually (Wizard)
  const triggerWelcome = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('game_profiles')
        .select('current_level, unlocked_stages')
        .eq('user_id', user.id)
        .single();

      if (profile) {
           const stages = profile.unlocked_stages || [];
           let tier: GameTier = 'CONTROL';
           if (stages.includes('optimize')) tier = 'OPTIMIZE';
           else if (stages.includes('build')) tier = 'BUILD';

           setModalTier(tier);
           setModalLevel(profile.current_level);
           setIsNewUser(true); 
           setShowLevelModal(true);
           prevLevelRef.current = profile.current_level;
      }
  };

  return {
    showLevelModal,
    setShowLevelModal,
    modalTier,
    modalLevel,
    isNewUser,
    triggerWelcome
  };
};