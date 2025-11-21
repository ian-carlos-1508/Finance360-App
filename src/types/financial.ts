/* File: src/types/financial.ts */

export type HealthData = {
  total_income: number;
  total_expense: number;
  total_needs: number;
  total_wants: number;
  total_savings: number;
  avg_monthly_income: number;
  avg_monthly_expenses: number;
  avg_monthly_needs: number;
  monthly_surplus: number;
  savings_rate: number;
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
  total_liquid_assets: number;
  total_investments: number;
  total_real_estate: number;
  total_assets: number;
  total_credit_liabilities: number;
  total_loan_liabilities: number;
  total_liabilities: number;
  net_worth: number;
  total_monthly_debt_payment: number;
  dti_ratio: number;
  debt_to_asset_ratio: number;
  personal_current_ratio: number;
  emergency_fund_months: number;
  investment_asset_ratio: number;
};