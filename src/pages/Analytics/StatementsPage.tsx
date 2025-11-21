/* Replace file: src/pages/Analytics/StatementsPage.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import BalanceSheet from '../../components/Reports/BalanceSheet';
import AccountMonthlySummary from '../../components/Reports/AccountMonthlySummary';
import IncomeStatement from '../../components/Reports/IncomeStatement';
import YearlyBreakdown from '../../components/Reports/YearlyBreakdown';
import GeneralLedger from '../../components/Reports/GeneralLedger'; 
import { Link } from 'react-router-dom';
import BackToHub from '../../components/Navigation/BackToHub'; 

type ReportType = 'balanceSheet' | 'accountSummary' | 'incomeStatement' | 'yearlyBreakdown' | 'generalLedger'; 

function StatementsPage() {
    const [activeReport, setActiveReport] = useState<ReportType>('generalLedger'); 

    return (
        <div>
            {/* 1. PRIMARY BACK NAVIGATION (Back to Hub) */}
            <BackToHub to="/optimize" label="Back to Wealth HQ" />

            {/* 2. MAIN HEADER BLOCK (Title + Subtitle + Secondary Link) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                
                {/* TITLE & SUBTITLE */}
                <div>
                    <h1 className={styles.title} style={{ marginBottom: '0.25rem' }}>Formal Statements</h1>
                    <p className="text-gray-500 text-sm">Your business-grade financial record.</p>
                </div>

                {/* SECONDARY LINK (TO CUSTOM REPORTS) */}
                <Link 
                    to="/analytics/reports" 
                    className={styles.cancelButton} 
                    style={{ 
                        alignSelf: 'flex-start',
                        padding: '0.5rem 1rem', 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                    }}
                >
                    &larr; Back to Custom Reports
                </Link>
            </div>


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
                    <GeneralLedger /> 
                )}

            </div>
        </div>
    );
}

export default StatementsPage;