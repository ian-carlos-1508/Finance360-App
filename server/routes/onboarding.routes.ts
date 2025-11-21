/* File: server/routes/onboarding.routes.ts */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

const router = Router();

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { userId, cashAccounts, creditCards, loans, investments } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // --- 1. INSERT CASH ACCOUNTS (Checking/Savings) ---
    if (cashAccounts && cashAccounts.length > 0) {
      const formattedCash = cashAccounts.map((acc: any) => ({
        user_id: userId,
        account_name: acc.name,
        type: acc.type.toLowerCase(), // 'checking', 'savings'
        // FIX: Map to correct DB columns
        initial_balance: parseFloat(acc.balance),
        current_balance: parseFloat(acc.balance),
        is_active: true
      }));

      const { error } = await supabase.from('accounts').insert(formattedCash);
      if (error) throw new Error(`Cash Account Error: ${error.message}`);
    }

    // --- 2. INSERT CREDIT CARDS (Accounts Table) ---
    if (creditCards && creditCards.length > 0) {
      const formattedCredit = creditCards.map((cc: any) => ({
        user_id: userId,
        account_name: cc.name,
        type: 'credit',
        // Logic: DB stores credit as negative balance for Net Worth calc logic in your SQL
        initial_balance: parseFloat(cc.balance) * -1,
        current_balance: parseFloat(cc.balance) * -1,
        credit_limit: parseFloat(cc.limit || 0),
        is_active: true
      }));

      const { error } = await supabase.from('accounts').insert(formattedCredit);
      if (error) throw new Error(`Credit Card Error: ${error.message}`);
    }

    // --- 3. INSERT LOANS (Debts Table) ---
    if (loans && loans.length > 0) {
      const formattedLoans = loans.map((loan: any) => ({
        user_id: userId,
        debt_name: loan.name,
        current_balance: parseFloat(loan.balance), // Loans usually positive in debt table
        interest_rate_apr: parseFloat(loan.rate || 0),
        minimum_payment: parseFloat(loan.payment || 0),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('debts').insert(formattedLoans);
      if (error) throw new Error(`Loan Error: ${error.message}`);
    }

    // --- 4. INSERT INVESTMENTS (Investments Table) ---
    if (investments && investments.length > 0) {
      const formattedInvestments = investments.map((inv: any) => ({
        user_id: userId,
        name: inv.name,
        type: inv.type || 'Asset',
        ticker: 'MANUAL', // Placeholder since wizard doesn't ask for ticker
        quantity: 1,      // 1 Unit
        current_price: parseFloat(inv.balance), // Price = Total Value
        average_price: parseFloat(inv.balance),
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('investments').insert(formattedInvestments);
      if (error) throw new Error(`Investment Error: ${error.message}`);
    }

    res.status(200).json({ success: true, message: 'Onboarding complete' });

  } catch (error: any) {
    console.error('[Onboarding] Failure:', error);
    res.status(500).json({ 
      error: 'Failed to save data', 
      details: error.message || error 
    });
  }
});

export default router;