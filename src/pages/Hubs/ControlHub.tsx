/* File: src/pages/Hubs/ControlHub.tsx */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import styles from './ControlHub.module.css';
import sharedStyles from '../Settings/Settings.module.css';

import { 
  COLOR_INCOME, 
  COLOR_EXPENSE, 
  COLOR_NEUTRAL 
} from '../../lib/chartColors';

import { 
  HiLightningBolt, 
  HiChartBar, 
  HiArrowRight,
  HiExternalLink,
  HiCreditCard
} from 'react-icons/hi';

interface ControlMetrics {
  income: number;
  expenses: number;
  surplusRate: number; 
  accountCount: number;
}

interface RiskyBudget {
  name: string;
  spent: number;
  limit: number;
  percent: number;
}

const ControlHub: React.FC = () => {
  const [metrics, setMetrics] = useState<ControlMetrics>({ income: 0, expenses: 0, surplusRate: 0, accountCount: 0 });
  const [riskyBudgets, setRiskyBudgets] = useState<RiskyBudget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // 1. FETCH TRANSACTIONS
      const { data: txData } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      let inc = 0;
      let exp = 0;
      
      if (txData) {
        txData.forEach(t => {
          const amt = Number(t.amount);
          if (t.type === 'Income') {
             inc += amt;
          } else if (t.type === 'Expense') {
             exp += Math.abs(amt);
          }
        });
      }

      // 2. FETCH ACCOUNTS
      const { count } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true });

      // 3. FETCH BUDGETS
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('category, limit_amount, spent_amount');

      const budgets: RiskyBudget[] = (budgetData || []).map(b => ({
        name: b.category,
        spent: b.spent_amount,
        limit: b.limit_amount,
        percent: b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0
      }));

      const topRisky = budgets.sort((a, b) => b.percent - a.percent).slice(0, 3);

      setMetrics({
        income: inc,
        expenses: exp,
        surplusRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0,
        accountCount: count || 0
      });
      setRiskyBudgets(topRisky);
      setLoading(false);
    };

    fetchData();
  }, []);

  // --- LOGIC ---
  const netFlow = metrics.income - metrics.expenses;
  const isPositive = netFlow >= 0;
  const flowColor = isPositive ? COLOR_INCOME : COLOR_EXPENSE;
  const flowBgColor = isPositive ? `${COLOR_INCOME}15` : `${COLOR_EXPENSE}15`; 

// --- GAUGE ROTATION & ZONES ---
  const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
  
  // Mapping Logic:
  // 0% Surplus (Spent everything) -> -90deg (Empty/Left)
  // 50% Surplus (Saved half)     ->   0deg (Top/Middle)
  // 100% Surplus (Spent nothing) ->  90deg (Full/Right)
  // Formula: (Percent * 1.8) - 90
  const gaugeRotation = clamp((metrics.surplusRate * 1.8) - 90, -90, 90);

  let gaugeText = 'Cruising Altitude';
  let gaugeStatusColor = COLOR_INCOME;
  let gaugeStatusBg = `${COLOR_INCOME}20`; 

  // --- NEW THRESHOLDS ---
  if (metrics.surplusRate < 30) {
    // < 30%: Red Zone
    gaugeText = 'Low Fuel Warning';
    gaugeStatusColor = COLOR_EXPENSE;
    gaugeStatusBg = `${COLOR_EXPENSE}20`;
  } else if (metrics.surplusRate >= 30 && metrics.surplusRate < 45) {
    // 30% - 45%: Yellow Zone
    gaugeText = 'Stabilizing';
    gaugeStatusColor = '#d97706'; // Amber
    gaugeStatusBg = '#fffbeb';
  } else {
    // > 45%: Green Zone
    gaugeText = 'Cruising Altitude';
    gaugeStatusColor = COLOR_INCOME;
    gaugeStatusBg = `${COLOR_INCOME}20`; 
  }

  if (loading) return <div className="p-8 animate-pulse">Loading Cockpit...</div>;

  return (
    <div className={styles.container}>
      
      {/* PAGE HEADER */}
      <div>
        <h1 className={sharedStyles.title} style={{marginBottom: '0.25rem'}}>Cash Flow Command</h1>
        <p className="text-gray-500 text-sm">Level 1 • Maintain a positive monthly surplus.</p>
      </div>

      {/* SECTION 1: THE COCKPIT GRID */}
      <div className={styles.cockpitGrid}>
        
        {/* A. THE FUEL GAUGE */}
        <div className={styles.gaugeCard}>
          <div className={styles.gaugeHeader}>
            <div className={styles.gaugeTitle}>Monthly Surplus</div>
            <div className={styles.gaugeSubtitle}>Fuel Efficiency</div>
          </div>

          <div className={styles.gaugeWrapper}>
            <svg viewBox="0 0 200 110" width="100%" height="100%">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f3f4f6" strokeWidth="20" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 60 30.7" fill="none" stroke={`${COLOR_EXPENSE}40`} strokeWidth="20" strokeLinecap="round" strokeDasharray="4 4" />
              <g transform={`translate(100, 100) rotate(${gaugeRotation})`}>
                <line x1="0" y1="0" x2="0" y2="-75" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
                <circle cx="0" cy="0" r="6" fill="#1f2937" />
              </g>
            </svg>
          </div>

          <div className={styles.gaugeValueDisplay}>
            <span className={styles.bigNumber}>
              {metrics.surplusRate.toFixed(1)}%
            </span>
            <span 
              className={styles.statusMessage}
              style={{ color: gaugeStatusColor, backgroundColor: gaugeStatusBg }}
            >
              {gaugeText}
            </span>
          </div>
        </div>

        {/* B. THE REALITY CHECK (Summary Card) */}
        <div className={styles.summaryCard}>
           <div className={styles.summaryContent}>
             
             {/* CLICKABLE INCOME BAR */}
             <Link to="/income" className={styles.clickableRow} title="View All Income">
               <div className={styles.flowLabel}>
                  <span className="flex items-center gap-1">
                    Income <HiExternalLink size={12} className="opacity-50" />
                  </span>
                  <span style={{ color: COLOR_INCOME }}>{formatCurrency(metrics.income)}</span>
               </div>
               <div className={styles.flowBarBg}>
                  <div 
                    className={styles.flowBarFill} 
                    style={{ width: '100%', backgroundColor: COLOR_INCOME }}
                  ></div>
               </div>
             </Link>

             {/* CLICKABLE EXPENSE BAR */}
             <Link to="/expenses" className={styles.clickableRow} title="View All Expenses">
               <div className={styles.flowLabel}>
                  <span className="flex items-center gap-1">
                    Expenses <HiExternalLink size={12} className="opacity-50" />
                  </span>
                  <span style={{ color: COLOR_EXPENSE }}>{formatCurrency(metrics.expenses)}</span>
               </div>
               <div className={styles.flowBarBg}>
                  <div 
                    className={styles.flowBarFill} 
                    style={{ 
                      width: `${Math.min((metrics.expenses / (metrics.income || 1)) * 100, 100)}%`, 
                      backgroundColor: COLOR_EXPENSE 
                    }}
                  ></div>
               </div>
             </Link>
           </div>

           {/* NET CASH FLOW BOX (The Hero) */}
           <div className={styles.netFlowBox} style={{ backgroundColor: flowBgColor }}>
              <span className={styles.netFlowLabel} style={{ color: COLOR_NEUTRAL }}>
                 Net Monthly Flow
              </span>
              <span className={styles.netFlowValue} style={{ color: flowColor }}>
                 {isPositive ? '+' : ''}{formatCurrency(netFlow)}
              </span>
           </div>
        </div>

      </div>

      {/* SECTION 2: FLIGHT CONTROLS */}
      <div className={styles.navSection}>
        <h2 className={styles.sectionTitle}>Flight Controls</h2>
        
        <div className={styles.navGrid}>
          
          <Link to="/transactions-hub" className={styles.navCard}>
            <div className={`${styles.navIconBox} ${styles.iconBlue}`}>
              <HiLightningBolt />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Log Transaction</div>
              <div className={styles.navSubtitle}>Update your ledger manually.</div>
              <div className={styles.xpBadge}>
                <HiLightningBolt size={10} /> +5 XP Reward
              </div>
            </div>
            <HiArrowRight className="text-gray-300" />
          </Link>

          <Link to="/budgets" className={styles.navCard}>
            <div className={`${styles.navIconBox} ${styles.iconOrange}`}>
              <HiChartBar />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Budget Watch</div>
              {riskyBudgets.length > 0 ? (
                <div className={styles.budgetPreview}>
                   {riskyBudgets.map((b, i) => (
                     <div key={i} className={styles.miniBudgetRow}>
                       <span className="w-16 truncate">{b.name}</span>
                       <div className={styles.miniBarBg}>
                         <div 
                            className={styles.miniBarFill} 
                            style={{ 
                              width: `${Math.min(b.percent, 100)}%`, 
                              backgroundColor: b.percent > 90 ? COLOR_EXPENSE : '#f59e0b' 
                            }}
                         />
                       </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className={styles.navSubtitle}>All budgets looking healthy.</div>
              )}
            </div>
          </Link>

          <Link to="/accounts" className={styles.navCard}>
            <div className={`${styles.navIconBox} ${styles.iconIndigo}`}>
              <HiCreditCard />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Accounts</div>
              <div className={styles.navSubtitle}>
                {metrics.accountCount} Connected Sources
              </div>
              <div className="text-xs text-gray-400 font-semibold mt-1">
                 View Liquidity Details &rarr;
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default ControlHub;