/* Replace file: src/hooks/useFinancialJourney.ts */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import JourneyService from '../services/JourneyService'; 
import type { FinancialJourney } from '../types/journey';

// Event mechanism to trigger refreshes across components
export const JOURNEY_REFRESH_EVENT = 'finance360_journey_refresh';

export const useFinancialJourney = () => {
    const [journey, setJourney] = useState<FinancialJourney | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchJourney = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            try {
                const data = await JourneyService.calculateJourneyStatus(user.id);
                setJourney(data);
            } catch (error) {
                console.error("Journey Error:", error);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchJourney();

        // Listen for the global refresh event
        const handleRefresh = () => fetchJourney();
        window.addEventListener(JOURNEY_REFRESH_EVENT, handleRefresh);

        return () => {
            window.removeEventListener(JOURNEY_REFRESH_EVENT, handleRefresh);
        };
    }, [fetchJourney]);

    // Helper to trigger refresh manually
    const refreshJourney = () => {
        window.dispatchEvent(new Event(JOURNEY_REFRESH_EVENT));
    };

    return { journey, loading, refreshJourney };
};