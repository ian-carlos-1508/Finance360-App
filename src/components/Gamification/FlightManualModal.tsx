/* File: src/components/Gamification/FlightManualModal.tsx */
import React, { useEffect, useState } from 'react';
import { HiX, HiCheck, HiLockClosed, HiTrendingUp, HiShieldCheck } from 'react-icons/hi';
import JourneyService from '../../services/JourneyService';
import { supabase } from '../../lib/supabaseClient';
import TooltipInfo from '../Tooltip/TooltipInfo';
import styles from './FlightManualModal.module.css';

// --- TYPES ---
// Updated to match the SQL RPC "get_flight_manual_progress"
export interface FlightManualData {
    // Tier 1 (Control)
    logged_transactions?: number; // mapped from SQL
    budget_score?: number;
    streak_days?: number;
    current_surplus?: number;
    three_month_surplus?: number;
    
    // Tier 2 (Build)
    liquidity_ratio?: number; // 1.0 = 1 month
    debt_paid_count?: number;
    savings_rate?: number; // percentage
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string; // 'CONTROL' | 'BUILD' | 'OPTIMIZE'
}

// --- CONFIGURATION ---
// We map the SQL keys to the Visual Tracks
const TIER_TRACKS = {
    'CONTROL': [
        {
            id: 'TRACKING',
            title: 'Black Box Recorder',
            icon: '📝',
            desc: 'Log transactions to calibrate sensors.',
            why: 'Writing down every expense builds awareness. Most overspending comes from "invisible" small purchases.',
            levels: [10, 50, 100, 500],
            dataKey: 'logged_transactions',
            format: 'number'
        },
        {
            id: 'BUDGET',
            title: 'The Limiter',
            icon: '🛡️',
            desc: 'Budget compliance score.',
            why: 'A budget ensures your "Needs" are funded before your "Wants" take over.',
            levels: [50, 75, 90, 100], // Score %
            dataKey: 'budget_score',
            format: 'percent'
        },
        {
            id: 'STREAK',
            title: 'System Uptime',
            icon: '🔥',
            desc: 'Days of active logins.',
            why: 'Consistency beats intensity. Checking your finances daily reduces anxiety.',
            levels: [3, 7, 30, 90],
            dataKey: 'streak_days',
            format: 'number'
        },
        {
            id: 'SURPLUS',
            title: 'The Fuel Gauge',
            icon: <HiTrendingUp />,
            desc: 'Current month positive cash flow.',
            why: 'Profit is sustainability. You cannot build wealth if you spend more than you earn.',
            levels: [1, 100, 500, 1000],
            dataKey: 'current_surplus',
            format: 'currency'
        }
    ],
    'BUILD': [
        {
            id: 'LIQUIDITY',
            title: 'The Reservoir',
            icon: <HiShieldCheck />,
            desc: 'Months of expenses saved in cash.',
            why: 'Security. Cash buys you time to solve problems without borrowing.',
            levels: [1, 3, 6, 12], // Months
            dataKey: 'liquidity_ratio',
            format: 'decimal'
        },
        {
            id: 'DEBT',
            title: 'The Crusher',
            icon: '⚔️',
            desc: 'Toxic debt accounts fully paid off.',
            why: 'Freedom. Every paid-off account increases your monthly cash flow.',
            levels: [1, 3, 5, 10], // Accounts count
            dataKey: 'debt_paid_count',
            format: 'number'
        },
        {
            id: 'SAVINGS',
            title: 'The Concrete',
            icon: '🧱',
            desc: 'Percentage of income saved/invested.',
            why: 'Acceleration. The higher this number, the faster you reach freedom.',
            levels: [5, 10, 20, 50], // Percent
            dataKey: 'savings_rate',
            format: 'percent'
        }
    ],
    'OPTIMIZE': [
        {
            id: 'NET_WORTH',
            title: 'The Mountain',
            icon: '🏔️',
            desc: 'Total Net Worth (Assets - Liabilities).',
            why: 'The ultimate scorecard. Increasing this number buys you freedom.',
            levels: [10000, 50000, 100000, 1000000], 
            dataKey: 'net_worth',
            format: 'currency'
        },
        {
            id: 'PASSIVE',
            title: 'The Engine',
            icon: '⚙️',
            desc: 'Estimated Annual Passive Income (4% Rule).',
            why: 'When this number exceeds your expenses, you are free.',
            levels: [100, 1000, 12000, 60000], 
            dataKey: 'passive_income',
            format: 'currency'
        },
        {
            id: 'INVESTED',
            title: 'The Snowball',
            icon: '❄️',
            desc: 'Total Capital Invested.',
            why: 'Money that works for you. The larger the snowball, the faster it rolls.',
            levels: [5000, 25000, 100000, 500000], 
            dataKey: 'invested_assets',
            format: 'currency'
        }
    ]
};

