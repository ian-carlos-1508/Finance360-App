import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { GameTier } from '../components/Gamification/LevelUpModal';

export const useGameMechanics = () => {
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [modalTier, setModalTier] = useState<GameTier>('CONTROL');
  const [modalLevel, setModalLevel] = useState(1);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const initGame = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check if profile exists
      const { data: profile } = await supabase
        .from('game_profiles')
        .select('current_level, unlocked_stages')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        // 2. NEW USER: Initialize Logic
        // Call the DB function to scan finances and assign tier
        const { data: newProfile, error } = await supabase.rpc('initialize_user_tier', {
           user_id_input: user.id 
        });

        if (!error && newProfile) {
           // Determine Tier from unlocked stages
           const stages = newProfile.unlocked_stages || [];
           let tier: GameTier = 'CONTROL';
           if (stages.includes('optimize')) tier = 'OPTIMIZE';
           else if (stages.includes('build')) tier = 'BUILD';

           setModalTier(tier);
           setModalLevel(newProfile.current_level);
           setIsNewUser(true);
           setShowLevelModal(true);
        }
      } else {
        // 3. EXISTING USER: Check for Level Up (Future logic)
        // We can listen to realtime subscription here later
      }
    };

    initGame();
  }, []);

  return {
    showLevelModal,
    setShowLevelModal,
    modalTier,
    modalLevel,
    isNewUser
  };
};