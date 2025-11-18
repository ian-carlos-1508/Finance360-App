/* Replace file: src/lib/debtCalculator.ts */

export type Debt = {
  id: string;
  name: string;
  balance: number; 
  apr: number; 
  minimumPayment: number;
};

export type AmortizationEntry = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

// --- FIX: Added debtId to the type ---
export type DebtPayoffResult = {
  debtId: string;
  debtName: string;
  payoffMonths: number;
  totalInterest: number;
  totalPaid: number;
  amortization: AmortizationEntry[];
};

export type PayoffSummary = {
  strategy: 'Avalanche' | 'Snowball';
  totalMonths: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: DebtPayoffResult[];
};

export function calculatePayoff(
  debts: Debt[],
  strategy: 'Avalanche' | 'Snowball',
  extraPayment: number = 0
): PayoffSummary {
  
  let activeDebts = debts.map(d => ({ ...d, balance: d.balance }));
  const totalMinimumPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalMonthlyPayment = totalMinimumPayments + extraPayment;

  if (strategy === 'Avalanche') {
    activeDebts.sort((a, b) => {
      if (a.apr !== b.apr) return b.apr - a.apr;
      return a.balance - b.balance;
    });
  } else {
    activeDebts.sort((a, b) => {
      if (a.balance !== b.balance) return a.balance - b.balance;
      return b.apr - a.apr;
    });
  }
  
  // Create a tracking object for results
  const results: { [key: string]: DebtPayoffResult } = {};
  activeDebts.forEach(d => {
    results[d.id] = {
      // --- FIX: Added debtId to the object ---
      debtId: d.id, 
      debtName: d.name,
      payoffMonths: 0,
      totalInterest: 0,
      totalPaid: 0,
      amortization: [],
    };
  });

  let currentMonth = 0;
  
  while (activeDebts.length > 0) {
    currentMonth++;
    let paymentSnowball = totalMonthlyPayment; 
    let paidOffThisMonth: string[] = [];

    // 1. Pay minimums on all debts *except* the target
    for (let i = 1; i < activeDebts.length; i++) {
      const debt = activeDebts[i];
      const monthlyInterest = (debt.balance * (debt.apr / 100)) / 12;
      const payment = debt.minimumPayment;
      const principal = payment - monthlyInterest;

      debt.balance -= principal;
      paymentSnowball -= payment; 
      results[debt.id].totalInterest += monthlyInterest;
      results[debt.id].totalPaid += payment;
      results[debt.id].amortization.push({
        month: currentMonth,
        payment,
        principal,
        interest: monthlyInterest,
        remainingBalance: debt.balance,
      });

      if (debt.balance <= 0) {
        paidOffThisMonth.push(debt.id);
      }
    }
    
    // 2. Pay the rest (the "snowball") on the target debt
    const targetDebt = activeDebts[0];
    if (targetDebt) {
      const monthlyInterest = (targetDebt.balance * (targetDebt.apr / 100)) / 12;
      let payment = paymentSnowball; 

      if (targetDebt.balance + monthlyInterest <= payment) {
        payment = targetDebt.balance + monthlyInterest;
        paidOffThisMonth.push(targetDebt.id);
        results[targetDebt.id].payoffMonths = currentMonth;
      }
      
      const principal = payment - monthlyInterest;
      targetDebt.balance -= principal;
      
      results[targetDebt.id].totalInterest += monthlyInterest;
      results[targetDebt.id].totalPaid += payment;
      results[targetDebt.id].amortization.push({
        month: currentMonth,
        payment,
        principal,
        interest: monthlyInterest,
        remainingBalance: targetDebt.balance,
      });
    }

    activeDebts = activeDebts.filter(d => !paidOffThisMonth.includes(d.id));
    
    if (currentMonth > 1200) break; 
  }

  // 8. Compile the final summary
  const finalPayoffOrder = debts.map(d => results[d.id]).sort((a, b) => {
    return a.payoffMonths - b.payoffMonths;
  });
  
  const totalPaid = finalPayoffOrder.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalInterestPaid = finalPayoffOrder.reduce((sum, r) => sum + r.totalInterest, 0);

  return {
    strategy,
    totalMonths: currentMonth,
    totalInterestPaid,
    totalPaid,
    payoffOrder: finalPayoffOrder,
  };
}