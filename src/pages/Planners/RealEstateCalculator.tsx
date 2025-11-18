import { useState, useMemo } from 'react';
import styles from './RealEstateCalculator.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { formatCurrency, formatPercent } from '../../lib/utils'; // Assuming utils

// Helper function to calculate mortgage payment (Principal & Interest)
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

// Type definitions for clarity
type PropertyInputs = {
  price: string;
  downPaymentPercent: string;
  interestRate: string;
  loanTerm: string;
};

type IncomeInputs = {
  monthlyRent: string;
  vacancyRate: string;
};

type ExpenseInputs = {
  propertyTax: string; // Annual
  insurance: string; // Annual
  repairs: string; // % of rent
  hoa: string; // Monthly
};

type Metrics = {
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  noi: number;
  totalCashNeeded: number;
  monthlyMortgage: number;
};

function RealEstateCalculator() {
  const [property, setProperty] = useState<PropertyInputs>({
    price: '300000',
    downPaymentPercent: '20',
    interestRate: '6.5',
    loanTerm: '30',
  });

  const [income, setIncome] = useState<IncomeInputs>({
    monthlyRent: '2500',
    vacancyRate: '5',
  });

  const [expenses, setExpenses] = useState<ExpenseInputs>({
    propertyTax: '3600',
    insurance: '1200',
    repairs: '5',
    hoa: '0',
  });

  const handlePropertyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProperty({ ...property, [e.target.name]: e.target.value });
  };
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncome({ ...income, [e.target.name]: e.target.value });
  };
  const handleExpenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpenses({ ...expenses, [e.target.name]: e.target.value });
  };

  const metrics: Metrics = useMemo(() => {
    // --- Parse All Inputs ---
    const pPrice = parseFloat(property.price) || 0;
    const pDownPercent = parseFloat(property.downPaymentPercent) || 0;
    const pRate = parseFloat(property.interestRate) || 0;
    const pTerm = parseFloat(property.loanTerm) || 0;

    const iRent = parseFloat(income.monthlyRent) || 0;
    const iVacancy = parseFloat(income.vacancyRate) || 0;

    const eTax = parseFloat(expenses.propertyTax) || 0;
    const eInsurance = parseFloat(expenses.insurance) || 0;
    const eRepairs = parseFloat(expenses.repairs) || 0;
    const eHoa = parseFloat(expenses.hoa) || 0;

    // --- Key Calculations ---
    const downPaymentAmount = pPrice * (pDownPercent / 100);
    const loanAmount = pPrice - downPaymentAmount;
    const totalCashNeeded = downPaymentAmount; // Simplified, could add closing costs

    // 1. Monthly Mortgage (P&I)
    const monthlyMortgage = calculateMortgage(loanAmount, pRate, pTerm);

    // 2. Monthly Income
    const monthlyGrossIncome = iRent;
    const monthlyVacancyLoss = iRent * (iVacancy / 100);
    const effectiveMonthlyIncome = monthlyGrossIncome - monthlyVacancyLoss;

    // 3. Monthly Expenses
    const monthlyTax = eTax / 12;
    const monthlyInsurance = eInsurance / 12;
    const monthlyRepairs = iRent * (eRepairs / 100);
    const monthlyHoa = eHoa;
    const totalMonthlyOpEx =
      monthlyTax + monthlyInsurance + monthlyRepairs + monthlyHoa;

    // 4. Net Operating Income (NOI) - Annual
    const annualRent = iRent * 12;
    const annualVacancyLoss = annualRent * (iVacancy / 100);
    const effectiveGrossIncome = annualRent - annualVacancyLoss;
    const annualOpEx = totalMonthlyOpEx * 12;
    const noi = effectiveGrossIncome - annualOpEx;

    // --- FINAL METRICS ---
    // Total Monthly Payment (PITI + Repairs + HOA)
    const totalMonthlyExpenses =
      monthlyMortgage + totalMonthlyOpEx;

    // 1. Monthly Cash Flow
    const monthlyCashFlow = effectiveMonthlyIncome - totalMonthlyExpenses;

    // 2. Cap Rate (NOI / Price)
    const capRate = pPrice > 0 ? (noi / pPrice) : 0;

    // 3. Cash on Cash Return (Annual Cash Flow / Total Cash)
    const annualCashFlow = monthlyCashFlow * 12;
    const cashOnCashReturn =
      totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) : 0;

    return {
      monthlyCashFlow,
      capRate,
      cashOnCashReturn,
      noi,
      totalCashNeeded,
      monthlyMortgage,
    };
  }, [property, income, expenses]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Real Estate Calculator</h1>
        <Link to="/planners" className={styles.backButton}>
          &larr; Back to Planners
        </Link>
      </div>

      {/* --- Results KPI Grid --- */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Est. Monthly Cash Flow</h3>
          <p className={styles.kpiValue} style={{ color: metrics.monthlyCashFlow >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(metrics.monthlyCashFlow)}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Cap Rate</h3>
          <p className={styles.kpiValue}>
            {formatPercent(metrics.capRate)}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Cash-on-Cash Return</h3>
          <p className={styles.kpiValue}>
            {formatPercent(metrics.cashOnCashReturn)}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <h3 className={styles.kpiTitle}>Total Cash Needed</h3>
          <p className={styles.kpiValue}>
            {formatCurrency(metrics.totalCashNeeded)}
          </p>
        </div>
      </div>

      {/* --- Inputs Grid --- */}
      <div className={styles.inputsGrid}>
        {/* Property & Loan */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Property & Loan</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>Purchase Price</label>
            <input type="number" name="price" value={property.price} onChange={handlePropertyChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Down Payment (%)</label>
            <input type="number" name="downPaymentPercent" value={property.downPaymentPercent} onChange={handlePropertyChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Interest Rate (%)</label>
            <input type="number" name="interestRate" value={property.interestRate} onChange={handlePropertyChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Loan Term (Years)</label>
            <input type="number" name="loanTerm" value={property.loanTerm} onChange={handlePropertyChange} className={styles.input} />
          </div>
        </div>

        {/* Income */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Monthly Income</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>Gross Monthly Rent</label>
            <input type="number" name="monthlyRent" value={income.monthlyRent} onChange={handleIncomeChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Vacancy Rate (%)</label>
            <input type="number" name="vacancyRate" value={income.vacancyRate} onChange={handleIncomeChange} className={styles.input} />
          </div>
        </div>

        {/* Expenses */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Operating Expenses</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>Property Tax (Annual)</label>
            <input type="number" name="propertyTax" value={expenses.propertyTax} onChange={handleExpenseChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Home Insurance (Annual)</label>
            <input type="number" name="insurance" value={expenses.insurance} onChange={handleExpenseChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Repairs & Maint. (% of Rent)</label>
            <input type="number" name="repairs" value={expenses.repairs} onChange={handleExpenseChange} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>HOA Fees (Monthly)</label>
            <input type="number" name="hoa" value={expenses.hoa} onChange={handleExpenseChange} className={styles.input} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealEstateCalculator;