/* File: src/services/JourneyService.ts */

import { supabase } from '../lib/supabaseClient';
import type { FinancialJourney, JourneyStep, JourneyModule, ProgressStatus } from '../types/journey';

// --- STREAK HELPER FUNCTIONS ---

// Helper to subtract days (used to compare against dates fetched from DB)
const subtractDays = (date: Date, days: number): string => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate.toISOString().split('T')[0];
};

const todayISO = new Date().toISOString().split('T')[0];
const yesterdayISO = subtractDays(new Date(), 1);


// --- CORE STREAK CALCULATION LOGIC ---
async function calculateUserStreak(): Promise<FinancialJourney['streak']> {
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
        return { currentStreak: 0, lastActiveDate: null };
    }

    // RPC: Fetch all unique dates where the user logged XP (sorted descending)
    const { data: datesData, error } = await supabase.rpc('get_unique_xp_dates');

    if (error || !datesData || datesData.length === 0) {
        return { currentStreak: 0, lastActiveDate: null };
    }

    const uniqueDates: string[] = datesData.map((d: { date: string }) => d.date);
    
    let currentStreak = 0;
    let lastActiveDate: string | null = uniqueDates[0];
    let expectedDate = lastActiveDate;
    
    // 1. Check if the streak is active (today or yesterday)
    if (lastActiveDate !== todayISO && lastActiveDate !== yesterdayISO) {
        return { currentStreak: 0, lastActiveDate };
    }

    // 2. Iterate backwards through the dates
    for (const currentDate of uniqueDates) {
        if (currentDate === expectedDate) {
            currentStreak++;
            
            // Set the expected date for the next iteration (one day before the current one)
            const nextExpectedDate = subtractDays(new Date(currentDate), 1);
            expectedDate = nextExpectedDate;
        } else {
            // Streak broken
            break;
        }
    }
    
    return { currentStreak, lastActiveDate };
}


// --- EXISTING INTERFACES (MUST BE PRESENT) ---
interface FinancialHealthRPC {
    monthly_surplus: number;
    total_liabilities: number;
    net_worth: number;
    emergency_fund_months: number;
    investment_asset_ratio: number;
}
interface GameProfileDB {
    current_level: number;
    current_xp: number;
    unlocked_stages: string[];
    has_financial_drag: boolean;
}
interface BudgetDB {
    limit_amount: number;
    spent_amount: number;
}
const checkStatus = (isCompleted: boolean): ProgressStatus => {
    return isCompleted ? 'COMPLETED' : 'PENDING';
};
// --- END EXISTING INTERFACES ---


class JourneyService {