const FlightManualModal: React.FC<Props> = ({ isOpen, onClose, currentTier }) => {
  const [data, setData] = useState<FlightManualData | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to CONTROL if tier is unknown
  const normalizedTier = (currentTier === 'BUILD' || currentTier === 'OPTIMIZE') ? currentTier : 'CONTROL';
  
  // @ts-ignore - Typescript check for key existence
  const activeTracks = TIER_TRACKS[normalizedTier] || TIER_TRACKS['CONTROL'];

  useEffect(() => {
    if (isOpen) {
        const loadData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fetch the new RPC data
                const stats = await JourneyService.getFlightManualData(user.id);
                setData(stats);
            }
            setLoading(false);
        };
        loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to calculate Rank
  const getRankInfo = (value: number, levels: number[]) => {
      // Safety check for null/undefined
      const val = value || 0;
      if (val < levels[0]) return { rank: 'Novice', next: levels[0], percent: (val / levels[0]) * 100 };
      if (val < levels[1]) return { rank: 'Bronze', next: levels[1], percent: (val / levels[1]) * 100 };
      if (val < levels[2]) return { rank: 'Silver', next: levels[2], percent: (val / levels[2]) * 100 };
      return { rank: 'Gold', next: levels[3], percent: 100 };
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
            <div>
                <h2 className={styles.title}>Flight Manual</h2>
                <p className={styles.subtitle}>
                    Status: <span style={{fontWeight:800, color: '#3b82f6'}}>{normalizedTier}</span>
                </p>
            </div>
            <button onClick={onClose} className={styles.closeBtn}><HiX /></button>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
            
            {loading ? <div className="p-4 text-center text-xs text-gray-400">Loading Telemetry...</div> : (
            <>
                {/* 1. DYNAMIC PROMOTION PROTOCOL */}
                <div className={styles.criteriaBox}>
                    <h4 className={styles.sectionTitle}>Promotion Protocol</h4>
                    
                    {normalizedTier === 'CONTROL' && (
                        <>
                            <div className={styles.criteriaRow}>
                                <div className={styles.criteriaIcon}>
                                    {(data?.current_surplus || 0) > 0 ? <HiCheck className="text-green-500" /> : <span className={styles.dot} />}
                                </div>
                                <div className={styles.criteriaText}>
                                    <strong>Level 2 Access (Probation):</strong> Achieve Positive Cash Flow ({formatMoney(data?.current_surplus || 0)}) for the current month.
                                </div>
                            </div>
                            <div className={styles.criteriaRow}>
                                <div className={styles.criteriaIcon}>
                                    {(data?.three_month_surplus || 0) > 0 ? <HiCheck className="text-green-500" /> : <HiLockClosed className="text-gray-400" />}
                                </div>
                                <div className={styles.criteriaText}>
                                    <strong>Full Rank Confirmation:</strong> Maintain Positive Net Surplus over 3 months.
                                </div>
                            </div>
                        </>
                    )}

                    {normalizedTier === 'BUILD' && (
                        <>
                             <div className={styles.criteriaRow}>
                                <div className={styles.criteriaIcon}>
                                    {(data?.liquidity_ratio || 0) >= 3 ? <HiCheck className="text-green-500" /> : <span className={styles.dot} />}
                                </div>
                                <div className={styles.criteriaText}>
                                    <strong>Fortress Security:</strong> Reach 3 Months of Liquidity.
                                    <div className={styles.subStatus}>Current: {(data?.liquidity_ratio || 0).toFixed(1)} Months</div>
                                </div>
                            </div>
                            <div className={styles.criteriaRow}>
                                <div className={styles.criteriaIcon}>
                                    {(data?.debt_paid_count || 0) > 0 ? <HiCheck className="text-green-500" /> : <HiLockClosed className="text-gray-400" />}
                                </div>
                                <div className={styles.criteriaText}>
                                    <strong>Drag Elimination:</strong> Pay off at least 1 Toxic Debt account.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 2. DYNAMIC MASTERY TRACKS */}
                <h4 className={styles.sectionTitle} style={{marginTop: '1rem'}}>Mastery Tracks</h4>
                <div className={styles.trackList}>
                    {activeTracks.map((track: any) => (
                        <TrackItem 
                            key={track.id}
                            config={track} 
                            // @ts-ignore - access dynamic key
                            value={data?.[track.dataKey] || 0} 
                            getRank={getRankInfo} 
                        />
                    ))}
                </div>
            </>
            )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for rendering a track row
const TrackItem = ({ config, value, getRank }: any) => {
    const info = getRank(value, config.levels);
    
    // Formatting Logic
    const formatValue = (val: number) => {
        if (config.format === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
        if (config.format === 'percent') return `${val.toFixed(0)}%`;
        if (config.format === 'decimal') return val.toFixed(1);
        return val; // number
    };

    return (
        <div className={styles.trackCard}>
            <div className={styles.trackHeader}>
                <div className={styles.trackIcon}>{config.icon}</div>
                <div className={styles.trackInfo}>
                    <div className="flex justify-between items-center w-full">
                        <h3 className="flex items-center gap-2">
                            {config.title}
                            <TooltipInfo>
                                {config.why}
                            </TooltipInfo>
                        </h3>
                        {/* Rank Badge */}
                        <span className={`${styles.rankBadge} ${styles[`rank${info.rank}`]}`}>
                            {info.rank}
                        </span>
                    </div>
                    <p>{config.desc}</p>
                </div>
            </div>
            
            <div className={styles.progressWrapper}>
                <div className={styles.progressBarBg}>
                    <div 
                        className={styles.progressBarFill} 
                        style={{ width: `${Math.min(info.percent, 100)}%` }}
                    ></div>
                </div>
                <span className={styles.progressText}>{formatValue(value)} / {formatValue(info.next)}</span>
            </div>
        </div>
    );
};

export default FlightManualModal;