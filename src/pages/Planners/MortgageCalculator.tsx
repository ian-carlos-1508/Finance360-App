/* Replace file: src/pages/Planners/MortgageCalculator.tsx */

import { useState, useMemo } from 'react';
import styles from './MortgageCalculator.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';

// ... (Type definitions and helper functions remain the same) ...
type YearlyData = {
  year: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
};
type CalcResult = {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  amortizationData: YearlyData[];
};
function calculateMortgage(
  principal: number,
  rate: number,
  termInYears: number
) {
  if (principal <= 0 || rate <= 0 || termInYears <= 0) return 0;
  const monthlyRate = rate / 100 / 12;
  const numberOfPayments = termInYears * 12;
  return (
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  );
}

function MortgageCalculator() {
  const [loanAmount, setLoanAmount] = useState('300000');
  const [interestRate, setInterestRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState('30');

  const { monthlyPayment, totalInterest, totalCost, amortizationData } =
    useMemo((): CalcResult => {
      // ... (useMemo logic is unchanged) ...
      const P = parseFloat(loanAmount) || 0;
      const rate = parseFloat(interestRate) || 0;
      const term = parseInt(loanTerm, 10) || 0;
      const monthlyPayment = calculateMortgage(P, rate, term);
      const totalCost = monthlyPayment * term * 12;
      const totalInterest = totalCost - P;
      const data: YearlyData[] = [];
      let remainingBalance = P;
      const monthlyRate = rate / 100 / 12;
      for (let year = 1; year <= term; year++) {
        let interestYear = 0;
        let principalYear = 0;
        for (let month = 1; month <= 12; month++) {
          const interestMonth = remainingBalance * monthlyRate;
          const principalMonth = monthlyPayment - interestMonth;
          interestYear += interestMonth;
          principalYear += principalMonth;
          remainingBalance -= principalMonth;
        }
        data.push({
          year: year,
          interestPaid: interestYear,
          principalPaid: principalYear,
          remainingBalance: remainingBalance < 0 ? 0 : remainingBalance,
        });
      }
      return {
        monthlyPayment,
        totalInterest,
        totalCost,
        amortizationData: data,
      };
    }, [loanAmount, interestRate, loanTerm]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Mortgage Calculator</h1>
        <Link to="/planners" className={styles.backButton}>
          &larr; Back to Planners
        </Link>
      </div>

      {/* --- MODIFIED: Calculator Grid Layout --- */}
      <div className={styles.calculatorGrid}>
        {/* Item 1: Inputs (Now a grid item) */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Loan Details</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>Loan Amount</label>
            <div className={styles.inputGroup}>
              <span className={styles.inputAddonSymbol}>$</span>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className={styles.inputWithAddon}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Interest Rate (%)</label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Loan Term (Years)</label>
            <input
              type="number"
              value={loanTerm}
              onChange={(e) => setLoanTerm(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        {/* Item 2: KPIs (Now a grid item) */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Monthly Payment (P&I)</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(monthlyPayment)}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Total Interest Paid</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(totalInterest)}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Total Cost of Loan</h3>
            <p className={styles.kpiValue}>{formatCurrency(totalCost)}</p>
          </div>
        </div>

        {/* Item 3: Amortization Table (Now a grid item) */}
        <div className={styles.tableCard}>
          {/* --- MODIFIED: Added styles.tableTitle --- */}
          <h2 className={styles.tableTitle}>Amortization Schedule</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.tableHeader}>Year</th>
                  <th className={styles.tableHeader}>Principal Paid</th>
                  <th className={styles.tableHeader}>Interest Paid</th>
                  <th className={styles.tableHeader}>Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {amortizationData.map((row) => (
                  <tr key={row.year}>
                    <td className={styles.tableCellYear}>{row.year}</td>
                    <td className={styles.tableCell}>
                      {formatCurrency(row.principalPaid)}
                    </td>
                    <td className={styles.tableCell}>
                      {formatCurrency(row.interestPaid)}
                    </td>
                    <td className={styles.tableCell}>
                      {formatCurrency(row.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MortgageCalculator;