import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  FaShieldAlt, 
  FaBookOpen, 
  FaUniversity, 
  FaChartLine, // <-- IMPORTED: FaChartLine
  FaExclamationCircle, 
  FaCheckCircle,
  FaHeartbeat
} from 'react-icons/fa';
import styles from './BuildHub.module.css';
import FlightManualModal from '../../components/Gamification/FlightManualModal';
import { formatCurrency } from '../../lib/utils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
// --- Tooltip Import ---
import TooltipInfo from '../../components/Tooltip/TooltipInfo';
// --- NEW MODAL IMPORT ---
import BuildTelemetryModal from './components/BuildTelemetryModal'; 


// --- PALETTE IMPORT ---
import { 
  COLOR_INCOME, // Green (Good)
  COLOR_EXPENSE, // Orange (Bad)
  COLOR_TRANSFER, // Blue (Neutral)
} from '../../lib/chartColors'; 

// --- TYPE DEFINITION ---
interface DebtAccount {
    account_id: string;
    account_name: string;
    current_balance: number;
    interest_rate: number;
}

interface BuildHubData {
    total_cash: number;
    liquidity_months: number;
    toxic_debt: number;
    strategic_debt: number;
    debt_accounts: DebtAccount[];
}

// --- COLOR STATUS HELPER ---
const getLiquidityColorStatus = (months: number) => {
    if (months >= 6) return COLOR_INCOME;     // Green: Fortress Level
    if (months >= 3) return '#f59e0b';        // Amber/Yellow: Safety Target
    return COLOR_EXPENSE;                       // Red: Danger Zone
};
const getLiquidityBgStatus = (months: number) => {
    if (months >= 6) return `${COLOR_INCOME}20`;
    if (months >= 3) return '#fff7ed'; // Light Amber/Yellow background
    return `${COLOR_EXPENSE}20`;
};


