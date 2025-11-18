/* Create file: src/pages/Goals/types.ts */

// This type definition is shared by Goals.tsx and AddGoalModal.tsx
export type Goal = {
  goal_id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  linked_account_id: string | null;
  monthly_contribution: number | null;
};