/* File: src/pages/Hubs/OptimizeHub.tsx */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; 
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import styles from './OptimizeHub.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import type { HealthData } from '../../types/financial';

// --- Shared Tooltip ---
import TooltipInfo from '../../components/Tooltip/TooltipInfo';

import { 
  HiPresentationChartLine, 
  HiDocumentReport, 
  HiArrowRight,
  HiCurrencyDollar
} from 'react-icons/hi';

import { 
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

// Define types needed for the RPC response
type NetWorthTrendPoint = {
  month_start: string;
  assets: number;
  liabilities: number;
  net_worth: number; 
};

type DashboardData = {
  net_worth_trend: NetWorthTrendPoint[] | null;
  net_worth_snapshot: {
      net_worth: number;
      total_assets: number;
      total_liabilities: number;
  };
};

const formatChartDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short' });
};

const OptimizeHub: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthData | null>(null);
  const [trendData, setTrendData] = useState<NetWorthTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const startOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
      const startOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0];

      const [healthRes, dashboardRes] = await Promise.all([
        supabase.rpc('fn_get_financial_health_summary', {
            p_start_date: startOfYear,
            p_end_date: endOfMonth,
        }),
        supabase.rpc('get_dashboard_data', {
            p_start_date: startOfMonth,
            p_end_date: endOfMonth,
            p_trend_start_date: startOfYear,
        })
      ]);

      if (healthRes.data && healthRes.data.length > 0) {
        setMetrics(healthRes.data[0]);
      }

      if (dashboardRes.data) {
        const dashData = dashboardRes.data as DashboardData;
        const trend = dashData.net_worth_trend || [];
        setTrendData(trend.length > 0 ? trend : [{ 
            month_start: startOfMonth, 
            assets: 0, 
            liabilities: 0, 
            net_worth: 0 
        }]);
      }

      setLoading(false);
    };

    fetchRealData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={sharedStyles.title}>Wealth HQ</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-100 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  const netWorth = metrics?.net_worth || 0;
  const totalInvested = metrics?.total_investments || 0;
  const totalDebt = Math.abs(metrics?.total_liabilities || 0);

  // --- LOGIC: Capital Efficiency ---
  const estInvReturn = totalInvested * 0.08; // Est 8% Market Growth
  const estDebtCost = totalDebt * 0.18;      // Est 18% Debt Cost
  const efficiency = estInvReturn - estDebtCost;
  
  const gaugeMax = 6000; 
  const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
  const rotation = clamp((efficiency / gaugeMax) * 90, -90, 90);

  // --- LOGIC: Passive Income ---
  const estAnnualPassive = totalInvested * 0.04; // 4% Safe Withdrawal Rule

  // --- TOOLTIP STYLES (Inline for consistent structure with FinancialHealth) ---
  const sectionStyle = { marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #374151' };
  const labelStyle = { fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', marginBottom: '2px' };
  const textStyle = { color: '#fff' };
  const formulaStyle = { fontFamily: 'monospace', backgroundColor: '#1f2937', padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '2px' };
  const valStyle = { color: '#fff', fontWeight: '600' };
  const resultRowStyle = { ...rowStyle, borderTop: '1px dashed #374151', paddingTop: '4px', marginTop: '4px' };
  const benchmarkStyle = { marginTop: '8px', fontSize: '0.7rem', fontWeight: '600', color: '#6ee7b7', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' };

  return (
    <div className={styles.container}>
      
      <div>
        <h1 className={sharedStyles.title} style={{marginBottom: '0.25rem'}}>Wealth HQ</h1>
        <p className="text-gray-500 text-sm">Level 3 • Grow capital, analyze trends, and plan for independence.</p>
      </div>

      {/* --- SECTION 1: THE MOUNTAIN (Real Net Worth Trend) --- */}
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
           <div>
              <div className={styles.heroTitle}>Net Worth Trajectory (YTD)</div>
              <div className={styles.netWorthValue}>{formatCurrency(netWorth)}</div>
           </div>
           <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-100">
              Live Data
           </div>
        </div>

        <div className={styles.chartWrapper}>
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                 <defs>
                    <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                 <XAxis 
                    dataKey="month_start" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#9ca3af'}} 
                    tickFormatter={formatChartDate}
                    dy={10}
                 />
                 <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => formatChartDate(label as string)}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                 />
                 <Area 
                    type="monotone" 
                    dataKey="net_worth" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorNw)" 
                 />
              </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* --- SECTION 2: METRICS --- */}
      <div className={styles.midGrid}>
        
        {/* TACHOMETER: Capital Efficiency */}
        <div className={styles.featureCard}>
           <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
             Capital Efficiency
             <TooltipInfo position="bottom">
                <div style={sectionStyle}>
                    <div style={labelStyle}>Definition</div>
                    <div style={textStyle}>
                        Measures if your assets are growing faster than your debt is costing you.
                    </div>
                </div>
                <div style={sectionStyle}>
                    <div style={labelStyle}>Formula</div>
                    <div style={formulaStyle}>
                        (Investments × 8%) - (Debt × 18%)
                    </div>
                </div>
                <div style={{marginBottom: '10px'}}>
                    <div style={labelStyle}>Your Calculation</div>
                    <div style={rowStyle}>
                        <span style={{color: '#9ca3af'}}>Est. Gains:</span>
                        <span style={valStyle}>{formatCurrency(estInvReturn)}</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{color: '#9ca3af'}}>Est. Costs:</span>
                        <span style={valStyle}>{formatCurrency(estDebtCost)}</span>
                    </div>
                    <div style={resultRowStyle}>
                        <span style={{color: '#fff'}}>Net Efficiency:</span>
                        <span style={{color: efficiency >= 0 ? '#10b981' : '#ef4444', fontWeight: '700'}}>
                            {efficiency > 0 ? '+' : ''}{formatCurrency(efficiency)}/yr
                        </span>
                    </div>
                </div>
                <div style={benchmarkStyle}>
                    Goal: Positive annual growth.
                </div>
             </TooltipInfo>
           </div>
           
           <div className={styles.tachoWrapper}>
              <svg viewBox="0 0 200 110" width="100%" height="100%">
                 <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f3f4f6" strokeWidth="20" strokeLinecap="round" />
                 <path d="M 20 100 A 80 80 0 0 1 60 30.7" fill="none" stroke="#fee2e2" strokeWidth="20" strokeLinecap="round" />
                 <path d="M 140 30.7 A 80 80 0 0 1 180 100" fill="none" stroke="#d1fae5" strokeWidth="20" strokeLinecap="round" />
                 <g transform={`translate(100, 100) rotate(${rotation})`}>
                    <polygon points="-2,0 -4,-70 4,-70 2,0" fill="#1f2937" />
                    <circle cx="0" cy="0" r="6" fill="#1f2937" />
                 </g>
              </svg>
           </div>

           <div className={styles.tachoValue}>
              {efficiency > 0 ? '+' : ''}{formatCurrency(efficiency)}/yr
           </div>
           <div className={`${styles.tachoLabel} ${efficiency >= 0 ? styles.statusGreen : styles.statusRed}`}>
              {efficiency >= 0 ? 'Compound Growth' : 'Financial Drag'}
           </div>
        </div>

        {/* TICKER: Passive Income */}
        <div className={styles.featureCard}>
           <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
             Passive Income Estimator
             <TooltipInfo position="bottom">
                <div style={sectionStyle}>
                    <div style={labelStyle}>Definition</div>
                    <div style={textStyle}>
                        Estimated annual income generated by your portfolio without active work.
                    </div>
                </div>
                <div style={sectionStyle}>
                    <div style={labelStyle}>Formula (4% Rule)</div>
                    <div style={formulaStyle}>
                        Total Investments × 0.04
                    </div>
                </div>
                <div style={{marginBottom: '10px'}}>
                    <div style={labelStyle}>Your Calculation</div>
                    <div style={rowStyle}>
                        <span style={{color: '#9ca3af'}}>Invested:</span>
                        <span style={valStyle}>{formatCurrency(totalInvested)}</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={{color: '#9ca3af'}}>Safe Rate:</span>
                        <span style={valStyle}>4.0%</span>
                    </div>
                    <div style={resultRowStyle}>
                        <span style={{color: '#fff'}}>Est. Annual:</span>
                        <span style={{color: '#10b981', fontWeight: '700'}}>
                            {formatCurrency(estAnnualPassive)}
                        </span>
                    </div>
                </div>
                <div style={benchmarkStyle}>
                    Goal: Cover 100% of Expenses.
                </div>
             </TooltipInfo>
           </div>
           <div className={styles.tickerContainer}>
              <div className={styles.tickerValue}>
                 {formatCurrency(estAnnualPassive)}
              </div>
              <div className={styles.tickerSub}>
                 Est. Annual Dividends (4% Yield)
              </div>
           </div>
           <div className="mt-4 w-full">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                 <span>Progress to $10k/yr</span>
                 <span>{(estAnnualPassive / 10000 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full" style={{width: `${Math.min((estAnnualPassive/10000)*100, 100)}%`}}></div>
              </div>
           </div>
        </div>

      </div>

      {/* --- SECTION 3: GROWTH TOOLS --- */}
      <div className={styles.navSection}>
        <h2 className={styles.sectionTitle}>Growth Tools</h2>
        <div className={styles.navGrid}>
          
          <Link to="/assets" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#fff7ed', color: '#c2410c'}}>
              <HiCurrencyDollar />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Assets & Net Worth</div>
              <div className={styles.navSubtitle}>Track real estate, vehicles, and portfolio growth.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

          <Link to="/analytics/reports" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#f0fdf4', color: '#15803d'}}>
              <HiDocumentReport />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Reports Lab</div>
              <div className={styles.navSubtitle}>Deep dive analysis, income statements, and trends.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

          <Link to="/planners/investment" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#eff6ff', color: '#1d4ed8'}}>
              <HiPresentationChartLine />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Projections</div>
              <div className={styles.navSubtitle}>Forecast your wealth with the Investment Calculator.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

        </div>
      </div>
    </div>
  );
};

export default OptimizeHub;