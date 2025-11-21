// src/types/journey.ts

/**
 * ====================================
 * JOURNEY TYPE DEFINITIONS
 * Defines the structure for the gamified financial journey progress.
 * ====================================
 */

// UPDATED: Added 'LOCKED' so TypeScript accepts the gatekeeper logic
export type ProgressStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';

/**
 * Defines a single Actionable Module (e.g., Budgets, Goals, Investments).
 * This structure drives the navigation and the Next Action Card.
 */
export interface JourneyModule {
    id: string; // e.g., 'm-budget', 'm-goals'
    title: string; // e.g., 'Assign Budgets'
    path: string; // The URL path to the module page
    status: ProgressStatus;
    // The short, compelling benefit statement for the Next Action Card
    benefitStatement?: string; 
}

/**
 * Defines a major Step (Control, Build, Optimize).
 */
export interface JourneyStep {
    id: 'control' | 'build' | 'optimize';
    title: string; // e.g., 'Cash Flow Mastery'
    icon: string; // e.g., '🎛️'
    status: ProgressStatus;
    // Calculated based on module completion (0-100)
    progressPercent: number; 
    modules: JourneyModule[];
    // Scorecard data displayed in the sidebar (optional)
    microScore?: {
        label: string; // e.g., 'Budget Adherence'
        value: string; // e.g., '92%'
        goal: string; // e.g., '95%+'
    };
}

/**
 * The root structure returned by the API.
 */
export interface FinancialJourney {
    // Check for wizard completion as the first gate
    onboardingComplete: boolean; 
    currentStepId: JourneyStep['id'] | null; // The lowest incomplete step
    steps: JourneyStep[];
    
    // UPDATED: Added Gamification Stats
    userLevel?: number;
    userXP?: number;
}