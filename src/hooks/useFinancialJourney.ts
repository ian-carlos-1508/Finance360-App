import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; 
// UPDATED: Import from the client-side services folder
import JourneyService from '../services/JourneyService'; 
import type { FinancialJourney } from '../types/journey';

export const useFinancialJourney = () => {
    const [journey, setJourney] = useState<FinancialJourney | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJourney = async () => {
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
        };

        fetchJourney();
    }, []);

    return { journey, loading };
};