  async calculateJourneyStatus(userId: string): Promise<FinancialJourney> {
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [healthResponse, gameResponse, budgetResponse, accountResponse] = await Promise.all([
      supabase.rpc('fn_get_financial_health_summary', { p_start_date: startOfYear, p_end_date: today }),
      supabase.from('game_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('budgets').select('limit_amount, spent_amount').eq('user_id', userId),
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    // Extract Data
    const health = (healthResponse.data && healthResponse.data[0]) ? (healthResponse.data[0] as FinancialHealthRPC) : null;
    const gameProfile = (gameResponse.data) ? (gameResponse.data as GameProfileDB) : null;
    const budgets = (budgetResponse.data || []) as unknown as BudgetDB[];
    const hasAccounts = (accountResponse.count || 0) > 0;

    // --- CALCULATE STREAK ---
    const streakData = await calculateUserStreak();

    // ... (Keep existing Metrics/Unlock logic unchanged) ...
    let totalBudgetLimit = 0;
    let totalBudgetSpent = 0;
    budgets.forEach(b => { totalBudgetLimit += b.limit_amount; totalBudgetSpent += b.spent_amount; });
    const budgetScore = totalBudgetLimit > 0 
        ? (totalBudgetSpent <= totalBudgetLimit ? 100 : Math.round((totalBudgetLimit / totalBudgetSpent) * 100))
        : 0;
    const monthsSafety = health?.emergency_fund_months || 0;
    const investmentRatio = health?.investment_asset_ratio || 0;
    const unlockedStages = gameProfile?.unlocked_stages || ['control'];

    // --- STEP 1: CONTROL ---
    const isControlUnlocked = unlockedStages.includes('control');
    const step1Modules: JourneyModule[] = [
        { id: 'm-track', title: 'Track Transactions', path: '/transactions-hub', status: checkStatus(hasAccounts), benefitStatement: 'Log your daily activity to get a crystal clear picture.' },
        { id: 'm-budget', title: 'Assign Budgets', path: '/budgets', status: checkStatus(budgets.length > 0), benefitStatement: 'Ensure a monthly surplus by giving every dollar a purpose.' },
    ];
    const step1: JourneyStep = {
        id: 'control', title: 'Cash Flow Mastery', icon: '🎛️',
        status: isControlUnlocked ? (step1Modules.every(m => m.status === 'COMPLETED') ? 'COMPLETED' : 'IN_PROGRESS') : 'LOCKED',
        progressPercent: Math.round((step1Modules.filter(m => m.status === 'COMPLETED').length / step1Modules.length) * 100),
        modules: step1Modules, microScore: { label: 'Budget Score', value: `${budgetScore}%`, goal: '95%+' }
    };

    // --- STEP 2: BUILD ---
    const isBuildUnlocked = unlockedStages.includes('build');
    const isEmergencyFundGood = monthsSafety >= 3; 
    const step2Modules: JourneyModule[] = [
        { id: 'm-dti', title: 'Reduce High-Interest Debt', path: '/planners/debt', status: checkStatus(gameProfile?.has_financial_drag === false), benefitStatement: 'Use the Debt Planner to save on interest.' },
        { id: 'm-efund', title: 'Fund Your Emergency Goal', path: '/goals', status: checkStatus(isEmergencyFundGood), benefitStatement: 'Fund your EF to unlock financial peace.' },
    ];
    const step2: JourneyStep = {
        id: 'build', title: 'Security & Savings', icon: '🛡️',
        status: isBuildUnlocked ? (step2Modules.every(m => m.status === 'COMPLETED') ? 'COMPLETED' : 'IN_PROGRESS') : 'LOCKED',
        progressPercent: Math.round((step2Modules.filter(m => m.status === 'COMPLETED').length / step2Modules.length) * 100),
        modules: step2Modules, microScore: { label: 'Liquidity', value: `${monthsSafety.toFixed(1)} mo`, goal: '3.0+ mo' }
    };

    // --- STEP 3: OPTIMIZE ---
    const isOptimizeUnlocked = unlockedStages.includes('optimize');
    const isInvested = investmentRatio >= 0.20;
    const step3Modules: JourneyModule[] = [
        { id: 'm-invest', title: 'Optimize Investments', path: '/planners/investment', status: checkStatus(isInvested), benefitStatement: 'Move capital into growth assets.' },
        { id: 'm-report', title: 'Formal Financial Review', path: '/analytics/reports', status: 'PENDING', benefitStatement: 'Run a formal review to align your portfolio.' }
    ];
    const step3: JourneyStep = {
        id: 'optimize', title: 'Wealth & Analysis', icon: '🚀',
        status: isOptimizeUnlocked ? 'IN_PROGRESS' : 'LOCKED',
        progressPercent: Math.round((step3Modules.filter(m => m.status === 'COMPLETED').length / step3Modules.length) * 100),
        modules: step3Modules, microScore: { label: 'Inv. Ratio', value: `${(investmentRatio * 100).toFixed(0)}%`, goal: '20%+' }
    };

    const allSteps = [step1, step2, step3];
    const currentStep = allSteps.find(step => step.status !== 'COMPLETED' && step.status !== 'LOCKED') || allSteps[0];


    return {
        onboardingComplete: hasAccounts,
        currentStepId: currentStep.id,
        steps: allSteps,
        userLevel: gameProfile?.current_level || 1,
        userXP: gameProfile?.current_xp || 0,
        // NEW: Return Streak Data
        streak: streakData
    };
  }
}

export default new JourneyService();