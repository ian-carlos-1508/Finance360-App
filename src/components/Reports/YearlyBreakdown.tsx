import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPrint } from 'react-icons/fa';
import { HiChevronDoubleLeft } from 'react-icons/hi'; // <-- Import icon

// --- Type Definitions (Unchanged) ---
type SqlRecord = {
    category_type: 'Income' | 'Expense';
    category_name: string;
    month_num: number; // 1 (Jan) - 12 (Dec)
    total_amount: number;
};
type MonthlyData = number[]; 
type PivotData = {
    income: Map<string, MonthlyData>;
    expense: Map<string, MonthlyData>;
    totalIncome: MonthlyData;
    totalExpense: MonthlyData;
    netIncome: MonthlyData;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function YearlyBreakdown() {
    // --- State and Data Fetching (Unchanged) ---
    const [pivotData, setPivotData] = useState<PivotData | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchYearlyBreakdown = async () => {
            setLoading(true);
            setError('');

            const { data, error: rpcError } = await supabase.rpc('get_yearly_breakdown', {
                p_year: selectedYear,
            });

            if (rpcError) {
                setError(`Error fetching yearly breakdown: ${rpcError.message}`);
                setPivotData(null);
            } else if (data) {
                // Pivot data logic (Unchanged)
                const incomeMap = new Map<string, MonthlyData>();
                const expenseMap = new Map<string, MonthlyData>();
                const totalIncome: MonthlyData = Array(12).fill(0);
                const totalExpense: MonthlyData = Array(12).fill(0);

                (data as SqlRecord[]).forEach(record => {
                    const map = record.category_type === 'Income' ? incomeMap : expenseMap;
                    const totals = record.category_type === 'Income' ? totalIncome : totalExpense;
                    const monthIndex = record.month_num - 1; 

                    if (!map.has(record.category_name)) {
                        map.set(record.category_name, Array(12).fill(0));
                    }
                    
                    map.get(record.category_name)![monthIndex] = record.total_amount;
                    totals[monthIndex] += record.total_amount;
                });

                const netIncome = totalIncome.map((inc, i) => inc - totalExpense[i]);

                setPivotData({
                    income: incomeMap,
                    expense: expenseMap,
                    totalIncome,
                    totalExpense,
                    netIncome,
                });
            } else {
                setPivotData(null); 
            }
            setLoading(false);
        };
        fetchYearlyBreakdown();
    }, [selectedYear]);

    const handlePrint = () => {
        window.print();
    };

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div>
            {/* --- Filters (Unchanged) --- */}
            <div className={`${styles.filterWrapper} no-print`} style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className={styles.label}>Select Year:</label>
                    <select
                        className={styles.input}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                        style={{width: '120px'}}
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <button className={styles.addButton} onClick={handlePrint} style={{backgroundColor: '#6b7280', alignSelf: 'flex-start'}}>
                    <FaPrint /> Print / Save PDF
                </button>
            </div>
            
            {/* --- NEW: Sidebar Collapse Hint (in English) --- */}
            <div className={`${styles.reportHint} no-print`} style={{ marginBottom: '1.5rem' }}>
                <HiChevronDoubleLeft style={{ fontSize: '1.2rem', flexShrink: 0 }} />
                <span>**Hint:** For a wider view, collapse the sidebar.</span>
            </div>

            <h2 className={styles.cardTitle} style={{textAlign: 'center', fontSize: '1.2rem', borderBottom: 'none'}}>
                Yearly Breakdown
            </h2>
            <p style={{textAlign: 'center', marginTop: '-1.5rem', marginBottom: '2rem', fontSize: '0.9rem', color: '#6b7280'}}>
                For {selectedYear}
            </p>

            {loading && <p style={{textAlign: 'center', padding: '1rem'}}>Loading Report...</p>}
            {error && <p className={styles.errorText} style={{textAlign: 'center', padding: '1rem'}}>Error: {error}</p>}

            {!loading && pivotData && (
                // FIX: Added 'tableCondensed' class
                <div className={styles.tableContainer} style={{overflowX: 'auto'}}>
                    <table className={`${styles.table} ${styles.tableCondensed}`} style={{minWidth: '1000px'}}>
                        {/* --- Table Header (Months) --- */}
                        <thead>
                            <tr>
                                {/* FIX: Adjusted column widths */}
                                <th style={{ fontSize: '0.75rem', minWidth: '160px', position: 'sticky', left: 0, background: '#fff' }}>Category</th>
                                {MONTHS.map(month => (
                                    <th key={month} style={{ fontSize: '0.75rem', textAlign: 'right', minWidth: '80px' }}>
                                        {month}
                                    </th>
                                ))}
                                <th style={{ fontSize: '0.75rem', textAlign: 'right', minWidth: '100px', borderLeft: '2px solid #ccc' }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- Income Section --- */}
                            <tr>
                                <td colSpan={14} style={{fontWeight: 700, fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem'}}>
                                    REVENUE
                                </td>
                            </tr>
                            {Array.from(pivotData.income.keys()).map(categoryName => (
                                <tr key={`inc-${categoryName}`}>
                                    <td style={{ fontSize: '0.75rem', paddingLeft: '2rem', position: 'sticky', left: 0, background: '#fff' }}>{categoryName}</td>
                                    {pivotData.income.get(categoryName)!.map((amount, i) => (
                                        <td key={i} style={{ fontSize: '0.7rem', textAlign: 'right' }}>
                                            {amount === 0 ? '-' : formatCurrency(amount)}
                                        </td>
                                    ))}
                                    <td style={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 600, borderLeft: '2px solid #ccc' }}>
                                        {formatCurrency(pivotData.income.get(categoryName)!.reduce((a, b) => a + b, 0))}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{backgroundColor: '#f9fafb'}}>
                                <td style={{ fontSize: '0.75rem', fontWeight: 700, position: 'sticky', left: 0, background: '#f9fafb' }}>Total Revenue</td>
                                {pivotData.totalIncome.map((amount, i) => (
                                    <td key={i} style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>
                                        {formatCurrency(amount)}
                                    </td>
                                ))}
                                <td style={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 700, borderLeft: '2px solid #ccc' }}>
                                    {formatCurrency(pivotData.totalIncome.reduce((a, b) => a + b, 0))}
                                </td>
                            </tr>

                            {/* --- Expense Section --- */}
                            <tr>
                                <td colSpan={14} style={{fontWeight: 700, fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', paddingTop: '1.5rem'}}>
                                    EXPENSES
                                </td>
                            </tr>
                            {Array.from(pivotData.expense.keys()).map(categoryName => (
                                <tr key={`exp-${categoryName}`}>
                                    <td style={{ fontSize: '0.75rem', paddingLeft: '2rem', position: 'sticky', left: 0, background: '#fff' }}>{categoryName}</td>
                                    {pivotData.expense.get(categoryName)!.map((amount, i) => (
                                        <td key={i} style={{ fontSize: '0.7rem', textAlign: 'right' }}>
                                            {amount === 0 ? '-' : `(${formatCurrency(amount)})`}
                                        </td>
                                    ))}
                                    <td style={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 600, borderLeft: '2px solid #ccc' }}>
                                        ({formatCurrency(pivotData.expense.get(categoryName)!.reduce((a, b) => a + b, 0))})
                                    </td>
                                </tr>
                            ))}
                            <tr style={{backgroundColor: '#f9fafb'}}>
                                <td style={{ fontSize: '0.75rem', fontWeight: 700, position: 'sticky', left: 0, background: '#f9fafb' }}>Total Expenses</td>
                                {pivotData.totalExpense.map((amount, i) => (
                                    <td key={i} style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>
                                        ({formatCurrency(amount)})
                                    </td>
                                ))}
                                <td style={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 700, borderLeft: '2px solid #ccc' }}>
                                    ({formatCurrency(pivotData.totalExpense.reduce((a, b) => a + b, 0))})
                                </td>
                            </tr>

                            {/* --- Net Income Section --- */}
                            <tr style={{borderTop: '2px solid #111827', backgroundColor: '#f3f4f6'}}>
                                <td style={{ fontSize: '0.8rem', fontWeight: 700, position: 'sticky', left: 0, background: '#f3f4f6' }}>NET INCOME</td>
                                {pivotData.netIncome.map((amount, i) => {
                                    const netClass = amount > 0 ? styles.kpiChangePositive : (amount < 0 ? styles.kpiChangeNegative : styles.kpiChangeNeutral);
                                    return (
                                        <td key={i} style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }} className={netClass}>
                                            {formatCurrency(amount)}
                                        </td>
                                    );
                                })}
                                <td style={{ fontSize: '0.8rem', textAlign: 'right', fontWeight: 700, borderLeft: '2px solid #ccc' }}
                                    className={pivotData.netIncome.reduce((a, b) => a + b, 0) > 0 ? styles.kpiChangePositive : styles.kpiChangeNegative}
                                >
                                    {formatCurrency(pivotData.netIncome.reduce((a, b) => a + b, 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- Print Footer --- */}
            <footer style={{marginTop: '3rem', textAlign: 'center'}} className={styles.printFooter}>
                Finance360 - Confidential Report - {new Date().toLocaleDateString()}
            </footer>
        </div>
    );
}

export default YearlyBreakdown;