/* Replace file: src/pages/Reports/ReportsPage.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import AccountStatement from '../../components/Reports/AccountStatement';
import CategoryAnalysis from '../../components/Reports/CategoryAnalysis';
import ExpenseAnalysis from '../../components/Reports/ExpenseAnalysis';
import IncomeAnalysis from '../../components/Reports/IncomeAnalysis';
import LoanAnalysis from '../../components/Reports/LoanAnalysis';
import CreditCardAnalysis from '../../components/Reports/CreditCardAnalysis';
// --- NEW: Import the PortfolioAnalysis component ---
import PortfolioAnalysis from '../../components/Reports/PortfolioAnalysis';

// --- NEW: Added 'portfolio' to the type ---
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
            <h1 className={styles.title}>Custom Reports</h1>

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
                {/* --- NEW: Add the Portfolio Analysis tab --- */}
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

                {/* --- NEW: Render the PortfolioAnalysis component --- */}
                {activeReport === 'portfolio' && (
                    <PortfolioAnalysis />
                )}

            </div>
        </div>
    );
}

export default ReportsPage;