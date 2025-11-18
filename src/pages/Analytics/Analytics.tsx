/* Replace file: src/pages/Analytics/AnalyticsPage.tsx */

import { useState, useEffect } from 'react';
import styles from '../Settings/Settings.module.css'; // Master CSS
import budgetStyles from '../Budgets/Budgets.module.css'; // Budget list styles
import { supabase } from '../../lib/supabaseClient';
import {
    ResponsiveContainer,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    BarChart,
    Bar,
    CartesianGrid,
    Treemap,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';

// --- Type Definitions ---
type NetWorthDataPoint = { month_start: string; net_worth: number; };
type CashFlowDataPoint = { name: string; Income: number; Expense: number; Net: number; };
type TreemapData = { 
    name: string; 
    value: number; 
    fill: string;
};
type BudgetData = { budget_id: string; category: string; budgeted_amount: number; actual_amount: number; };
type DateFilter = 'all' | 'month' | '30days' | 'ytd';
type TransactionTypeFilter = 'all' | 'Income' | 'Expense' | 'Transfer';
type Account = { account_id: string; account_name: string; };
type Category = { category_id: string; category: string; subcategory: string | null };

const TREEMAP_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#6b7280'];

// --- Helper Components ---
const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const CustomTreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', fontSize: '0.9rem' }}>
                <p style={{fontWeight: 'bold', margin: 0, color: data.fill}}>{data.name}</p>
                {/* --- FIX: data.value is now positive, no * -1 needed --- */}
                <p style={{margin: 0}}>Total: {formatCurrency(data.value)}</p>
            </div>
        );
    }
    return null;
};

const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, fill } = props;
    if (width < 40 || height < 20) {
        return null;
    }
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
            <text
                x={x + width / 2}
                y={y + height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize="0.7rem"
                fontWeight="600"
            >
                {name}
            </text>
        </g>
    );
};
// --- End Helper Components ---

function AnalyticsPage() {
    // --- State ---
    const [netWorthData, setNetWorthData] = useState<NetWorthDataPoint[]>([]);
    const [cashFlowData, setCashFlowData] = useState<CashFlowDataPoint[]>([]);
    const [spendingTreemapData, setSpendingTreemapData] = useState<TreemapData[]>([]);
    const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
    
    const [dateFilter, setDateFilter] = useState<DateFilter>('ytd');
    const [accountFilter, setAccountFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
    
    const [filterAccounts, setFilterAccounts] = useState<Account[]>([]);
    const [filterCategories, setFilterCategories] = useState<Category[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchFilterData = async () => {
            const { data: accounts } = await supabase.from('accounts').select('account_id, account_name');
            if (accounts) setFilterAccounts(accounts);
            
            const { data: categories } = await supabase.from('categories').select('category_id, category, subcategory');
            if (categories) setFilterCategories(categories);
        };
        fetchFilterData();
    }, []);

    useEffect(() => {
        const loadAllDashboardData = async () => {
            setLoading(true);
            setError('');
            
            // 1. Net Worth
            const { data: nwData, error: nwError } = await supabase.rpc('get_net_worth_trend');
            if (nwError) {
                console.error('Error fetching net worth:', nwError.message);
                setError('Could not load Net Worth Trend: ' + nwError.message);
            } else {
                setNetWorthData(nwData);
            }

            // 2. Transactions Query
            let txQuery = supabase.from('v_all_transactions').select('*');
            
            const today = new Date();
            let startDate: Date | null = null;
            if (dateFilter === 'month') startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            else if (dateFilter === '30days') startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            else if (dateFilter === 'ytd') startDate = new Date(today.getFullYear(), 0, 1);
            if (startDate) txQuery = txQuery.gte('date', startDate.toISOString());
            if (accountFilter !== 'all') txQuery = txQuery.or(`account_id.eq.${accountFilter},to_account_id.eq.${accountFilter}`);
            if (categoryFilter !== 'all') txQuery = txQuery.eq('category_id', categoryFilter);
            if (typeFilter !== 'all') txQuery = txQuery.eq('type', typeFilter);

            const { data: txData, error: txError } = await txQuery;
            if (txError) {
                 console.error('Error fetching transactions:', txError);
                 setError(txError.message);
            } else if (txData) {
                // 3. Process Cash Flow
                const monthlyData: { [key: string]: { Income: number; Expense: number } } = {};
                const spendingData: { [key: string]: number } = {};
                
                txData.forEach(tx => {
                    const date = new Date(tx.date);
                    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    
                    if (!monthlyData[monthKey]) monthlyData[monthKey] = { Income: 0, Expense: 0 };
                    if (tx.type === 'Income') {
                        monthlyData[monthKey].Income += tx.amount;
                    } else if (tx.type === 'Expense') {
                        // --- FIX 1: Use Math.abs() to sum expenses as positive numbers ---
                        monthlyData[monthKey].Expense += Math.abs(tx.amount);
                    }
                    
                    if (tx.type === 'Expense' && tx.category) {
                        const mainCat = tx.category;
                        // --- FIX 2: Use Math.abs() to get positive amount ---
                        const amount = Math.abs(tx.amount);
                        if (!spendingData[mainCat]) {
                            spendingData[mainCat] = 0;
                        }
                        spendingData[mainCat] += amount;
                    }
                });
                
                setCashFlowData(Object.keys(monthlyData).map(key => {
                    const item = monthlyData[key];
                    return {
                        name: new Date(key + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                        Income: item.Income,
                        // 'Expense' is now positive, so this math is correct
                        Expense: item.Expense,
                        // 'Net' math is now correct (e.g., 10000 - 9800)
                        Net: item.Income - item.Expense,
                    };
                }).sort((a, b) => new Date(`1 ${a.name}`).getTime() - new Date(`1 ${b.name}`).getTime()));
                
                // 4. Process Spending Deep Dive
                setSpendingTreemapData(Object.keys(spendingData).map((mainCat, index) => {
                    return { 
                        name: mainCat, 
                        // 'value' is now positive
                        value: spendingData[mainCat], 
                        fill: TREEMAP_COLORS[index % TREEMAP_COLORS.length]
                    };
                // This filter now correctly works on positive values
                }).filter(d => d.value > 0));
            }
            
            // 5. Process Budget vs. Actual
            const { data: bData, error: bError } = await supabase
                .from('v_budgets_with_actuals')
                .select('*')
                .eq('month', today.getMonth() + 1)
                .eq('year', today.getFullYear());
                
            if (bError) console.error('Error fetching budgets:', bError);
            else setBudgetData(bData as BudgetData[]);

            setLoading(false);
        };
        
        loadAllDashboardData();
    }, [dateFilter, accountFilter, categoryFilter, typeFilter]);

    return (
        <div>
            {/* --- Header & Navigation Buttons --- */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
                <h1 className={styles.title}>Analytics & Reports</h1>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <Link to="/analytics/reports" className={styles.addButton} style={{backgroundColor: '#6b7280'}}>
                        Custom Reports
                    </Link>
                    <Link to="/analytics/statements" className={styles.addButton}>
                        Formal Statements
                    </Link>
                </div>
            </div>
            
            
            {/* --- Global Filters --- */}
            <div className={styles.filterWrapper} style={{justifyContent: 'flex-start', marginBottom: '1.5rem'}}>
                <label className={styles.label} htmlFor="type-filter">Type:</label>
                <select 
                    id="type-filter"
                    className={styles.input}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
                >
                    <option value="all">All Types</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Transfer">Transfer</option>
                </select>
                
                <label className={styles.label} htmlFor="category-filter">Category:</label>
                <select 
                    id="category-filter"
                    className={styles.input}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    disabled={typeFilter === 'Transfer'}
                >
                    <option value="all">All Categories</option>
                    {filterCategories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                            {cat.category}{cat.subcategory ? ` / ${cat.subcategory}` : ''}
                        </option>
                    ))}
                </select>

                <label className={styles.label} htmlFor="account-filter">Account:</label>
                <select 
                    id="account-filter"
                    className={styles.input}
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                >
                    <option value="all">All Accounts</option>
                    {filterAccounts.map(acc => (
                        <option key={acc.account_id} value={acc.account_id}>
                            {acc.account_name}
                        </option>
                    ))}
                </select>

                <label className={styles.label} htmlFor="date-filter">Show:</label>
                <select 
                    id="date-filter"
                    className={styles.input}
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                >
                    <option value="ytd">Year to Date</option>
                    <option value="month">This Month</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            
            {error && <p className={styles.errorText} style={{ textAlign: 'center' }}>Error: {error}</p>}

            <div className={styles.pageGrid}>
                
                {/* --- SECTION 1: Net Worth Progression --- */}
                <div className={`${styles.card} ${styles.tableSection}`}>
                    <h2 className={styles.cardTitle}>Net Worth Progression (All Time)</h2>
                    <div className={styles.chartContainer} style={{height: '350px'}}>
                        {loading ? <p>Loading Net Worth Trend...</p> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={netWorthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month_start" tickFormatter={formatXAxis} fontSize="0.7rem"/>
                                    <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="0.7rem" width={100}/>
                                    <Tooltip 
                                        formatter={(value: number) => [formatCurrency(value), "Net Worth"]}
                                        labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    />
                                    <Legend wrapperStyle={{fontSize: "0.7rem"}}/>
                                    <defs>
                                        <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="net_worth" stroke="#3b82f6" fill="url(#colorNetWorth)" name="Net Worth" strokeWidth={2}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* --- SECTION 2: Cash Flow (Income vs. Expense) --- */}
                <div className={`${styles.card} ${styles.tableSection}`}>
                    <h2 className={styles.cardTitle}>Cash Flow (Filtered)</h2>
                    <div className={styles.chartContainer} style={{height: '350px'}}>
                        {loading ? <p>Loading Cash Flow Data...</p> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashFlowData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize="0.7rem" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="0.7rem" width={100} />
                                    <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]}/>
                                    <Legend wrapperStyle={{fontSize: "0.7rem"}}/>
                                    <Bar dataKey="Income" fill="#10b981" />
                                    {/* This now plots the positive 'Expense' value */}
                                    <Bar dataKey="Expense" fill="#ef4444" />
                                    {/* This now plots the correct 'Net' value */}
                                    <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* --- SECTION 3: Spending Deep Dive & BvA --- */}
                <div className={styles.analyticsSection}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Spending Deep Dive (Filtered)</h2>
                        <div className={styles.chartContainer}>
                            {loading ? <p>Loading Spending Data...</p> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <Treemap
                                        data={spendingTreemapData}
                                        dataKey="value"
                                        aspectRatio={4/3}
                                        stroke="#fff"
                                        isAnimationActive={false}
                                        nameKey="name"
                                        content={<CustomTreemapContent />}
                                    >
                                        <Tooltip content={<CustomTreemapTooltip />} />
                                    </Treemap>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Budget vs. Actual (This Month)</h2>
                        <div className={budgetStyles.budgetList}>
                            {loading ? <p>Loading Budget Data...</p> : budgetData.length === 0 ? (
                                <p style={{textAlign: 'center', fontSize: '0.9rem', color: '#6b7280'}}>No budgets set for this month.</p>
                            ) : (
                                budgetData.map(b => {
                                    // --- FIX 3: Use Math.abs() for all BvA logic ---
                                    const actual = Math.abs(b.actual_amount);
                                    const percent = b.budgeted_amount > 0 ? (actual / b.budgeted_amount) * 100 : 0;
                                    const isOver = actual > b.budgeted_amount;
                                    
                                    return (
                                        <li key={b.budget_id} className={budgetStyles.budgetItem}>
                                            <div className={budgetStyles.budgetName}>
                                                <span>{b.category}</span>
                                                <span className={budgetStyles.budgetAmount}>
                                                    {/* Display the positive 'actual' value */}
                                                    <strong>{formatCurrency(actual)}</strong> of {formatCurrency(b.budgeted_amount)}
                                                </span>
                                            </div>
                                            <div className={budgetStyles.progressBarContainer}>
                                                <div 
                                                    className={`${budgetStyles.progressBar} ${isOver ? budgetStyles.overBudget : ''}`}
                                                    // This logic is now correct
                                                    style={{ width: `${isOver ? 100 : percent}%` }}
                                                ></div>
                                                <div 
                                                    className={budgetStyles.budgetMarker}
                                                    style={{ left: `${isOver ? 100 : percent}%` }}
                                                ></div>
                                            </div>
                                        </li>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnalyticsPage;