/* Replace file: src/pages/Planners/FinancialIndependence.tsx */

import { useState, useMemo, useEffect } from 'react';
import styles from './FinancialIndependence.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';
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
import TooltipInfo from '../../components/Tooltip/TooltipInfo';

type ChartData = {
  year: number;
  value: number;
  fiTarget: number;
};

type CalcResult = {
  fiNumber: number;
  yearsToFI: number;
  chartData: ChartData[];
};

type LiveData = {
  current_investments: number;
  avg_monthly_expenses: number;
};

function FinancialIndependence() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(''); // Start empty
  const [currentPortfolio, setCurrentPortfolio] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('1500');
  const [annualRate, setAnnualRate] = useState('7');
  const [liveData, setLiveData] = useState<LiveData | null>(null);

  useEffect(() => {
    async function fetchFIData() {
      // 1. Calculate the start date in the client
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 6,
        today.getDate()
      );
      const p_start_date = startDate.toISOString().split('T')[0];

      // 2. Call the RPC with the date parameter
      const { data, error } = await supabase.rpc('fn_get_fi_inputs', {
        p_start_date: p_start_date,
      });

      if (error) {
        console.error('Error fetching FI inputs:', error.message);
      } else {
        setLiveData(data);
        setCurrentPortfolio(Math.round(data.current_investments).toString());
        
        // Set the monthly expenses from the fetched data
        setMonthlyExpenses(Math.round(data.avg_monthly_expenses).toString());
      }
    }
    fetchFIData();
  }, []);

  const { fiNumber, yearsToFI, chartData } = useMemo((): CalcResult => {
    // ... (logic is unchanged) ...
    const pMonthlyExpenses = parseFloat(monthlyExpenses) || 0;
    const pCurrentPortfolio = parseFloat(currentPortfolio) || 0;
    const pMonthlyContribution = parseFloat(monthlyContribution) || 0;
    const pAnnualRate = parseFloat(annualRate) || 0;
    
    const annualExpenses = pMonthlyExpenses * 12;
    const fiNumber = annualExpenses * 25; // 4% Rule
    const annualContribution = pMonthlyContribution * 12;
    const rate = pAnnualRate / 100;
    
    const data: ChartData[] = [];
    let currentValue = pCurrentPortfolio;
    let years = 0;
    
    data.push({
      year: 0,
      value: parseFloat(currentValue.toFixed(2)),
      fiTarget: fiNumber,
    });
    
    if (fiNumber <= 0) {
      return { fiNumber, yearsToFI: 0, chartData: data };
    }
    if (currentValue >= fiNumber) {
      return { fiNumber, yearsToFI: 0, chartData: data };
    }
    
    for (let i = 1; i <= 60; i++) {
      currentValue = currentValue * (1 + rate) + annualContribution;
      
      data.push({
        year: i,
        value: parseFloat(currentValue.toFixed(2)),
        fiTarget: fiNumber,
      });
      
      if (currentValue >= fiNumber) {
        years = i;
        break;
      }
    }
    
    if (years === 0) years = 60;
    return { fiNumber, yearsToFI: years, chartData: data };
  }, [monthlyExpenses, currentPortfolio, monthlyContribution, annualRate]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Financial Independence</h1>
        <Link to="/planners" className={styles.backButton}>
          &larr; Back to Planners
        </Link>
      </div>

      <div className={styles.calculatorGrid}>
        {/* --- Column 1: Inputs --- */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Your Projections</h2>

          {/* --- Monthly Expenses Field --- */}
          <div className={styles.formRow}>
            <div className={styles.labelWithIcon}>
              <label htmlFor="monthlyExpenses" className={styles.label}>
                Avg. Monthly Expenses
              </label>
              {liveData && (
                <TooltipInfo>
                  <div className={styles.tooltipContent}>
                    Your 6-month average expense is{' '}
                    <strong>
                      {formatCurrency(liveData.avg_monthly_expenses)}
                    </strong>
                    .
                  </div>
                </TooltipInfo>
              )}
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputAddonSymbol}>$</span>
              <input
                id="monthlyExpenses"
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                className={styles.inputWithAddon}
                placeholder={liveData ? "Loaded" : "Loading..."}
              />
            </div>
          </div>

          {/* --- Current Portfolio Field --- */}
          <div className={styles.formRow}>
            <div className={styles.labelWithIcon}>
              <label htmlFor="currentPortfolio" className={styles.label}>
                Current Investable Assets
              </label>
              {liveData && (
                <TooltipInfo>
                  {/* --- THIS IS THE FIX --- */}
                  <div className={styles.tooltipContent}>
                    This is your total cash (from 'cash' accounts)
                    and investments (from your portfolio).
                  </div>
                  {/* --- END OF FIX --- */}
                </TooltipInfo>
              )}
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputAddonSymbol}>$</span>
              <input
                id="currentPortfolio"
                type="number"
                value={currentPortfolio}
                onChange={(e) => setCurrentPortfolio(e.target.value)}
                className={styles.inputWithAddon}
                placeholder={liveData ? "Loaded from assets" : "Loading..."}
              />
            </div>
          </div>

          {/* --- Monthly Contribution Field --- */}
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
              />
            </div>
          </div>

          {/* --- Annual Rate Field --- */}
          <div className={styles.formRow}>
            <label htmlFor="annualRate" className={styles.label}>
              Est. Annual Rate of Return (%)
            </label>
            <input
              id="annualRate"
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        {/* --- Column 2: Results (Unchanged) --- */}
        <div className={styles.resultsCard}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <h3 className={styles.kpiTitle}>Your FI Number</h3>
              <p className={styles.kpiValue}>{formatCurrency(fiNumber)}</p>
            </div>
            <div className={styles.kpiCard}>
              <h3 className={styles.kpiTitle}>Estimated Years to FI</h3>
              <p className={styles.kpiValue}>
                {yearsToFI < 60 ? yearsToFI : '60+'}
              </p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{
                    value: 'Years',
                    position: 'insideBottom',
                    offset: -5,
                  }}
                />
                <YAxis tickFormatter={(val) => formatCurrency(val)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Your Portfolio"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fiTarget"
                  name="FI Target"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialIndependence;