import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { type Account } from '../Accounts/AddAccountForm';

// --- Type Definitions (Sin cambios) ---
type StatementRecord = {
    month_start: string;
    starting_balance: number;
    income: number;
    expenses: number;
    transfers_in: number;
    transfers_out: number;
    net_change: number;
    ending_balance: number;
};

// --- Helper Functions (Sin cambios) ---
const formatMonthYear = (tickItem: string) => {
    // Input is 'YYYY-MM'
    const date = new Date(tickItem + '-01T12:00:00');
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    // FIX: Formato más corto para caber en la columna
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};


function AccountMonthlySummary() {
    // --- State y Data Fetching (Sin cambios) ---
    const today = new Date();
    const [statementData, setStatementData] = useState<StatementRecord[]>([]);
    const [accountList, setAccountList] = useState<Account[]>([]);
    
    const defaultStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];

    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const fetchAccounts = async () => {
            const { data, error } = await supabase.from('accounts').select('account_id, account_name, type');
            if (error) {
                setError(error.message);
            } else if (data) {
                setAccountList(data as Account[]);
                if (data.length > 0) {
                    setSelectedAccountId(data[0].account_id);
                }
            }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        const fetchStatement = async () => {
            if (!selectedAccountId || !startDate || !endDate) {
                setStatementData([]);
                return;
            }

            setLoading(true);
            setError('');
            
            const { data, error: rpcError } = await supabase.rpc('get_account_balance_statement', {
                p_account_id: selectedAccountId,
                p_start_date: startDate,
                p_end_date: endDate,
            });

            if (rpcError) {
                setError(`Error fetching statement: ${rpcError.message}`);
                setStatementData([]);
            } else {
                setStatementData(data as StatementRecord[]);
            }
            
            setLoading(false);
        };
        fetchStatement();
    }, [selectedAccountId, startDate, endDate]);
    
    const firstStartingBalance = statementData[0]?.starting_balance ?? 0;
    const lastEndingBalance = statementData[statementData.length - 1]?.ending_balance ?? 0;
    const netTotalChange = lastEndingBalance - firstStartingBalance;

    // --- LÓGICA DE RENDERIZADO (RECONSTRUIDA) ---
    const renderData = () => {
        if (loading) return <p style={{textAlign: 'center', padding: '1rem'}}>Loading Account Statement...</p>;
        if (error) return <p className={styles.errorText} style={{textAlign: 'center', padding: '1rem'}}>Error: {error}</p>;
        if (statementData.length === 0) return <p style={{textAlign: 'center', padding: '1rem'}}>No data to display for the selected period.</p>;

        const months = statementData.map(record => record.month_start);

        return (
            <div className={styles.tableContainer} style={{maxHeight: '500px', overflowY: 'auto', marginTop: '1.5rem'}}>
                <table className={styles.table}>
                    {/* --- Encabezado con Meses --- */}
                    <thead>
                        <tr>
                            <th style={{ fontSize: '0.8rem', minWidth: '150px' }}>Metric</th>
                            {months.map(month => (
                                <th key={month} style={{ fontSize: '0.8rem', textAlign: 'right' }}>
                                    {formatMonthYear(month)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* --- Cuerpo con Métricas --- */}
                    <tbody>
                        {/* Fila 1: Starting Balance */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', fontWeight: 700 }}>Start Balance</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.7rem', fontWeight: 700, textAlign: 'right' }}>
                                    {formatCurrency(record.starting_balance)}
                                </td>
                            ))}
                        </tr>
                        {/* Fila 2: Income */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', paddingLeft: '1.5rem', color: '#10b981' }}>Income</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.7rem', color: '#10b981', textAlign: 'right' }}>
                                    {formatCurrency(record.income)}
                                </td>
                            ))}
                        </tr>
                        {/* Fila 3: Expenses */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', paddingLeft: '1.5rem', color: '#ef4444' }}>Expenses</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.7rem', color: '#ef4444', textAlign: 'right' }}>
                                    ({formatCurrency(record.expenses)})
                                </td>
                            ))}
                        </tr>
                        {/* Fila 4: Transfers In */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', paddingLeft: '1.5rem', color: '#3b82f6' }}>Transfers In</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.7rem', color: '#3b82f6', textAlign: 'right' }}>
                                    {formatCurrency(record.transfers_in)}
                                </td>
                            ))}
                        </tr>
                        {/* Fila 5: Transfers Out */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', paddingLeft: '1.5rem', color: '#f59e0b' }}>Transfers Out</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.7rem', color: '#f59e0b', textAlign: 'right' }}>
                                    ({formatCurrency(record.transfers_out)})
                                </td>
                            ))}
                        </tr>
                        {/* Fila 6: Net Change */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>Net Change</td>
                            {statementData.map(record => {
                                const netChangeClass = record.net_change > 0 ? styles.kpiChangePositive : (record.net_change < 0 ? styles.kpiChangeNegative : styles.kpiChangeNeutral);
                                return (
                                    <td key={record.month_start} style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right' }} className={netChangeClass}>
                                        {formatCurrency(record.net_change)}
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Fila 7: Growth % */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>Growth %</td>
                            {statementData.map(record => {
                                const growth = record.starting_balance === 0 
                                    ? (record.net_change > 0 ? 100 : 0) // Handle divide by zero
                                    : (record.net_change / record.starting_balance) * 100;
                                const growthClass = growth > 0 ? styles.kpiChangePositive : (growth < 0 ? styles.kpiChangeNegative : styles.kpiChangeNeutral);
                                return (
                                    <td key={record.month_start} style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right' }} className={growthClass}>
                                        {growth.toFixed(2)}%
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Fila 8: Ending Balance */}
                        <tr>
                            <td style={{ fontSize: '0.8rem', fontWeight: 700 }}>End Balance</td>
                            {statementData.map(record => (
                                <td key={record.month_start} style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>
                                    {formatCurrency(record.ending_balance)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            {/* --- Filtros y KPIs (Sin cambios) --- */}
            <h2 className={styles.cardTitle}>Account Monthly Summary</h2>
            <div className={`${styles.filterWrapper} no-print`} style={{justifyContent: 'flex-start', marginBottom: '1.5rem'}}>
                <label className={styles.label}>Account:</label>
                <select
                    className={styles.input}
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{width: '200px'}}
                >
                    <option value="" disabled>Select an account</option>
                    {accountList.map(acc => (
                        <option key={acc.account_id} value={acc.account_id}>{acc.account_name}</option>
                    ))}
                </select>

                <label className={styles.label}>Start Date:</label>
                <input 
                    type="date"
                    className={styles.input} 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{width: '150px'}}
                />
                <label className={styles.label}>End Date:</label>
                <input 
                    type="date"
                    className={styles.input} 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{width: '150px'}}
                />
            </div>

            {!loading && statementData.length > 0 && (
                <div className={`${styles.kpiSection} no-print`} style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
                    <div className={`${styles.kpiCard} ${styles.gray}`}>
                        <h3 className={styles.kpiTitle}>Starting Balance</h3>
                        <p className={styles.kpiValue}>{formatCurrency(firstStartingBalance)}</p>
                    </div>
                    <div className={`${styles.kpiCard} ${netTotalChange >= 0 ? styles.green : styles.red}`}>
                        <h3 className={styles.kpiTitle}>Net Change</h3>
                        <p className={styles.kpiValue}>{formatCurrency(netTotalChange)}</p>
                    </div>
                    <div className={`${styles.kpiCard} ${styles.blue}`}>
                        <h3 className={styles.kpiTitle}>Ending Balance</h3>
                        <p className={styles.kpiValue}>{formatCurrency(lastEndingBalance)}</p>
                    </div>
                </div>
            )}
            
            {/* --- Tabla Mensual (Pivotada) --- */}
            {renderData()}

            {/* --- Pie de Página para Impresión --- */}
            <footer style={{marginTop: '3rem', textAlign: 'center'}} className={styles.printFooter}>
                Finance360 - Reporte Confidencial - {new Date().toLocaleDateString()}
            </footer>
        </div>
    );
}

export default AccountMonthlySummary;