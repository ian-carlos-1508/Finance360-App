import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import BalanceSheet from '../../components/Reports/BalanceSheet';
import AccountMonthlySummary from '../../components/Reports/AccountMonthlySummary';
import IncomeStatement from '../../components/Reports/IncomeStatement';
import YearlyBreakdown from '../../components/Reports/YearlyBreakdown';
import GeneralLedger from '../../components/Reports/GeneralLedger'; // <-- IMPORTAR NUEVO

type ReportType = 'balanceSheet' | 'accountSummary' | 'incomeStatement' | 'yearlyBreakdown' | 'generalLedger'; // <-- AÑADIR NUEVO TIPO

function StatementsPage() {
    const [activeReport, setActiveReport] = useState<ReportType>('generalLedger'); // Default al nuevo reporte

    return (
        <div>
            <h1 className={styles.title}>Formal Statements</h1>

            {/* --- Report Selector Tabs --- */}
            <div className={styles.tabHeader} style={{marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                <button
                    className={activeReport === 'balanceSheet' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('balanceSheet')}
                >
                    Balance Sheet
                </button>
                <button
                    className={activeReport === 'accountSummary' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('accountSummary')}
                >
                    Account Monthly Summary
                </button>
                <button
                    className={activeReport === 'incomeStatement' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('incomeStatement')}
                >
                    Income Statement
                </button>
                <button
                    className={activeReport === 'yearlyBreakdown' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('yearlyBreakdown')}
                >
                    Yearly Breakdown
                </button>
                {/* --- NUEVA PESTAÑA --- */}
                <button
                    className={activeReport === 'generalLedger' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('generalLedger')}
                >
                    General Ledger
                </button>
            </div>

            {/* --- Main Card that holds the selected report --- */}
            <div className={`${styles.card} ${styles.tableSection}`}>
                
                {activeReport === 'balanceSheet' && (
                    <BalanceSheet />
                )}

                {activeReport === 'accountSummary' && (
                    <AccountMonthlySummary />
                )}
                
                {activeReport === 'incomeStatement' && (
                    <IncomeStatement />
                )}

                {activeReport === 'yearlyBreakdown' && (
                    <YearlyBreakdown />
                )}

                {activeReport === 'generalLedger' && (
                    <GeneralLedger /> // <-- RENDERIZAR NUEVO
                )}

            </div>
        </div>
    );
}

export default StatementsPage;