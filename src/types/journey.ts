/* File: src/types/journey.ts */

export type ProgressStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';

/**
 * Defines a single Actionable Module (e.g., Budgets, Goals, Investments).
 */
export interface JourneyModule {
    id: string; 
    title: string; 
    path: string; 
    instruction?: string; 
    xp_reward: number; 
    status: ProgressStatus;
    benefitStatement?: string; 
}

/**
 * Defines a major Step (Control, Build, Optimize).
 */
export interface JourneyStep {
    id: 'control' | 'build' | 'optimize';
    title: string; 
    icon: string;
    status: ProgressStatus;
    progressPercent: number; 
    modules: JourneyModule[];
    microScore?: {
        label: string;
        value: string;
        goal: string;
    };
}

/**
 * The root structure returned by the JourneyService.
 */
export interface FinancialJourney {
    onboardingComplete: boolean; 
    currentStepId: JourneyStep['id'] | null;
    steps: JourneyStep[];
    userLevel?: number;
    userXP?: number;
    rankStatus?: 'CONFIRMED' | 'PROBATION'; 
    streak?: {
        currentStreak: number;
        lastActiveDate: string | null;
    };
}

/**
 * Analytics data for the Tier 1 Flight Manual.
 */
export interface FlightManualData {
    tx_count: number;
    budget_count: number;
    streak_days: number;
    current_surplus: number;
    three_month_surplus: number;
}

/**
 * Analytics data for the Tier 2 Build Hub.
 */
export interface BuildHubData {
    total_cash: number;
    avg_expense: number;
    liquidity_months: number;
    toxic_debt: number;
    strategic_debt: number;
    debt_accounts: {
        account_id: string;
        account_name: string;
        current_balance: number;
        interest_rate: number;
        type: string;
    }[];
}