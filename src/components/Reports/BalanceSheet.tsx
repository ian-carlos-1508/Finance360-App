import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPrint } from 'react-icons/fa'; // Para imprimir

// --- Type Definitions ---
type BalanceSheetData = {
    assets_cash: number;
    assets_investments: number;
    assets_real_estate: number;
    total_assets: number;
    liabilities_credit_cards: number;
    liabilities_debts: number;
    total_liabilities: number;
    net_worth: number;
};

function BalanceSheet() {
    const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBalanceSheet = async () => {
            if (!asOfDate) return;

            setLoading(true);
            setError('');

            const { data, error: rpcError } = await supabase.rpc('get_balance_sheet_snapshot', {
                p_as_of_date: asOfDate,
            });

            if (rpcError) {
                setError(`Error fetching balance sheet: ${rpcError.message}`);
                setBalanceSheetData(null);
            } else if (data && data.length > 0) {
                setBalanceSheetData(data[0] as BalanceSheetData);
            } else {
                setBalanceSheetData(null);
            }
            
            setLoading(false);
        };
        fetchBalanceSheet();
    }, [asOfDate]);

    // Handle print
    const handlePrint = () => {
        window.print();
    };
    
    const formattedDate = new Date(asOfDate + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div>
            {/* --- FILTROS (SE OCULTARÁN AL IMPRIMIR) --- */}
            <div className={styles.filterWrapper} style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label className={styles.label}>As of Date:</label>
                    <input 
                        type="date"
                        className={styles.input} 
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                        style={{width: '180px'}}
                    />
                </div>
                <button className={styles.addButton} onClick={handlePrint} style={{backgroundColor: '#6b7280'}}>
                    <FaPrint /> Print / Save PDF
                </button>
            </div>
            
            {/* --- CABECERA DEL REPORTE --- */}
            <h2 className={styles.cardTitle} style={{textAlign: 'center', fontSize: '1.2rem', borderBottom: 'none'}}>
                Balance Sheet
            </h2>
            <p style={{textAlign: 'center', marginTop: '-1.5rem', marginBottom: '2rem', fontSize: '0.9rem', color: '#6b7280'}}>
                As of {formattedDate}
            </p>

            {loading && <p style={{textAlign: 'center', padding: '1rem'}}>Loading Balance Sheet...</p>}
            {error && <p className={styles.errorText} style={{textAlign: 'center', padding: '1rem'}}>Error: {error}</p>}

            {!loading && balanceSheetData && (
                <div className={styles.analyticsSection} style={{gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                    {/* --- ASSETS COLUMN --- */}
                    <div>
                        <h3 className={styles.listTitle} style={{borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem'}}>Assets</h3>
                        <table className={styles.table} style={{marginTop: '1rem'}}>
                            <tbody>
                                <tr>
                                    <td>Cash & Bank Accounts</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.assets_cash)}</td>
                                </tr>
                                <tr>
                                    <td>Investments</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.assets_investments)}</td>
                                </tr>
                                <tr>
                                    <td>Real Estate</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.assets_real_estate)}</td>
                                </tr>
                                <tr style={{borderTop: '2px solid #111827'}}>
                                    <td style={{fontWeight: 700}}>Total Assets</td>
                                    <td style={{textAlign: 'right', fontWeight: 700}}>{formatCurrency(balanceSheetData.total_assets)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    {/* --- LIABILITIES & EQUITY COLUMN --- */}
                    <div>
                        <h3 className={styles.listTitle} style={{borderBottom: '2px solid #ef4444', paddingBottom: '0.5rem'}}>Liabilities & Equity</h3>
                        <table className={styles.table} style={{marginTop: '1rem'}}>
                            <tbody>
                                <tr>
                                    <td style={{fontWeight: 600}}>Liabilities</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td style={{paddingLeft: '2rem'}}>Credit Cards</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.liabilities_credit_cards)}</td>
                                </tr>
                                <tr>
                                    <td style={{paddingLeft: '2rem'}}>Loans & Debts</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.liabilities_debts)}</td>
                                </tr>
                                <tr style={{borderTop: '1px solid #e5e7eb'}}>
                                    <td style={{fontWeight: 600}}>Total Liabilities</td>
                                    <td style={{textAlign: 'right', fontWeight: 600}}>{formatCurrency(balanceSheetData.total_liabilities)}</td>
                                </tr>
                                
                                <tr style={{height: '2rem'}}><td></td><td></td></tr>
                                
                                <tr>
                                    <td style={{fontWeight: 600}}>Equity</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Net Worth</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(balanceSheetData.net_worth)}</td>
                                </tr>
                                <tr style={{borderTop: '1px solid #e5e7eb'}}>
                                    <td style={{fontWeight: 600}}>Total Equity</td>
                                    <td style={{textAlign: 'right', fontWeight: 600}}>{formatCurrency(balanceSheetData.net_worth)}</td>
                                </tr>
                                
                                <tr style={{borderTop: '2px solid #111827', backgroundColor: '#f9fafb'}}>
                                    <td style={{fontWeight: 700}}>Total Liabilities & Equity</td>
                                    <td style={{textAlign: 'right', fontWeight: 700}}>{formatCurrency(balanceSheetData.total_liabilities + balanceSheetData.net_worth)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- PIE DE PÁGINA SOLO PARA IMPRESIÓN --- */}
            <footer className={styles.printFooter}>
                Finance360 - Reporte Confidencial - {new Date().toLocaleDateString()}
            </footer>
        </div>
    );
}

export default BalanceSheet;