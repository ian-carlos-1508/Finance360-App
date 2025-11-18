/* Replace file: src/pages/Planners/InvestmentCalculator.tsx */

import { useState, useMemo } from 'react';
import styles from './InvestmentCalculator.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type ChartData = {
  year: number;
  totalPrincipal: number;
  totalInterest: number;
  totalValue: number;
};

type CalcResult = {
  chartData: ChartData[];
  finalValue: number;
  totalPrincipal: number;
  totalInterest: number;
};

function InvestmentCalculator() {
  const [initialAmount, setInitialAmount] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('300');
  const [years, setYears] = useState('10');
  const [apr, setApr] = useState('7');

  const { chartData, finalValue, totalPrincipal, totalInterest } =
    useMemo((): CalcResult => {
      // ... (useMemo logic remains unchanged)
      const P = parseFloat(initialAmount) || 0;
      const PMT = parseFloat(monthlyContribution) || 0;
      const t = parseInt(years, 10) || 0;
      const r = (parseFloat(apr) || 0) / 100;
      const n = 12; // Compounded monthly

      const data: ChartData[] = [];
      let currentBalance = P;
      let totalPrincipal = P;

      data.push({
        year: 0,
        totalPrincipal: P,
        totalInterest: 0,
        totalValue: P,
      });

      for (let i = 1; i <= t; i++) {
        let yearEndBalance = currentBalance;

        for (let j = 0; j < 12; j++) {
          yearEndBalance = yearEndBalance * (1 + r / n) + PMT;
          totalPrincipal += PMT;
        }

        const totalInterest = yearEndBalance - totalPrincipal;
        data.push({
          year: i,
          totalPrincipal: totalPrincipal,
          totalInterest: totalInterest,
          totalValue: yearEndBalance,
        });
        currentBalance = yearEndBalance;
      }

      const finalValue = data[data.length - 1]?.totalValue || 0;
      const finalTotalInterest = data[data.length - 1]?.totalInterest || 0;
      const finalTotalPrincipal = data[data.length - 1]?.totalPrincipal || 0;

      return {
        chartData: data,
        finalValue,
        totalPrincipal: finalTotalPrincipal,
        totalInterest: finalTotalInterest,
      };
    }, [initialAmount, monthlyContribution, years, apr]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Investment Calculator</h1>
        <Link to="/planners" className={styles.backButton}>
          &larr; Back to Planners
        </Link>
      </div>

      <div className={styles.calculatorGrid}>
        {/* --- Inputs Card --- */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Set Your Projections</h2>
          <form className={styles.inputForm}>
            {/* --- MODIFIED: Initial Amount --- */}
            <div className={styles.formRow}>
              <label htmlFor="initialAmount" className={styles.label}>
                Initial Amount
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputAddonSymbol}>$</span>
                <input
                  id="initialAmount"
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  className={styles.inputWithAddon}
                  placeholder="0"
                />
              </div>
            </div>

            {/* --- MODIFIED: Monthly Contribution --- */}
            <div className={styles.formRow}>
              <label htmlFor="monthlyContribution" className={styles.label}>
                Monthly Contribution
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputAddonSymbol}>$</span>
                <input
                  id="monthlyContribution"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  className={styles.inputWithAddon}
                  placeholder="0"
                />
              </div>
            </div>

            {/* --- UNMODIFIED: Time (Years) --- */}
            <div className={styles.formRow}>
              <label htmlFor="years" className={styles.label}>
                Time (in Years)
              </label>
              <input
                id="years"
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={styles.input}
              />
            </div>

            {/* --- UNMODIFIED: Annual Rate --- */}
            <div className={styles.formRow}>
              <label htmlFor="apr" className={styles.label}>
                Estimated Annual Rate (%)
              </label>
              <input
                id="apr"
                type="number"
                value={apr}
                onChange={(e) => setApr(e.target.value)}
                className={styles.input}
              />
            </div>
          </form>
        </div>

        {/* --- Results Card (Unchanged) --- */}
        <div className={styles.resultCard}>
          {/* ... all results content ... */}
          <div className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>
              Projected Value (in {years} years)
            </h3>
            <p className={styles.kpiValue}>{formatCurrency(finalValue)}</p>
          </div>
          <div className={styles.summary}>
            <p>
              Based on your projections, you will have contributed{' '}
              <strong>{formatCurrency(totalPrincipal)}</strong> and earned{' '}
              <strong>{formatCurrency(totalInterest)}</strong> in compound
              interest.
            </p>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Years', position: 'insideBottom', offset: -5 }}
                />
                <YAxis tickFormatter={(val) => formatCurrency(val)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalPrincipal"
                  name="Total Contributions"
                  stroke="#6b7280"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  name="Total Value"
                  stroke="#10b981"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentCalculator;