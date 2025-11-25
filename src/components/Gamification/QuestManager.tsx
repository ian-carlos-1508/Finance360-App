/* File: src/components/Gamification/QuestManager.tsx */
import React, { useEffect, useRef } from 'react';
import { useFinancialJourney, JOURNEY_REFRESH_EVENT } from '../../hooks/useFinancialJourney';
import { useGamificationToast } from '../../context/GamificationToastContext';
import { supabase } from '../../lib/supabaseClient';

const QuestManager: React.FC = () => {
  const { journey, refreshJourney } = useFinancialJourney();
  // We need showWarningToast for the "Bad Decisions"
  const { showXpToast, showWarningToast } = useGamificationToast(); 
  
  const processingRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. REALTIME LISTENERS ---
  useEffect(() => {
    const channel = supabase
      .channel('quest-triggers')
      
      // A. Watch for POSITIVE events (Transactions, Goals)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        () => triggerDebouncedCheck()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        () => triggerDebouncedCheck()
      )
      
      // B. Watch for PENALTIES (Negative XP)
      // This catches the SQL Trigger "penalize_bad_decisions"
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'xp_log' },
        (payload) => {
            const newLog = payload.new;
            // If the DB inserted a negative amount, warn the user immediately
            if (newLog.amount < 0) {
                console.log('⚠️ Penalty Detected:', newLog);
                showWarningToast(`Warning: ${newLog.amount} XP. ${newLog.action_type || 'Penalty applied.'}`);
                refreshJourney(); // Update the XP bar to show the drop
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showWarningToast, refreshJourney]);

  // --- 2. DEBOUNCE HELPER ---
  const triggerDebouncedCheck = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(() => {
        console.log('⚡ Debounce Cleared - Refreshing Journey');
        window.dispatchEvent(new Event(JOURNEY_REFRESH_EVENT));
    }, 1000); 
  };

  // --- 3. QUEST COMPLETION LOGIC ---
  useEffect(() => {
    if (!journey) return;

    const validateActiveQuests = async () => {
      for (const step of journey.steps) {
        for (const module of step.modules) {
          
          // Check only IN_PROGRESS items
          if (module.status === 'IN_PROGRESS' && !processingRef.current.has(module.id)) {
            
            processingRef.current.add(module.id);

            try {
              const { data, error } = await supabase.rpc('complete_quest', { p_slug: module.id });
              
              if (!error && data.success) {
                // SUCCESS: Show the Blue/Green Toast
                showXpToast(data.xp_awarded, `${data.quest_title || module.title} Complete!`);
                refreshJourney();
              } else {
                 // If failed, unlock so we can try again next trigger
                 if (data?.message !== 'Already completed') {
                     processingRef.current.delete(module.id);
                 }
              }
            } catch (err) {
              processingRef.current.delete(module.id);
            }
          }
        }
      }
    };

    validateActiveQuests();

  }, [journey, showXpToast, refreshJourney]);

  return null; 
};

export default QuestManager;