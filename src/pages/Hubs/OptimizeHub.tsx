import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  FaBookOpen, 
  FaChartLine, 
  FaRocket,
  FaFileInvoiceDollar,
  FaCoins,
  FaChartPie
} from 'react-icons/fa';
import styles from './OptimizeHub.module.css';
import FlightManualModal from '../../components/Gamification/FlightManualModal';
import OptimizeTelemetryModal from './components/OptimizeTelemetryModal'; 
import TooltipInfo from '../../components/Tooltip/TooltipInfo';
import { formatCurrency } from '../../lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

// --- PALETTE IMPORT ---
import { 
  COLOR_INCOME, 
  COLOR_EXPENSE, 
  COLOR_TRANSFER, 
} from '../../lib/chartColors'; 

// --- TYPES ---
interface OptimizeData {
    net_worth: number;
    total_assets: number;
    total_invested: number;
    total_debt: number;
    avg_monthly_expenses: number;
    trend: { month_label: string; value: number }[];
}

const OptimizeHub: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OptimizeData | null>(null);
  
  // --- MODAL STATES ---
  const [showManual, setShowManual] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: hubData, error } = await supabase.rpc('get_optimize_hub_data', { p_user_id: user.id });
            if (error) console.error("Error loading Wealth HQ:", error);
            if (hubData) setData(hubData as OptimizeData);
        }
        setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Calibrating Wealth Engines...</div>;

  // --- METRICS ---
  const netWorth = Number(data?.net_worth || 0);
  const invested = Number(data?.total_invested || 0);
  const debt = Number(data?.total_debt || 0);
  const expenses = Number(data?.avg_monthly_expenses || 2000);

  // --- CALC: CAPITAL EFFICIENCY ---
  // Est. Asset Return (8%) vs Est. Debt Cost (18%)
  // We use 'invested' here (excludes cash/RE) for pure market efficiency calc
  const assetYield = invested * 0.08;
  const debtCost = debt * 0.18;
  const efficiency = assetYield - debtCost;
  
  const gaugeMax = 10000;
  const rotation = Math.min(Math.max((efficiency / gaugeMax) * 90, -90), 90);

  // --- CALC: FI RATIO (CORRECTED) ---
  const annualExpenses = expenses * 12;
  const freedomNumber = annualExpenses * 25; // The Target
  
  // FIX: Use Net Worth (Assets - Debt) instead of Gross Assets.
  // This ensures we don't count money that actually belongs to lenders.
  // If Net Worth is negative, floor it at 0 for the progress bar.
  const fiCapital = Math.max(0, netWorth); 
  
  const passiveIncome = fiCapital * 0.04; 
  
  const fiRatio = freedomNumber > 0 ? Math.min((fiCapital / freedomNumber) * 100, 100) : 0;

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#293241', margin: 0 }}>
                  Wealth HQ
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Level 3 • Grow capital and analyze trends.
              </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => setShowTelemetry(true)}
                style={{ color: COLOR_TRANSFER, background: 'none', border: 'none', cursor: 'pointer' }}
                title="Wealth Telemetry"
              >
                  <FaChartLine size={22} />
              </button>

              <button 
                onClick={() => setShowManual(true)}
                style={{ color: COLOR_TRANSFER, background: 'none', border: 'none', cursor: 'pointer' }}
                title="Flight Manual"
              >
                  <FaBookOpen size={22} />
              </button>
          </div>
      </div>

      {/* COCKPIT GRID */}
      <div className={styles.cockpitGrid}>
          
          {/* LEFT: NET WORTH ALTIMETER */}
          <div className={styles.card}>
              <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Net Worth Altimeter</div>
                  <TooltipInfo position="bottom">
                      The 6-month trajectory of your total Net Worth (Assets - Liabilities).
                  </TooltipInfo>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                  <span className={styles.bigNumber} style={{ color: netWorth >= 0 ? COLOR_INCOME : COLOR_EXPENSE }}>
                      {formatCurrency(netWorth)}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Current Altitude</div>
              </div>

              <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.trend || []}>
                          <defs>
                              <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={COLOR_TRANSFER} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={COLOR_TRANSFER} stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month_label" tick={{fontSize: 10}} />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={COLOR_TRANSFER} 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorNw)" 
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* RIGHT: EFFICIENCY GAUGE */}
          <div className={styles.card}>
              <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Capital Efficiency</div>
                  <TooltipInfo position="bottom" align="right">
                      <div style={{ fontSize: '0.75rem' }}>
                          <strong>Formula:</strong> (Investments × 8%) - (Debt × 18%).
                          <br />
                          Measures if your money is working harder than your debt cost.
                      </div>
                  </TooltipInfo>
              </div>

              <div className={styles.gaugeWrapper}>
                   <svg viewBox="0 0 200 100" width="100%" height="100%">
                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                        <path d="M 20 100 A 80 80 0 0 1 100 20" fill="none" stroke={COLOR_EXPENSE} strokeWidth="20" />
                        <path d="M 100 20 A 80 80 0 0 1 180 100" fill="none" stroke={COLOR_INCOME} strokeWidth="20" />
                        <line 
                            x1="100" y1="100" x2="100" y2="20" 
                            stroke="#1f2937" strokeWidth="4" strokeLinecap="round"
                            transform={`rotate(${rotation} 100 100)`}
                            style={{ transition: 'transform 1s ease-out' }}
                        />
                        <circle cx="100" cy="100" r="6" fill="#1f2937" />
                    </svg>
              </div>

              <div className={styles.gaugeValue}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: efficiency >= 0 ? COLOR_INCOME : COLOR_EXPENSE }}>
                      {efficiency > 0 ? '+' : ''}{formatCurrency(efficiency)}<span style={{fontSize: '0.8rem'}}>/yr</span>
                  </div>
                  <span 
                    className={styles.efficiencyLabel}
                    style={{ 
                        backgroundColor: efficiency >= 0 ? `${COLOR_INCOME}20` : `${COLOR_EXPENSE}20`,
                        color: efficiency >= 0 ? COLOR_INCOME : COLOR_EXPENSE
                    }}
                  >
                      {efficiency >= 0 ? 'COMPOUNDING' : 'DRAG DETECTED'}
                  </span>
              </div>
          </div>
      </div>

      {/* FI PROGRESS BAR (CLICKABLE FIX) */}
      <div 
        className={styles.fiSection} 
        onClick={() => navigate('/planners/fi')} // <--- NAVIGATION ADDED
        style={{ cursor: 'pointer' }} // <--- POINTER ADDED
        title="Click to open FI Calculator"
      >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem', margin: 0 }}>
                      <FaRocket style={{ color: COLOR_TRANSFER }} /> Financial Independence
                  </h3>
                  {/* Prevent tooltip click from navigating */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <TooltipInfo position="bottom">
                        <div className={styles.tooltipLabel}>The 4% Rule</div>
                        <div className={styles.tooltipContent}>
                            Standard retirement math suggests you are "Financial Independent" when you have saved <strong>25 times</strong> your annual expenses.
                        </div>
                        <div className={styles.tooltipLabel}>Your Freedom Number</div>
                        <div className={styles.tooltipCalc}>
                            {formatCurrency(annualExpenses)}/yr × 25 = <strong>{formatCurrency(freedomNumber)}</strong>
                        </div>
                    </TooltipInfo>
                  </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>SAFE WITHDRAWAL</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: COLOR_TRANSFER }}>
                      {formatCurrency(passiveIncome)}<span style={{fontSize:'0.8rem', fontWeight: 600}}>/yr</span>
                  </div>
              </div>
          </div>

          <div className={styles.progressBarBg} style={{ height: '16px' }}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${fiRatio}%`, backgroundColor: COLOR_TRANSFER }} 
              ></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8rem', color: '#4b5563', fontWeight: 500 }}>
              <span>
                  Current Capital: <strong>{formatCurrency(fiCapital)}</strong>
              </span>
              <span>
                  Target: <strong>{formatCurrency(freedomNumber)}</strong>
              </span>
          </div>
      </div>

      {/* GROWTH TOOLS NAV */}
      <div className={styles.navSection}>
          <h3 className={styles.sectionTitle}>Growth Tools</h3>
          <div className={styles.navGrid}>
              
              <div className={styles.navCard} onClick={() => navigate('/assets')}>
                  <div className={styles.navIconBox} style={{backgroundColor: '#eff6ff', color: '#1d4ed8'}}>
                      <FaCoins />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Assets & Net Worth</div>
                      <div className={styles.navSubtitle}>Track real estate, vehicles, and portfolio.</div>
                  </div>
              </div>

              <div className={styles.navCard} onClick={() => navigate('/analytics/reports')}>
                  <div className={styles.navIconBox} style={{backgroundColor: '#f0fdf4', color: '#15803d'}}>
                      <FaFileInvoiceDollar />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Reports Lab</div>
                      <div className={styles.navSubtitle}>Deep dive analysis and income statements.</div>
                  </div>
              </div>

              <div className={styles.navCard} onClick={() => navigate('/planners')}>
                  <div className={styles.navIconBox} style={{backgroundColor: '#fff7ed', color: '#c2410c'}}>
                      <FaChartPie />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Projections</div>
                      <div className={styles.navSubtitle}>Forecast your wealth trajectory.</div>
                  </div>
              </div>

          </div>
      </div>

      {/* MODALS */}
      <FlightManualModal 
          isOpen={showManual} 
          onClose={() => setShowManual(false)} 
          currentTier="OPTIMIZE" 
      />
      
      <OptimizeTelemetryModal 
          isOpen={showTelemetry} 
          onClose={() => setShowTelemetry(false)} 
      />
    </div>
  );
};

export default OptimizeHub;