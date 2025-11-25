/* File: src/pages/Planners/FinancialIndependence.tsx */

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
  // --- INPUT STATES ---
  const [monthlyExpenses, setMonthlyExpenses] = useState('3000'); 
  const [currentPortfolio, setCurrentPortfolio] = useState('0');
  const [monthlyContribution, setMonthlyContribution] = useState('1500');
  const [annualRate, setAnnualRate] = useState('7');
  
  const [liveData, setLiveData] = useState<LiveData | null>(null);

  useEffect(() => {
    async function fetchFIData() {
      // We use a far-past date to ensure we catch all history for the average
      const p_start_date = '2020-01-01';

      const { data, error } = await supabase.rpc('fn_get_fi_inputs', {
        p_start_date: p_start_date,
      });

      if (error) {
        console.error('Error fetching FI inputs:', error.message);
      } else if (data) {
        const result = data as LiveData;
        setLiveData(result);
        
        // 1. Portfolio: Always use DB value (even if 0)
        setCurrentPortfolio(Math.round(result.current_investments).toString());
        
        // 2. Expenses: Use DB value if > 0, otherwise keep default '3000'
        const dbExpense = Math.round(Math.abs(result.avg_monthly_expenses));
        if (dbExpense > 0) {
            setMonthlyExpenses(dbExpense.toString());
        }
      }
    }
    fetchFIData();
  }, []);

  // --- CALCULATION ENGINE ---
  const { fiNumber, yearsToFI, chartData } = useMemo((): CalcResult => {
    const pMonthlyExpenses = parseFloat(monthlyExpenses) || 0;
    const pCurrentPortfolio = parseFloat(currentPortfolio) || 0;
    const pMonthlyContribution = parseFloat(monthlyContribution) || 0;
    const pAnnualRate = parseFloat(annualRate) || 0;
    
    const annualExpenses = pMonthlyExpenses * 12;
    const fiNumber = annualExpenses * 25; 
    const annualContribution = pMonthlyContribution * 12;
    const rate = pAnnualRate / 100;
    
    const data: ChartData[] = [];
    let currentValue = pCurrentPortfolio;
    let years = 0;
    
    // Year 0
    data.push({
      year: 0,
      value: parseFloat(currentValue.toFixed(2)),
      fiTarget: fiNumber,
    });
    
    // Safety Check
    if (fiNumber <= 0) return { fiNumber: 0, yearsToFI: 0, chartData: [] };
    
    // Scenario: Already Reached FI
    if (currentValue >= fiNumber) {
      for(let i=1; i<=5; i++) {
          data.push({ year: i, value: currentValue, fiTarget: fiNumber });
      }
      return { fiNumber, yearsToFI: 0, chartData: data };
    }
    
    // Projection Loop (Max 60 years)
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
        <Link to="/optimize" className={styles.backButton}>
          &larr; Back to Wealth HQ
        </Link>
      </div>

      <div className={styles.calculatorGrid}>
        
        {/* --- LEFT: INPUTS --- */}
        <div className={styles.inputCard}>
          <h2 className={sharedStyles.cardTitle}>Your Projections</h2>

          {/* 1. EXPENSES */}
          <div className={styles.formRow}>
            <div className={styles.labelWithIcon}>
              <label htmlFor="monthlyExpenses" className={styles.label}>
                Avg. Monthly Expenses
              </label>
              <TooltipInfo>
                  <div className={styles.tooltipContent}>
                    <div>Based on your transaction history.</div>
                    <div style={{marginTop: '4px', borderTop: '1px dashed #e5e7eb', paddingTop: '4px'}}>
                        Detected Avg: <strong>{liveData ? formatCurrency(Math.abs(liveData.avg_monthly_expenses)) : '$0.00'}</strong>
                    </div>
                  </div>
              </TooltipInfo>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputAddonSymbol}>$</span>
              <input
                id="monthlyExpenses"
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                className={styles.inputWithAddon}
              />
            </div>
          </div>

          {/* 2. PORTFOLIO */}
          <div className={styles.formRow}>
            <div className={styles.labelWithIcon}>
              <label htmlFor="currentPortfolio" className={styles.label}>
                Current Investable Assets
              </label>
              <TooltipInfo>
                  <div className={styles.tooltipContent}>
                    <div>Sum of all Liquid Cash + Investment accounts.</div>
                    <div style={{marginTop: '4px', borderTop: '1px dashed #e5e7eb', paddingTop: '4px'}}>
                        Database Found: <strong>{liveData ? formatCurrency(liveData.current_investments) : '$0.00'}</strong>
                    </div>
                  </div>
              </TooltipInfo>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputAddonSymbol}>$</span>
              <input
                id="currentPortfolio"
                type="number"
                value={currentPortfolio}
                onChange={(e) => setCurrentPortfolio(e.target.value)}
                className={styles.inputWithAddon}
              />
            </div>
          </div>

          {/* 3. CONTRIBUTIONS */}
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

          {/* 4. RATE */}
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

        {/* --- RIGHT: RESULTS & CHART --- */}
        <div className={styles.resultsCard}>
          
          {/* KPI BOXES */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <h3 className={styles.kpiTitle}>Your FI Number (25x)</h3>
              <p className={styles.kpiValue}>{formatCurrency(fiNumber)}</p>
            </div>
            <div className={styles.kpiCard}>
              <h3 className={styles.kpiTitle}>Time to Freedom</h3>
              <p className={styles.kpiValue}>
                {yearsToFI === 0 && fiNumber > 0 && parseFloat(currentPortfolio) >= fiNumber 
                    ? 'Achieved!' 
                    : yearsToFI < 60 
                        ? `${yearsToFI} Years` 
                        : '60+ Years'}
              </p>
            </div>
          </div>
          
          {/* CHART */}
          <div className={styles.chartContainer}>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        label={{ value: 'Years from Now', position: 'insideBottom', offset: -10, fontSize: 12 }}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                        tickFormatter={(val) => `$${val / 1000}k`} 
                        width={60} 
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '40px', fontSize: 12 }} />
                    
                    <Line
                        type="monotone"
                        dataKey="value"
                        name="Projected Portfolio"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={false}
                    />
                    
                    <Line
                        type="monotone"
                        dataKey="fiTarget"
                        name="Freedom Target"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af'}}>
                    Enter expenses to see projection.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialIndependence;