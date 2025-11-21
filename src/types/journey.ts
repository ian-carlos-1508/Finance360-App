/* File: src/types/journey.ts */

// Note: Assuming these external types and interfaces are defined and correct
export type ProgressStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';

/**
 * Defines a single Actionable Module (e.g., Budgets, Goals, Investments).
 */
export interface JourneyModule {
    id: string; // e.g., 'm-budget', 'm-goals'
    title: string; // e.g., 'Assign Budgets'
    path: string; // The URL path to the module page
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
 * The root structure returned by the API/Service.
 */
export interface FinancialJourney {
    onboardingComplete: boolean; 
    currentStepId: JourneyStep['id'] | null;
    steps: JourneyStep[];
    
    userLevel?: number;
    userXP?: number;

    // NEW: Streak Data Structure
    streak?: {
        currentStreak: number;
        lastActiveDate: string | null;
    };
}