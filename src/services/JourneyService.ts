import { supabase } from '../lib/supabaseClient';
import type { FinancialJourney, JourneyStep, JourneyModule, ProgressStatus } from '../types/journey';

// --- Helper Interfaces for DB Responses ---
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
  unlocked_stages: string[]; // JSONB comes back as array of strings
  has_financial_drag: boolean;
}

interface BudgetDB {
  limit_amount: number;
  spent_amount: number;
}

// --- Helper: Calculate Status ---
const checkStatus = (isCompleted: boolean): ProgressStatus => {
  return isCompleted ? 'COMPLETED' : 'PENDING';
};

class JourneyService {

  async calculateJourneyStatus(userId: string): Promise<FinancialJourney> {
    
    // =================================================
    // 1. FETCH DATA (Parallel Requests for Speed)
    // =================================================
    
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [healthResponse, gameResponse, budgetResponse, accountResponse] = await Promise.all([
      // A. Financial Health (RPC)
      supabase.rpc('fn_get_financial_health_summary', { p_start_date: startOfYear, p_end_date: today }),
      
      // B. Game Profile (The Source of Truth for Levels)
      supabase.from('game_profiles').select('*').eq('user_id', userId).single(),

      // C. Budget Data (For Scores)
      supabase.from('budgets').select('limit_amount, spent_amount').eq('user_id', userId),

      // D. Account Count (For Onboarding)
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    // Extract Data safely
    const health = (healthResponse.data && healthResponse.data[0]) ? (healthResponse.data[0] as FinancialHealthRPC) : null;
    const gameProfile = (gameResponse.data) ? (gameResponse.data as GameProfileDB) : null;
    const budgets = (budgetResponse.data || []) as unknown as BudgetDB[];
    const hasAccounts = (accountResponse.count || 0) > 0;

    // =================================================
    // 2. CALCULATE METRICS (For UI Visuals only)
    // =================================================

    // Budget Score Calculation
    let totalBudgetLimit = 0;
    let totalBudgetSpent = 0;
    budgets.forEach(b => { totalBudgetLimit += b.limit_amount; totalBudgetSpent += b.spent_amount; });
    
    const budgetScore = totalBudgetLimit > 0 
        ? (totalBudgetSpent <= totalBudgetLimit ? 100 : Math.round((totalBudgetLimit / totalBudgetSpent) * 100))
        : 0;

    // Health Metrics Extraction
    const monthsSafety = health?.emergency_fund_months || 0;
    const investmentRatio = health?.investment_asset_ratio || 0;
    
    // Unlock Checks (Read directly from DB)
    const unlockedStages = gameProfile?.unlocked_stages || ['control'];

    // =================================================
    // 3. BUILD THE JOURNEY (Mapped to Game State)
    // =================================================

    // --- LEVEL 1: CONTROL ---
    const isControlUnlocked = unlockedStages.includes('control');
    
    const step1Modules: JourneyModule[] = [
        {
            id: 'm-track',
            title: 'Track Transactions',
            path: '/transactions-hub', 
            status: checkStatus(hasAccounts), 
            benefitStatement: 'Log your daily activity to get a crystal clear picture.',
        },
        {
            id: 'm-budget',
            title: 'Assign Budgets',
            path: '/budgets',
            status: checkStatus(budgets.length > 0),
            benefitStatement: 'Ensure a monthly surplus by giving every dollar a purpose.',
        },
    ];

    const step1: JourneyStep = {
        id: 'control',
        title: 'Cash Flow Mastery',
        icon: '🎛️',
        // Logic: If locked, show LOCKED. If unlocked, check if finished.
        status: isControlUnlocked 
            ? (step1Modules.every(m => m.status === 'COMPLETED') ? 'COMPLETED' : 'IN_PROGRESS') 
            : 'LOCKED',
        progressPercent: Math.round((step1Modules.filter(m => m.status === 'COMPLETED').length / step1Modules.length) * 100),
        modules: step1Modules,
        microScore: { label: 'Budget Score', value: `${budgetScore}%`, goal: '95%+' }
    };

    // --- LEVEL 2: BUILD ---
    const isBuildUnlocked = unlockedStages.includes('build');
    const isEmergencyFundGood = monthsSafety >= 3; 

    const step2Modules: JourneyModule[] = [
        {
            id: 'm-dti',
            title: 'Reduce High-Interest Debt',
            path: '/planners/debt',
            // Logic: If 'has_financial_drag' is FALSE, user is done with bad debt.
            status: checkStatus(gameProfile?.has_financial_drag === false),
            benefitStatement: 'Use the Debt Planner to save on interest.',
        },
        {
            id: 'm-efund',
            title: 'Fund Your Emergency Goal',
            path: '/goals',
            status: checkStatus(isEmergencyFundGood),
            benefitStatement: 'Fund your EF to unlock financial peace.',
        },
    ];

    const step2: JourneyStep = {
        id: 'build',
        title: 'Security & Savings',
        icon: '🛡️',
        status: isBuildUnlocked 
            ? (step2Modules.every(m => m.status === 'COMPLETED') ? 'COMPLETED' : 'IN_PROGRESS') 
            : 'LOCKED',
        progressPercent: Math.round((step2Modules.filter(m => m.status === 'COMPLETED').length / step2Modules.length) * 100),
        modules: step2Modules,
        microScore: { label: 'Liquidity', value: `${monthsSafety.toFixed(1)} mo`, goal: '3.0+ mo' }
    };

    // --- LEVEL 3: OPTIMIZE ---
    const isOptimizeUnlocked = unlockedStages.includes('optimize');
    const isInvested = investmentRatio >= 0.20;

    const step3Modules: JourneyModule[] = [
        {
            id: 'm-invest',
            title: 'Optimize Investments',
            path: '/planners/investment',
            status: checkStatus(isInvested),
            benefitStatement: 'Move capital into growth assets.',
        },
        {
            id: 'm-report',
            title: 'Formal Financial Review',
            path: '/analytics/reports',
            status: 'PENDING', 
            benefitStatement: 'Run a formal review to align your portfolio.',
        }
    ];

    const step3: JourneyStep = {
        id: 'optimize',
        title: 'Wealth & Analysis',
        icon: '🚀',
        status: isOptimizeUnlocked ? 'IN_PROGRESS' : 'LOCKED',
        progressPercent: Math.round((step3Modules.filter(m => m.status === 'COMPLETED').length / step3Modules.length) * 100),
        modules: step3Modules,
        microScore: { label: 'Inv. Ratio', value: `${(investmentRatio * 100).toFixed(0)}%`, goal: '20%+' }
    };

    const allSteps = [step1, step2, step3];
    
    // Logic: Find the first step that is NOT Completed and NOT Locked.
    // If everything is locked/completed, default to the first one.
    const currentStep = allSteps.find(step => step.status !== 'COMPLETED' && step.status !== 'LOCKED') || allSteps[0];

    return {
        onboardingComplete: hasAccounts,
        currentStepId: currentStep.id,
        steps: allSteps,
        // Pass Game Stats to Frontend
        userLevel: gameProfile?.current_level || 1,
        userXP: gameProfile?.current_xp || 0
    };
  }
}

export default new JourneyService();