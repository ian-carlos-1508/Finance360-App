/* File: src/pages/Hubs/BuildHub.tsx */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import styles from './BuildHub.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import type { HealthData } from '../../types/financial';

// --- UPDATED: Centralized Theme Colors ---
import { COLOR_INCOME, COLOR_EXPENSE, COLOR_TRANSFER } from '../../lib/chartColors'; // Added COLOR_TRANSFER for Subscriptions

import { 
  HiShieldCheck, 
  HiFire, 
  HiArrowRight,
  HiHeart,
  HiLightningBolt,
  HiCalendar // NEW: Import HiCalendar for Subscriptions
} from 'react-icons/hi';

// --- SVG SHIELD COMPONENT (omitted for brevity, assume unchanged) ---
const ShieldIcon = ({ percent }: { percent: number }) => {
  const fill = Math.min(Math.max(percent, 0), 100);
  
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="shieldFill" x1="0" y1="1" x2="0" y2="0">
          <stop offset={`${fill}%`} stopColor={COLOR_INCOME} />
          <stop offset={`${fill}%`} stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <path 
        d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
        fill="url(#shieldFill)" 
        stroke={COLOR_INCOME} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BuildHub: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuildData = async () => {
      setLoading(true);
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('fn_get_financial_health_summary', {
        p_start_date: startOfYear,
        p_end_date: today,
      });

      if (!error && data && data.length > 0) {
        setMetrics(data[0]);
      }
      setLoading(false);
    };

    fetchBuildData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={sharedStyles.title}>Fortress Dashboard</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-100 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  // --- METRIC EXTRACTION ---
  const totalDebt = Math.abs(metrics?.total_liabilities || 0);
  const monthsOfSafety = metrics?.emergency_fund_months || 0;
  
  // Shield Logic
  const shieldTarget = 6;
  const shieldPercent = (monthsOfSafety / shieldTarget) * 100;

  // Boss Logic
  const isDebtFree = totalDebt === 0;

  // Resilience Score Logic
  const liquidityScore = Math.min(monthsOfSafety / 3, 1) * 50; 
  const debtScore = totalDebt === 0 ? 50 : Math.max(0, 50 - (totalDebt / 1000)); 
  const resilienceScore = Math.round(liquidityScore + debtScore);

  // --- DYNAMIC STATUS COLORS ---
  let statusIcon = '⛈️';
  let statusText = 'Fortress Breached';
  
  let bgGradient = `linear-gradient(135deg, ${COLOR_EXPENSE} 0%, #7f1d1d 100%)`;

  if (resilienceScore >= 80) {
    statusIcon = '🏰'; 
    statusText = 'Fortress Secure';
    bgGradient = `linear-gradient(135deg, ${COLOR_INCOME} 0%, #14532d 100%)`;
  } 
  else if (resilienceScore >= 50) {
    statusIcon = '🚧'; 
    statusText = 'Under Construction';
    bgGradient = `linear-gradient(135deg, #f59e0b 0%, #b45309 100%)`;
  }

  return (
    <div className={styles.container}>
      
      <div>
        <h1 className={sharedStyles.title} style={{marginBottom: '0.5rem'}}>Fortress Dashboard</h1>
        <p className="text-gray-500 text-sm">Level 2 • Build security by eliminating debt and filling your reserves.</p>
      </div>

      {/* --- SECTION 1: THE BATTLE ARENA --- */}
      <div className={styles.battleArena}>
        
        {/* LEFT: THE SHIELD */}
        <div className={styles.battleCard}>
          <div className={`${styles.cardHeader} ${styles.shieldHeader}`} style={{ color: COLOR_INCOME }}>
             Defensive Shield
          </div>
          
          <div className={styles.shieldWrapper}>
             <ShieldIcon percent={shieldPercent} />
          </div>

          <div className={styles.metricLarge}>
             {monthsOfSafety.toFixed(1)} Mo
          </div>
          <div className={styles.metricSub}>
             Runway Available (Target: 6 Mo)
          </div>

          <Link to="/goals" className={`${styles.actionButton} ${styles.btnShield}`}>
             <HiShieldCheck /> Reinforce Shield
          </Link>
        </div>

        {/* RIGHT: THE BOSS */}
        <div className={styles.battleCard}>
          <div className={`${styles.cardHeader} ${styles.bossHeader}`} style={{ color: COLOR_EXPENSE }}>
             Active Threat
          </div>

          <div className={styles.bossWrapper}>
             {/* Boss Avatar */}
             <div className={styles.bossAvatar}>
                {isDebtFree ? '💀' : '👹'}
             </div>
             
             {/* Health Bar */}
             {!isDebtFree ? (
               <div className={styles.healthBarContainer} style={{ borderColor: COLOR_EXPENSE, backgroundColor: `${COLOR_EXPENSE}20` }}>
                  <div 
                    className={styles.healthBarFill} 
                    style={{ 
                      width: '100%', 
                      background: `linear-gradient(90deg, ${COLOR_EXPENSE} 0%, #7f1d1d 100%)` 
                    }}
                  ></div>
               </div>
             ) : (
               <div className="text-green-600 font-bold text-sm">THREAT ELIMINATED</div>
             )}
          </div>

          <div className={styles.metricLarge}>
             {formatCurrency(totalDebt)}
          </div>
          <div className={styles.metricSub}>
             {isDebtFree ? 'No active liabilities.' : 'Total Liabilities Remaining'}
          </div>

          {!isDebtFree && (
            <Link to="/planners/debt" className={`${styles.actionButton} ${styles.btnAttack}`}>
               <HiLightningBolt /> Attack Debt
            </Link>
          )}
        </div>

      </div>

      {/* --- SECTION 2: RESILIENCE SCORE --- */}
      <div className={styles.resilienceSection} style={{ background: bgGradient }}>
         <div>
            <div className={styles.resTitle}>{statusIcon} System Resilience</div>
            <div className={styles.resDesc}>
               {statusText}. Combined score of your liquidity runway and debt-to-income health.
            </div>
         </div>
         <div className={styles.resScore}>
            <div className={styles.resValue}>{Math.min(resilienceScore, 100)}</div>
            <div className={styles.resLabel}>/ 100</div>
         </div>
      </div>

      {/* --- SECTION 3: BUILD TOOLS --- */}
      <div className={styles.navSection}>
        <h2 className={styles.sectionTitle}>Armory & Tactics</h2>
        
        <div className={styles.navGrid}>
          
          <Link to="/planners/debt" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#fee2e2', color: '#b91c1c'}}>
              <HiFire />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Debt Crusher</div>
              <div className={styles.navSubtitle}>Snowball calculator to wipe out interest.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

          <Link to="/goals" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#d1fae5', color: '#047857'}}>
              <HiShieldCheck />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Savings Goals</div>
              <div className={styles.navSubtitle}>Allocate cash to specific buckets.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

          {/* NEW CARD: Subscriptions Audit */}
          <Link to="/subscriptions" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#e0e7ff', color: COLOR_TRANSFER}}>
              <HiCalendar />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Subscription Audit</div>
              <div className={styles.navSubtitle}>Manage recurring charges and identify waste.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

          <Link to="/health" className={styles.navCard}>
            <div className={styles.navIconBox} style={{backgroundColor: '#e0e7ff', color: '#4338ca'}}>
              <HiHeart />
            </div>
            <div className={styles.navContent}>
              <div className={styles.navTitle}>Health Scorecard</div>
              <div className={styles.navSubtitle}>Deep dive into your ratios.</div>
            </div>
            <HiArrowRight className={styles.arrowIcon} />
          </Link>

        </div>
      </div>

    </div>
  );
};

export default BuildHub;