const BuildHub: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BuildHubData | null>(null);
  const [showManual, setShowManual] = useState(false);
  // --- NEW STATE ---
  const [showTelemetry, setShowTelemetry] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Calling the final, schema-aligned RPC function
            const { data: hubData, error } = await supabase.rpc('get_build_hub_data', { p_user_id: user.id });
            
            if (error) console.error("Error loading Build Hub:", error);
            
            if (hubData) {
                // Safely parse incoming data (best practice)
                setData(hubData as BuildHubData);
            }
        }
        setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Fortress Schematics...</div>;

  // --- SAFE METRICS PARSING ---
  // Ensure numbers are parsed safely to prevent calculation bugs (e.g., string concatenation)
  const liquidity = Number(data?.liquidity_months || 0);
  const toxicDebt = Number(data?.toxic_debt || 0);
  const cash = Number(data?.total_cash || 0);
  const strategicDebt = Number(data?.strategic_debt || 0);
  const debts = data?.debt_accounts || [];

  // --- DERIVED METRICS ---
  const liquidStatusColor = getLiquidityColorStatus(liquidity);
  const liquidStatusBg = getLiquidityBgStatus(liquidity);
  const liquidMessage = liquidity >= 6 ? 'FORTRESS COMPLETE' : liquidity >= 3 ? 'SAFETY TARGET' : 'VULNERABLE';

  // 1. Tank Logic (Max 6 months = 100% height)
  const tankFill = Math.min((liquidity / 6) * 100, 100);
  
  // 2. Reality Check Logic (The Drag Coefficient)
  const totalVolume = Math.max(toxicDebt + cash, 1); 
  const debtRatio = (toxicDebt / totalVolume) * 100;
  const cashRatio = (cash / totalVolume) * 100;
  const netPosition = cash - toxicDebt;

  // 3. Asset Pie Data
  const assetData = [
      { name: 'Liquid Cash', value: cash },
      { name: 'Strategic Debt', value: strategicDebt },
      { name: 'Toxic Debt', value: toxicDebt }
  ].filter(d => d.value > 0);

  // COLORS: Cash (Green), Strategic (Slate Blue), Toxic (Orange)
  const PIE_COLORS = [COLOR_INCOME, COLOR_TRANSFER, COLOR_EXPENSE];

  return (
    <div className={styles.container}>
      
      {/* HEADER - MATCHES CONTROL HUB TITLE STYLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#293241', margin: 0 }}>
                  Fortress Construction
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Level 2 • Build reserves and eliminate drag.
              </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              
              {/* NEW: TELEMETRY BUTTON */}
              <button 
                onClick={() => setShowTelemetry(true)}
                style={{ color: COLOR_TRANSFER, background: 'none', border: 'none', cursor: 'pointer' }}
                title="Flight Telemetry (Analytics)"
              >
                  <FaChartLine size={22} />
              </button>

              {/* FLIGHT MANUAL BUTTON */}
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
          
          {/* LEFT: LIQUIDITY TANK */}
          <div className ={styles.card}>
              <div className={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* BOLD TITLE FIX */}
                      <div className={styles.cardTitle} style={{ fontSize: '1.1rem', fontWeight: 800 }}>Liquidity Reserves</div> 
                      {/* Tooltip for Liquidity */}
                      <TooltipInfo position="bottom">
                            <div className={styles.tooltipLabel}>Goal: Survival Runway</div>
                            <div className={styles.tooltipContent}>
                                Months of average expenses you can cover using only cash reserves. The system uses a minimum $2,000 baseline expense until sufficient transaction history is built.
                            </div>
                            <div className={styles.tooltipBenchmark}>
                                Status: &lt; 3 Red, 3-6 Yellow (Target), &gt; 6 Green (Secure).
                            </div>
                      </TooltipInfo>
                  </div>
                  {/* Dynamic color for Shield Icon */}
                  <FaShieldAlt style={{ fontSize: '1.5rem', color: liquidStatusColor }} />
              </div>

              <div className={styles.tankContainer}>
                  <div className={styles.tankWrapper}>
                      {/* The Fluid - COLOR CODED BY STATUS (CSS gradient removed via external file) */}
                      <div 
                        className={styles.tankFluid} 
                        style={{ 
                            height: `${tankFill}%`, 
                            transition: 'height 1s ease-in-out',
                            backgroundColor: liquidStatusColor // Dynamic Color
                        }} 
                      ></div>
                      
                      {/* The Marker Lines */}
                      <div className ={styles.markerLine} style={{ bottom: '16.6%' }}>
                        <span className={styles.markerLabel}>1 Mo</span>
                      </div>
                      <div className={styles.markerLine} style={{ bottom: '50%' }}>
                        <span className={styles.markerLabel}>3 Mo</span>
                      </div>
                      <div className={styles.markerLine} style={{ bottom: '100%' }}>
                        <span className={styles.markerLabel}>6 Mo</span>
                      </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '4px 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                      <span>Max</span>
                      <span>Target</span>
                      <span>Min</span>
                      <span>Empty</span>
                  </div>
              </div>

              <div className={styles.tankValueBox} style={{ marginTop: '1.5rem' }}>
                  <div className={styles.bigNumber}>
                    {liquidity.toFixed(1)} <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 400 }}>Months</span>
                  </div>
                  {/* Status Message - Center Aligned */}
                  <div className={styles.statusMessage} style={{ 
                      backgroundColor: liquidStatusBg, 
                      color: liquidStatusColor,
                      textAlign: 'center'
                  }}>
                      {liquidMessage}
                  </div>
              </div>
          </div>

          {/* RIGHT: DRAG COEFFICIENT */}
          <div className={styles.card}>
              <div className={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* BOLD TITLE FIX */}
                      <div className={styles.cardTitle} style={{ fontSize: '1.1rem', fontWeight: 800 }}>Drag Coefficient</div> 
                      {/* Tooltip for Drag Coefficient */}
                      <TooltipInfo position="bottom" align="right">
                          <div className={styles.tooltipLabel}>Definition: Toxic Debt vs Cash</div>
                          <div className={styles.tooltipContent}>
                              This measures how quickly high-interest liabilities (anchors) are sinking your liquid cash reserves (fuel).
                          </div>
                          <div className={styles.tooltipLabel}>Goal: Crossover Point</div>
                          <div className={styles.tooltipCalc}>
                              The goal is for Liquid Cash to always exceed Toxic Debt.
                          </div>
                      </TooltipInfo>
                  </div>
                  {/* Icon uses Toxic color if debt exists */}
                  <FaExclamationCircle style={{fontSize: '1.5rem', color: toxicDebt > 0 ? COLOR_EXPENSE : '#e5e7eb'}} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem', height: '160px', marginBottom: '1rem' }}>
                  {/* Toxic Debt Bar (Orange) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                      <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '8px 8px 0 0', height: '120px', position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                          <div 
                            style={{ width: '100%', background: COLOR_EXPENSE, borderRadius: '8px 8px 0 0', transition: 'height 0.5s', height: `${Math.min(debtRatio, 100)}%` }}
                          ></div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR_EXPENSE, marginTop: '0.5rem' }}>DEBT</span>
                  </div>

                  {/* Cash Bar (Green) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                      <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '8px 8px 0 0', height: '120px', position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                          <div 
                            style={{ width: '100%', background: COLOR_INCOME, borderRadius: '8px 8px 0 0', transition: 'height 0.5s', height: `${Math.min(cashRatio, 100)}%` }}
                          ></div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: COLOR_INCOME, marginTop: '0.5rem' }}>CASH</span>
                  </div>
              </div>

              <div className={styles.tankValueBox} style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Net Liquid Position</p>
                  {/* Net Position Value color */}
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: netPosition >= 0 ? COLOR_INCOME : COLOR_EXPENSE }}>
                      {formatCurrency(netPosition)}
                  </p>
              </div>
          </div>
      </div>

      {/* FLIGHT RECORDER */}
      <div className={styles.navSection}>
          <h3 className={styles.sectionTitle}>
              <FaChartLine /> Construction Log
          </h3>
          
          <div className ={styles.recorderGrid}>
              
              {/* A. ASSET ALLOCATION (Pie Chart) */}
              <div className={styles.summaryCard} style={{ padding: '1.25rem' }}>
                   <h4 className={styles.cardTitle} style={{marginBottom:'1rem'}}>Asset Mix</h4>
                   <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(assetData.length > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={assetData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80} // Increased outerRadius slightly for better visibility
                                    paddingAngle={5}
                                    // FIX 1: Explicitly type the label props to remove TS18046 error
                                    labelLine={false}
                                    label={({ name, percent }: { name?: string, percent?: number }) => 
                                        // Added safety check for optional properties
                                        (name && percent) ? `${name}: ${Math.round(percent * 100)}%` : ''
                                    }
                                >
                                    {assetData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{color:'#9ca3af', fontSize:'0.8rem'}}>No asset data detected.</div>
                      )}
                   </div>
              </div>

              {/* B. HIT LIST (Target List) */}
              <div className={styles.summaryCard} style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '280px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 className={styles.cardTitle}>Target List</h4>
                      <span onClick={() => navigate('/planners/debt')} style={{ fontSize: '0.7rem', color: COLOR_TRANSFER, cursor: 'pointer', fontWeight: 600 }}>
                          View Strategy
                      </span>
                  </div>
                  
                  {debts.length === 0 ? (
                      <div className={styles.radarEmptyState}>
                          <FaCheckCircle size={32} style={{ color: COLOR_INCOME, marginBottom: '0.5rem' }} />
                          <p style={{ fontSize: '0.8rem', margin: 0, color: COLOR_INCOME, fontWeight: 700 }}>No toxic debt detected.</p>
                      </div>
                  ) : (
                      debts.map((d) => (
                          // APPLYING NEW CSS CLASSES WITH DYNAMIC STYLES - List structure is now correct
                          <div 
                            key={d.account_id} 
                            className={styles.radarItem}
                            // Set CSS Variable for border color (Toxic Orange)
                            style={{ '--toxic-color': COLOR_EXPENSE } as React.CSSProperties}
                          >
                              <div className={styles.radarDetails}>
                                  <span className={styles.radarName}>{d.account_name}</span>
                                  <span 
                                    className={styles.radarApr}
                                    style={{ 
                                        color: d.interest_rate > 15 ? COLOR_EXPENSE : COLOR_TRANSFER,
                                        backgroundColor: d.interest_rate > 15 ? `${COLOR_EXPENSE}20` : `#f3f4f6`,
                                    }}
                                  >
                                    {d.interest_rate || 0}% APR
                                  </span>
                              </div>
                              <span className={styles.radarBalance} style={{ color: COLOR_EXPENSE }}>
                                {formatCurrency(d.current_balance)}
                              </span>
                          </div>
                      ))
                  )}
              </div>

              {/* C. NET WORTH SNAPSHOT */}
              <div className={styles.summaryCard} style={{ padding: '1.25rem' }}>
                  <h4 className={styles.cardTitle} style={{ marginBottom: '1rem' }}>Net Liquid Worth</h4>
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'2rem', fontWeight: 800, color: netPosition >= 0 ? COLOR_INCOME : COLOR_EXPENSE}}>
                              {formatCurrency(netPosition)}
                          </div>
                          <div style={{fontSize:'0.8rem', color:'#9ca3af'}}>Cash - Toxic Debt</div>
                      </div>
                  </div>
              </div>

          </div>
      </div>

      {/* NAV GRID */}
      <div className={styles.navSection}>
          <h3 className={styles.sectionTitle}>Engineering Controls</h3>
          <div className={styles.navGrid}>
              
              <div className={styles.navCard} onClick={() => navigate('/planners/debt')}>
                  <div className={`${styles.navIconBox} ${styles.iconRose}`}>
                      <FaExclamationCircle />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Debt Planner</div>
                      <div className={styles.navSubtitle}>Snowball/Avalanche tools.</div>
                  </div>
              </div>

              <div className={styles.navCard} onClick={() => navigate('/accounts')}>
                  <div className={`${styles.navIconBox} ${styles.iconIndigo}`}>
                      <FaUniversity />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Accounts</div>
                      <div className={styles.navSubtitle}>Manage assets & liabilities.</div>
                  </div>
              </div>

              <div className={styles.navCard} onClick={() => navigate('/health')}>
                  <div className={`${styles.navIconBox} ${styles.iconTeal}`}>
                      <FaHeartbeat />
                  </div>
                  <div className={styles.navContent}>
                      <div className={styles.navTitle}>Health Check</div>
                      <div className={styles.navSubtitle}>Vitals & Ratios.</div>
                  </div>
              </div>
          </div>
      </div>

      {/* MODALS */}
      <FlightManualModal 
          isOpen={showManual} 
          onClose={() => setShowManual(false)} 
          currentTier="BUILD" 
      />
      {/* NEW: Build Telemetry Modal */}
      <BuildTelemetryModal 
          isOpen={showTelemetry} 
          onClose={() => setShowTelemetry(false)} 
      />
    </div>
  );
};

export default BuildHub;