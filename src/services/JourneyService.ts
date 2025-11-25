import { supabase } from '../lib/supabaseClient';
import type { FinancialJourney, JourneyStep, JourneyModule, ProgressStatus, FlightManualData } from '../types/journey';

// --- HELPER: Date Manipulation ---
const subtractDays = (date: Date, days: number): string => {
    const newDate = new Date(date);
    const newDate2 = new Date(newDate.setDate(newDate.getDate() - days));
    return newDate2.toISOString().split('T')[0];
};

// --- HELPER: Formatting ---
const formatMoney = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return sign + new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0, 
    }).format(amount);
};

const todayISO = new Date().toISOString().split('T')[0];
const yesterdayISO = subtractDays(new Date(), 1);

// --- HELPER: Streak Calculation ---
async function calculateUserStreak(): Promise<FinancialJourney['streak']> {
    const { data: user } = await supabase.auth.getUser();
    if (!user) return { currentStreak: 0, lastActiveDate: null };

    const { data: datesData, error } = await supabase.rpc('get_unique_xp_dates');
    if (error || !datesData || datesData.length === 0) {
        return { currentStreak: 0, lastActiveDate: null };
    }
    
    // Simple logic to count consecutive days
    const uniqueDates: string[] = datesData.map((d: { date: string }) => d.date);
    let currentStreak = 0;
    let lastActiveDate: string | null = uniqueDates[0];
    let expectedDate = lastActiveDate;
    
    if (lastActiveDate !== todayISO && lastActiveDate !== yesterdayISO) {
        return { currentStreak: 0, lastActiveDate };
    }

    for (const currentDate of uniqueDates) {
        if (currentDate === expectedDate) {
            currentStreak++;
            expectedDate = subtractDays(new Date(currentDate), 1);
        } else {
            break;
        }
    }
    return { currentStreak, lastActiveDate };
}

class JourneyService {

