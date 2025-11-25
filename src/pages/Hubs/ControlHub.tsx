/* File: src/pages/Hubs/ControlHub.tsx */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
    FaChartPie, 
    FaBookOpen, 
    FaBolt, 
    FaChartArea, 
    FaWallet,
    FaExclamationTriangle,
    FaCheckCircle,
    FaPlusCircle,
    FaPlus,
    FaChartLine,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';
import styles from './ControlHub.module.css';

// --- COMPONENTS ---
import Modal from '../../components/Modal/Modal'; 
import AddTransactionModal from '../../components/Transactions/AddTransactionModal';
import FlightManualModal from '../../components/Gamification/FlightManualModal';
import EmptyControlState from './components/EmptyControlState';
import TelemetryModal from './components/TelemetryModal';

import { formatCurrency } from '../../lib/utils';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid
} from 'recharts';
import { COLOR_INCOME, COLOR_EXPENSE, COLOR_TRANSFER, CHART_COLORS } from '../../lib/chartColors'; // COLOR_TRANSFER ADDED

// --- TYPES ---
type MonthlyData = {
    income: number;
    expenses: number;
    net: number;
    categories: { name: string; value: number }[];
};

type BudgetAlert = {
    name: string;
    spent: number;
    limit: number;
    pct: number;
};

// --- MODAL STATE ---
type ModalState = 'SELECTION' | 'INCOME' | 'EXPENSE' | null;

const ControlHub: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
    // --- STATE ---
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
    const [showFlightManual, setShowFlightManual] = useState(false);
    const [showTelemetry, setShowTelemetry] = useState(false);
    
    // Modal Flow
    const [activeModal, setActiveModal] = useState<ModalState>(null);

    // --- DATA ---
    const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
    const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
    const [hasBudgets, setHasBudgets] = useState(false);
    const [averages, setAverages] = useState({ avgIncome: 0, avgExpense: 0, avgNet: 0 });
    
    const monthOptions = useMemo(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = d.toISOString().slice(0, 7);
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [year, month] = currentMonth.split('-').map(Number);
            const startDate = `${currentMonth}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const { data: txData } = await supabase.rpc('get_monthly_category_spend', { 
                p_start_date: startDate, p_end_date: endDate 
            });
            const { data: flowData } = await supabase.rpc('get_monthly_cashflow', {
                p_start_date: startDate, p_end_date: endDate 
            });
            const { data: avgData } = await supabase.rpc('get_six_month_averages');
            
            const { data: dashboardData } = await supabase.rpc('get_dashboard_data', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_trend_start_date: startDate 
            });

            const income = flowData?.[0]?.total_income || 0;
            const expenses = Math.abs(flowData?.[0]?.total_expense || 0);
            
            const categories = (txData || []).map((t: any) => ({
                name: t.category,
                value: Math.abs(t.amount)
            }));

            const { count } = await supabase.from('budgets').select('*', { count: 'exact', head: true });
            setHasBudgets(count !== null && count > 0);

            const alerts: BudgetAlert[] = [];
            
            if (dashboardData?.budget_alerts) {
                dashboardData.budget_alerts.forEach((b: any) => {
                    const safePct = b.spent_percentage || 0;
                    if (safePct >= 85) {
                        alerts.push({
                            name: b.name,
                            spent: b.spent || 0,
                            limit: b.budgeted || 0,
                            pct: safePct
                        });
                    }
                });
            }

            setMonthlyData({ income, expenses, net: income - expenses, categories });
            setBudgetAlerts(alerts);
            
            if (avgData && avgData.length > 0) {
                setAverages({
                    avgIncome: avgData[0].avg_income,
                    avgExpense: avgData[0].avg_expense,
                    avgNet: avgData[0].avg_net
                });
            }
            setLoading(false);
        };
        loadData();
    }, [currentMonth]);

    // --- GAUGE LOGIC ---
    const income = monthlyData?.income || 1; 
    const expenses = monthlyData?.expenses || 0;
    const expenseRatio = Math.min((expenses / income) * 100, 100);

    // Surplus: (Income - Expenses) / Income
    let surplusPct = ((income - expenses) / income) * 100;
    if (surplusPct < 0) surplusPct = 0; // Cap at 0 (Left)
    if (surplusPct > 100) surplusPct = 100; // Cap at 100 (Right)

    const rotation = -90 + (surplusPct / 100) * 180;

    // Empty State Checks
    const isGlobalEmpty = (monthlyData?.income === 0 && monthlyData?.expenses === 0);
    const hasSpendingData = (monthlyData?.categories?.length || 0) > 0;

    // --- HANDLERS ---
    const handleTxSaved = () => {
        setActiveModal(null);
        window.location.reload();
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Initializing Cockpit...</div>;

    return (
        <div className={styles.container}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                        Cash Flow Command
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0 0' }}>
                        Level 1 • Maintain a positive monthly surplus.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* FLIGHT TELEMETRY ICON - COLOR FIX */}
                    <button 
                        onClick={() => setShowTelemetry(true)}
                        style={{ color: COLOR_TRANSFER, background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Flight Telemetry (Analytics)"
                    >
                        <FaChartLine size={22} />
                    </button>

                    {/* FLIGHT MANUAL ICON - COLOR FIX */}
                    <button 
                        onClick={() => setShowFlightManual(true)}
                        style={{ color: COLOR_TRANSFER, background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Flight Manual"
                    >
                        <FaBookOpen size={22} />
                    </button>

                    <select 
                        value={currentMonth} 
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        {monthOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* CONTENT SWITCHER */}
            {isGlobalEmpty ? (
                <EmptyControlState onInitialize={() => setActiveModal('SELECTION')} />
            ) : (
            <>
                {/* COCKPIT GRID */}
                <div className={styles.cockpitGrid}>
                    
                    {/* GAUGE (Colors Updated) */}
                    <div className={styles.gaugeCard}>
                        <div className={styles.gaugeHeader}>
                            <div className={styles.gaugeTitle}>Monthly Surplus</div>
                            <div className={styles.gaugeSubtitle}>Fuel Efficiency</div>
                        </div>
                        <div className={styles.gaugeWrapper}>
                            <svg viewBox="0 0 200 100" width="100%" height="100%">
                                {/* Background Arch */}
                                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                                
                                {/* Red Zone (Left / Stall) - BURNT ORANGE */}
                                <path d="M 20 100 A 80 80 0 0 1 60 30.7" fill="none" stroke={COLOR_EXPENSE} strokeWidth="20" />
                                
                                {/* Green Zone (Right / Cruise) - OLIVE GREEN */}
                                <path d="M 140 30.7 A 80 80 0 0 1 180 100" fill="none" stroke={COLOR_INCOME} strokeWidth="20" />

                                {/* Needle */}
                                <line 
                                    x1="100" y1="100" x2="100" y2="20" 
                                    stroke="#1f2937" strokeWidth="4" strokeLinecap="round"
                                    transform={`rotate(${rotation} 100 100)`}
                                    style={{ transition: 'transform 1s ease-out' }}
                                />
                                <circle cx="100" cy="100" r="6" fill="#1f2937" />
                            </svg>
                        </div>
                        <div className={styles.gaugeValueDisplay}>
                            <span className={styles.bigNumber}>{surplusPct.toFixed(1)}%</span>
                            <div 
                                className={styles.statusMessage} 
                                style={{ 
                                    // Logic: Red BG if < 20%, Green BG if >= 20%. Text uses your strict colors.
                                    backgroundColor: surplusPct < 20 ? '#fff7ed' : '#f0fdf4', 
                                    color: surplusPct < 20 ? COLOR_EXPENSE : COLOR_INCOME 
                                }}
                            >
                                {surplusPct < 20 ? 'WARNING: LOW FUEL' : 'CRUISING ALTITUDE'}
                            </div>
                        </div>
                    </div>

                    {/* REALITY CHECK */}
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryContent}>
                            <div className={styles.clickableRow} onClick={() => navigate('/income')}>
                                <div className={styles.flowLabel}>
                                    <span>Income <span style={{fontSize: '0.7rem'}}>↗</span></span>
                                    <span style={{ color: COLOR_INCOME }}>{formatCurrency(monthlyData?.income || 0)}</span>
                                </div>
                                <div className={styles.flowBarBg}>
                                    <div className={styles.flowBarFill} style={{ width: '100%', backgroundColor: COLOR_INCOME }}></div>
                                </div>
                            </div>

                            <div className={styles.clickableRow} onClick={() => navigate('/expenses')}>
                                <div className={styles.flowLabel}>
                                    <span>Expenses <span style={{fontSize: '0.7rem'}}>↘</span></span>
                                    <span style={{ color: COLOR_EXPENSE }}>{formatCurrency(monthlyData?.expenses || 0)}</span>
                                </div>
                                <div className={styles.flowBarBg}>
                                    <div 
                                        className={styles.flowBarFill} 
                                        style={{ width: `${Math.min(expenseRatio, 100)}%`, backgroundColor: COLOR_EXPENSE }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.netFlowBox} style={{ backgroundColor: (monthlyData?.net || 0) >= 0 ? '#f0fdf4' : '#fff7ed' }}>
                            <span className={styles.netFlowLabel}>NET MONTHLY FLOW</span>
                            <span className={styles.netFlowValue} style={{ color: (monthlyData?.net || 0) >= 0 ? COLOR_INCOME : COLOR_EXPENSE }}>
                                {formatCurrency(monthlyData?.net || 0)}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                {averages.avgNet >= 0 ? <HiTrendingUp /> : <HiTrendingDown />}
                                6-Mo Avg: {formatCurrency(averages.avgNet)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FLIGHT RECORDER */}
                <div className={styles.navSection}>
                    <h3 className={styles.sectionTitle}>
                        <FaChartPie /> Flight Recorder
                    </h3>
                    
                    <div className={styles.recorderGrid}>
                        
                        {/* 1. EXPENSE ALLOCATION */}
                        <div className={styles.summaryCard} style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 className={styles.gaugeTitle}>Top Spending</h4>
                                <div className={styles.toggleContainer}>
                                    <button onClick={() => setChartType('pie')} className={`${styles.toggleBtn} ${chartType === 'pie' ? styles.toggleBtnActive : ''}`}>Pie</button>
                                    <button onClick={() => setChartType('bar')} className={`${styles.toggleBtn} ${chartType === 'bar' ? styles.toggleBtnActive : ''}`}>Bar</button>
                                </div>
                            </div>
                            
                            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {hasSpendingData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'pie' ? (
                                            <PieChart>
                                                <Pie
                                                    data={monthlyData?.categories}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                                                >
                                                    {monthlyData?.categories.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                            </PieChart>
                                        ) : (
                                            <BarChart data={monthlyData?.categories} layout="vertical" margin={{ left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10}} />
                                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                                <Bar dataKey="value" fill={COLOR_EXPENSE} radius={[0, 4, 4, 0]} barSize={15} />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                                        <FaChartPie style={{ fontSize: '1.5rem', marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <p>No spending data for {new Date(currentMonth).toLocaleString('default', {month:'long'})}.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. BUDGET WATCH */}
                        <div className={styles.summaryCard} style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '280px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 className={styles.gaugeTitle}>
                                    Budget Watch <FaExclamationTriangle className="text-gray-300 ml-2 inline" style={{fontSize: '0.7rem'}} />
                                </h4>
                                <span onClick={() => navigate('/budgets')} style={{ fontSize: '0.7rem', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
                                    View All
                                </span>
                            </div>
                            
                            {!hasBudgets ? (
                                <div className={styles.budgetEmptyState}>
                                    <FaPlusCircle size={32} className="mb-2 text-blue-300" />
                                    <p style={{ fontSize: '0.8rem', margin: 0 }}>No budgets set.</p>
                                    <button 
                                        onClick={() => navigate('/budgets')} 
                                        style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Create One
                                    </button>
                                </div>
                            ) : budgetAlerts.length === 0 ? (
                                <div className={styles.budgetSuccessState}>
                                    <FaCheckCircle size={48} className="mb-2" />
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>All Systems Nominal</p>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>All budgets under 85% utilization.</p>
                                </div>
                            ) : (
                                budgetAlerts.map(b => (
                                    <div key={b.name} className={styles.budgetItem}>
                                        <div className={styles.budgetHeader}>
                                            <span>{b.name}</span>
                                            <span 
                                                style={{ 
                                                    color: b.pct >= 100 ? COLOR_EXPENSE : '#f59e0b' 
                                                }}
                                            >
                                                {(b.pct || 0).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className={styles.budgetProgressBg}>
                                            <div 
                                                className={styles.budgetProgressFill} 
                                                style={{ 
                                                    width: `${Math.min(b.pct, 100)}%`,
                                                    backgroundColor: b.pct >= 100 ? COLOR_EXPENSE : '#f59e0b' 
                                                }}
                                            ></div>
                                        </div>
                                        <div className={styles.budgetMeta}>
                                            <span>{formatCurrency(b.spent)} spent</span>
                                            <span style={{color: '#9ca3af'}}> of {formatCurrency(b.limit)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 3. CASH FLOW RATIO */}
                        <div className={styles.summaryCard} style={{ padding: '1.25rem' }}>
                            <h4 className={styles.gaugeTitle} style={{ marginBottom: '1rem' }}>Cash Flow Ratio</h4>
                            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {income > 0 || expenses > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: 'Income', value: monthlyData?.income, fill: COLOR_INCOME },
                                            { name: 'Expense', value: monthlyData?.expenses, fill: COLOR_EXPENSE }
                                        ]} barGap={10}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis tickFormatter={(val) => `$${val/1000}k`} width={35} tick={{fontSize: 10}} />
                                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                            <Bar dataKey="value" barSize={30} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                                        <p>No cash flow data.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. FLIGHT CONTROLS */}
                <div className={styles.navSection}>
                    <h3 className={styles.sectionTitle}>Flight Controls</h3>
                    <div className={styles.navGrid}>
                        {/* 1. Log Transaction Card: CHANGE navigation */}
                        <div className={styles.navCard} onClick={() => navigate('/transactions-hub')} style={{ cursor: 'pointer' }}>
                            <div className={`${styles.navIconBox} ${styles.iconBlue}`}>
                                <FaBolt />
                            </div>
                            <div className={styles.navContent}>
                                <div className={styles.navTitle}>Log Transaction</div>
                                <div className={styles.navSubtitle}>Update your ledger manually.</div>
                                <div className={styles.xpBadge}>
                                    <FaBolt size={10} /> +5 XP Reward
                                </div>
                            </div>
                        </div>

                        {/* 2. Budget Watch Card */}
                        <div className={styles.navCard} onClick={() => navigate('/budgets')} style={{ cursor: 'pointer' }}>
                            <div className={`${styles.navIconBox} ${styles.iconOrange}`}>
                                <FaChartArea />
                            </div>
                            <div className={styles.navContent}>
                                <div className={styles.navTitle}>Budget Watch</div>
                                <div className={styles.navSubtitle}>All budgets looking healthy.</div>
                            </div>
                        </div>

                        {/* 3. Accounts Card: CHANGE to Subscriptions Card */}
                        <div className={styles.navCard} onClick={() => navigate('/subscriptions')} style={{ cursor: 'pointer' }}>
                            <div className={`${styles.navIconBox} ${styles.iconIndigo}`}>
                                <FaWallet /> {/* Using FaWallet, but FaCreditCard or similar might fit Subscriptions better */}
                            </div>
                            <div className={styles.navContent}>
                                <div className={styles.navTitle}>Subscriptions</div>
                                <div className={styles.navSubtitle}>Track recurring monthly costs.</div>
                                <span style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 600 }}>View Cost Reduction →</span>
                            </div>
                        </div>
                    </div>
                </div>
            </>
            )}

            {/* MODALS (No changes needed here for the cards above) */}
            <FlightManualModal 
                isOpen={showFlightManual} 
                onClose={() => setShowFlightManual(false)} 
                currentTier="CONTROL"
            />
            
            <TelemetryModal 
                isOpen={showTelemetry}
                onClose={() => setShowTelemetry(false)}
            />
            
            {/* SELECTION MODAL (Kept for the FAB button logic) */}
            {activeModal === 'SELECTION' && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setActiveModal(null)} 
                    title="Select Transaction Type"
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
                        <button 
                            onClick={() => setActiveModal('INCOME')}
                            className={styles.navCard} 
                            style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: `2px solid ${COLOR_INCOME}`, boxShadow: 'none' }}
                        >
                            <div className={styles.navIconBox} style={{ background: '#ecfdf5', color: COLOR_INCOME }}>
                                <FaArrowUp />
                            </div>
                            <span style={{ fontWeight: 800, color: COLOR_INCOME, marginTop: '0.5rem' }}>Income</span>
                        </button>

                        <button 
                            onClick={() => setActiveModal('EXPENSE')}
                            className={styles.navCard} 
                            style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: `2px solid ${COLOR_EXPENSE}`, boxShadow: 'none' }}
                        >
                            <div className={styles.navIconBox} style={{ background: '#fef2f2', color: COLOR_EXPENSE }}>
                                <FaArrowDown />
                            </div>
                            <span style={{ fontWeight: 800, color: COLOR_EXPENSE, marginTop: '0.5rem' }}>Expense</span>
                        </button>
                    </div>
                </Modal>
            )}

            {/* FORM MODAL */}
            {(activeModal === 'INCOME' || activeModal === 'EXPENSE') && (
                <AddTransactionModal 
                    isOpen={true} 
                    onClose={() => setActiveModal(null)}
                    onTransactionAdded={handleTxSaved} 
                    transactionType={activeModal === 'INCOME' ? 'Income' : 'Expense'}
                    transactionToEdit={null}
                />
            )}

            {/* FAB (Kept for quick access) */}
            <button 
                onClick={() => setActiveModal('SELECTION')}
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: '#3b82f6', color: 'white', border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                    zIndex: 50
                }}
            >
                <FaPlus />
            </button>

        </div>
    );
};

export default ControlHub;