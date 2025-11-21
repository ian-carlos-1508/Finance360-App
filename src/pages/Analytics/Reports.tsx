/* Replace file: src/pages/Reports/ReportsPage.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import AccountStatement from '../../components/Reports/AccountStatement';
import CategoryAnalysis from '../../components/Reports/CategoryAnalysis';
import ExpenseAnalysis from '../../components/Reports/ExpenseAnalysis';
import IncomeAnalysis from '../../components/Reports/IncomeAnalysis';
import LoanAnalysis from '../../components/Reports/LoanAnalysis';
import CreditCardAnalysis from '../../components/Reports/CreditCardAnalysis';
import PortfolioAnalysis from '../../components/Reports/PortfolioAnalysis';
import { Link } from 'react-router-dom';
import BackToHub from '../../components/Navigation/BackToHub'; 

type ReportType = 
  | 'accountStatement' 
  | 'category' 
  | 'expense' 
  | 'income' 
  | 'loanAnalysis' 
  | 'creditCard'
  | 'portfolio';

function ReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportType>('accountStatement'); 

    return (
        <div>
            {/* 1. PRIMARY BACK NAVIGATION (Back to Hub) */}
            <BackToHub to="/optimize" label="Back to Wealth HQ" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                
                {/* TITLE & SUBTITLE */}
                <div>
                    <h1 className={styles.title} style={{ marginBottom: '0.25rem' }}>Custom Reports</h1>
                    <p className="text-gray-500 text-sm">Deep dive analysis, income statements, and long-term trends.</p>
                </div>

                {/* 2. SECONDARY LINK (TO FORMAL STATEMENTS) */}
                {/* This link is now outside the tabs, using a consistent neutral style. */}
                <Link 
                    to="/analytics/statements" 
                    className={styles.cancelButton} /* Neutral button style */
                    style={{ 
                        alignSelf: 'flex-start',
                        padding: '0.5rem 1rem', 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                    }}
                >
                    View Formal Statements &rarr;
                </Link>
            </div>

            {/* --- Report Selector Tabs --- */}
            <div className={styles.tabHeader} style={{marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                
                <button
                    className={activeReport === 'accountStatement' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('accountStatement')}
                >
                    Account Statement
                </button>
                <button
                    className={activeReport === 'category' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('category')}
                >
                    Categories Analysis
                </button>
                <button
                    className={activeReport === 'expense' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('expense')}
                >
                    Expense Analysis
                </button>
                <button
                    className={activeReport === 'income' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('income')}
                >
                    Income Analysis
                </button>
                <button
                    className={activeReport === 'loanAnalysis' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('loanAnalysis')}
                >
                    Loan Analysis
                </button>
                <button
                    className={activeReport === 'creditCard' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('creditCard')}
                >
                    Credit Card Analysis
                </button>
                <button
                    className={activeReport === 'portfolio' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveReport('portfolio')}
                >
                    Portfolio Analysis
                </button>
            </div>

            {/* --- Main Card that holds the selected report --- */}
            <div className={`${styles.card} ${styles.tableSection}`}>
                
                {activeReport === 'accountStatement' && (
                    <AccountStatement /> 
                )}
                
                {activeReport === 'category' && (
                    <CategoryAnalysis /> 
                )}
                
                {activeReport === 'expense' && (
                    <ExpenseAnalysis /> 
                )}
                
                {activeReport === 'income' && (
                    <IncomeAnalysis />
                )}

                {activeReport === 'loanAnalysis' && (
                    <LoanAnalysis />
                )}
                
                {activeReport === 'creditCard' && (
                    <CreditCardAnalysis />
                )}

                {activeReport === 'portfolio' && (
                    <PortfolioAnalysis />
                )}

            </div>
        </div>
    );
}

export default ReportsPage;