  // --- MAIN METHOD: Calculates the User's Game State ---
  async calculateJourneyStatus(userId: string): Promise<FinancialJourney> {
    const now = new Date();
    
    // Date Range: Current Month (for Surplus Calculation)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // 1. Fetch Data in Parallel (Restored Original Calls)
    const [
        healthRes, 
        profileRes, 
        questsRes, 
        userQuestsRes
    ] = await Promise.all([
        // Fetches heavy math (Net Worth, Savings Rate) + Monthly Surplus
        supabase.rpc('fn_get_financial_health_summary', { p_start_date: startOfMonth, p_end_date: today }),
        supabase.from('game_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('quests').select('*').order('id'),
        supabase.from('user_quests').select('*').eq('user_id', userId)
    ]);

    const health = healthRes.data?.[0] || {};
    
    // Default to 'CONFIRMED'/Level 1 if profile is missing/loading
    const profile = profileRes.data || { 
        current_level: 1, 
        current_xp: 0, 
        unlocked_stages: ['control'], 
        rank_status: 'CONFIRMED' 
    };
    
    const allQuests = questsRes.data || [];
    const userProgress = userQuestsRes.data || [];
    
    // --- THE RESTORED LOGIC: Dynamic Onboarding Check ---
    // Instead of SQL flags, we just check: Does the user have any money or debt?
    // If Assets = 0 AND Liabilities = 0, they are new.
    const totalAssets = Number(health.total_assets || 0);
    const totalLiabilities = Number(health.total_liabilities || 0);
    const hasFinancialData = totalAssets > 0 || totalLiabilities > 0;

    // --- KPI: Calculate Surplus Score ---
    const rawSurplus = Number(health.monthly_surplus || 0);
    const surplusDisplay = formatMoney(rawSurplus);

    // 2. Helper: Determine Status based STRICTLY on Database State
    const getQuestStatus = (quest: any): ProgressStatus => {
        // A. Is it marked complete in the DB?
        const userEntry = userProgress.find((up: any) => up.quest_id === quest.id);
        if (userEntry?.status === 'COMPLETED') return 'COMPLETED';

        // B. If not complete, is it Unlocked based on Tier?
        const tierMap: Record<string, string> = { 'CONTROL': 'control', 'BUILD': 'build', 'OPTIMIZE': 'optimize' };
        const stage = tierMap[quest.category];
        
        // Check if the stage is in the user's unlocked array (handling JSONB)
        if (profile.unlocked_stages && profile.unlocked_stages.includes(stage)) {
             return 'IN_PROGRESS';
        }
        
        return 'LOCKED';
    };

    // 3. Helper: Map Quests to Frontend Modules
    // Uses Dynamic fields (link, instruction, xp_reward) from Database
    const mapToModules = (category: string): JourneyModule[] => {
        return allQuests
            .filter((q: any) => q.category === category)
            .map((q: any) => ({
                id: q.slug,
                title: q.title,
                path: q.link || '/dashboard', 
                instruction: q.instruction || 'COMPLETE OBJECTIVE TO ADVANCE.',
                xp_reward: q.xp_reward || 0, 
                status: getQuestStatus(q),
                benefitStatement: q.description
            }));
    };

    // 4. Build Steps (View Model) - INCLUDES BUILD HUB CHANGES
    const steps: JourneyStep[] = [
        {
            id: 'control',
            title: 'Cash Flow Mastery',
            icon: '🎛️',
            status: profile.unlocked_stages.includes('control') ? 'IN_PROGRESS' : 'LOCKED',
            progressPercent: 0, 
            // Micro-Score: Monthly Surplus
            microScore: { label: 'Mthly Surplus', value: surplusDisplay, goal: '> $0' }, 
            modules: mapToModules('CONTROL')
        },
        {
            id: 'build',
            title: 'Security & Savings',
            icon: '🛡️',
            status: profile.unlocked_stages.includes('build') ? 'IN_PROGRESS' : 'LOCKED',
            progressPercent: 0,
            // Micro-Score: Liquidity (Uses existing health data)
            microScore: { label: 'Liquidity', value: `${Number(health.emergency_fund_months || 0).toFixed(1)} mo`, goal: '3.0 mo' },
            modules: mapToModules('BUILD')
        },
        {
            id: 'optimize',
            title: 'Wealth & Analysis',
            icon: '🚀',
            status: profile.unlocked_stages.includes('optimize') ? 'IN_PROGRESS' : 'LOCKED',
            progressPercent: 0,
            // Micro-Score: Investment Ratio
            microScore: { label: 'Inv. Ratio', value: `${(Number(health.investment_asset_ratio || 0) * 100).toFixed(0)}%`, goal: '20%' },
            modules: mapToModules('OPTIMIZE')
        }
    ];

    // Calculate Progress % based on Completed Quests
    steps.forEach(step => {
        const completed = step.modules.filter((m: JourneyModule) => m.status === 'COMPLETED').length;
        step.progressPercent = step.modules.length > 0 ? Math.round((completed / step.modules.length) * 100) : 0;
        if (step.progressPercent === 100) step.status = 'COMPLETED';
    });

    const streakData = await calculateUserStreak();

    return {
        onboardingComplete: hasFinancialData, // <--- DYNAMIC: True if they have assets/debt
        currentStepId: steps.find((s: JourneyStep) => s.status === 'IN_PROGRESS')?.id || 'control',
        steps,
        userLevel: profile.current_level,
        userXP: profile.current_xp,
        rankStatus: profile.rank_status, // 'CONFIRMED' or 'PROBATION'
        streak: streakData
    };
  }

  // --- ANALYTICS METHOD: Fetches Flight Manual Stats ---
  async getFlightManualData(userId: string): Promise<FlightManualData | null> {
      const { data, error } = await supabase.rpc('get_flight_manual_progress', { p_user_id: userId });
      if (error) {
          console.error("Flight Manual RPC Error:", error);
          return null;
      }
      return data as FlightManualData;
  }
}

export default new JourneyService();