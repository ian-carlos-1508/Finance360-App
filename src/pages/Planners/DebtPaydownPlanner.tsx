/* Replace file: src/pages/Planners/DebtPaydownPlanner.tsx */

import { useState, useEffect } from 'react';
import styles from './DebtPaydownPlanner.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { calculatePayoff, type Debt, type PayoffSummary } from '../../lib/debtCalculator';
import { HiTrendingUp } from 'react-icons/hi';
import { Link } from 'react-router-dom';

function DebtPaydownPlanner() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [strategy, setStrategy] = useState<'Avalanche' | 'Snowball'>('Avalanche');
  const [extraPayment, setExtraPayment] = useState('0');

  const [avalancheSummary, setAvalancheSummary] = useState<PayoffSummary | null>(null);
  const [snowballSummary, setSnowballSummary] = useState<PayoffSummary | null>(null);

  const summary = strategy === 'Avalanche' ? avalancheSummary : snowballSummary;

  useEffect(() => {
    const fetchDebts = async () => {
      setLoading(true);
      setError('');
      
      // --- FIX 1: Look for balances LESS than 0 ---
      const { data: creditCards } = await supabase
        .from('accounts')
        .select('account_id, account_name, current_balance, apr, minimum_payment')
        .eq('type', 'credit')
        .lt('current_balance', 0); // Was .gt(0)
        
      // --- FIX 2: Look for balances LESS than 0 ---
      const { data: loans } = await supabase
        .from('debts')
        .select('debt_id, debt_name, current_balance, interest_rate_apr, minimum_payment')
        .lt('current_balance', 0); // Was .gt(0)

      if (!creditCards && !loans) {
        setLoading(false);
        // Set a helpful message if no debts are found at all
        setDebts([]);
        return;
      }
      
      const allDebts: Debt[] = [];
      (creditCards || []).forEach(d => allDebts.push({
        id: d.account_id,
        name: d.account_name,
        balance: d.current_balance * -1, // Make positive
        apr: d.apr || 0,
        minimumPayment: d.minimum_payment || 0,
      }));
      (loans || []).forEach(d => allDebts.push({
        id: d.debt_id,
        name: d.debt_name,
        balance: d.current_balance * -1, // Make positive
        apr: d.interest_rate_apr || 0,
        minimumPayment: d.minimum_payment || 0,
      }));

      // Filter out debts that are missing the required data for the calculator
      const validDebts = allDebts.filter(d => d.minimumPayment > 0 && d.apr > 0 && d.balance > 0);
      setDebts(validDebts);
      setLoading(false);
    };

    fetchDebts();
  }, []);

  useEffect(() => {
    if (debts.length > 0) {
      const payment = parseFloat(extraPayment) || 0;
      setAvalancheSummary(calculatePayoff(debts, 'Avalanche', payment));
      setSnowballSummary(calculatePayoff(debts, 'Snowball', payment));
    } else {
      // Clear summaries if there are no valid debts
      setAvalancheSummary(null);
      setSnowballSummary(null);
    }
  }, [debts, extraPayment]);

  // Calculate payoff with 0 extra payment to get baseline
  const baselineSummary = (debts.length > 0) ? calculatePayoff(debts, 'Avalanche', 0) : null;
  const originalMonths = baselineSummary?.totalMonths || 0;
  const newMonths = summary?.totalMonths || 0;

  return (
    <div>
      <div className={styles.plannerHeader}>
        <h1 className={styles.title}>Debt Reduction Planner</h1>
        <Link to="/planners" className={sharedStyles.cancelButton}>
          &larr; Back to Planners
        </Link>
      </div>

      <div className={styles.controls}>
        <div>
          <label htmlFor="extraPayment" className={styles.label}>Extra Monthly Payment</label>
          <input
            id="extraPayment"
            type="number"
            value={extraPayment}
            onChange={(e) => setExtraPayment(e.target.value)}
            className={styles.input}
          />
        </div>
        <div>
          <label className={styles.label}>Strategy</label>
          <div className={styles.toggleGroup}>
            <button
              className={strategy === 'Avalanche' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => setStrategy('Avalanche')}
            >
              Avalanche (Highest APR)
            </button>
            <button
              className={strategy === 'Snowball' ? styles.toggleButtonActive : styles.toggleButton}
              onClick={() => setStrategy('Snowball')}
            >
              Snowball (Lowest Balance)
            </button>
          </div>
        </div>
      </div>
      
      {loading && <p>Loading debt data...</p>}
      {error && <p className={sharedStyles.errorText}>{error}</p>}
      
      {!loading && debts.length === 0 && (
        <div className={sharedStyles.card} style={{marginTop: '2rem'}}>
          <p>No debts with balances, APRs, and minimum payments were found.</p>
          <p style={{fontSize: '0.8rem', color: '#6b7280'}}>
            To use this planner, please go to the 'Assets & Liabilities' page and ensure your 'Credit Card' and 'Loan' accounts have their 'APR' and 'Minimum Payment' fields filled out.
          </p>
        </div>
      )}

      {summary && debts.length > 0 && (
        <>
          <div className={styles.kpiGrid} style={{marginTop: '2rem'}}>
            <div className={`${styles.kpiCard} ${styles.blue}`}>
              <h3 className={styles.kpiTitle}>Debt-Free By</h3>
              <p className={styles.kpiValue}>
                {new Date(Date.now() + newMonths * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`${styles.kpiCard} ${styles.green}`}>
              <h3 className={styles.kpiTitle}>Time Saved</h3>
              <p className={styles.kpiValue}>
                {(originalMonths - newMonths) > 0 ? `${(originalMonths - newMonths)} months` : '0 months'}
              </p>
            </div>
            <div className={`${styles.kpiCard} ${styles.red}`}>
              <h3 className={styles.kpiTitle}>Total Interest Paid</h3>
              <p className={styles.kpiValue}>{formatCurrency(summary.totalInterestPaid)}</p>
            </div>
          </div>

          <div className={styles.payoffList}>
            {summary.payoffOrder.map((debt, index) => (
              <div key={debt.debtId} className={styles.debtCard}>
                <div className={styles.debtHeader}>
                  <div>
                    <h3 className={styles.debtName}>
                      <span style={{color: '#9ca3af', marginRight: '1rem'}}>#{index + 1}</span>
                      {debt.debtName}
                    </h3>
                    <span className={styles.debtInfo}>
                      {formatCurrency(debts.find(d => d.id === debt.debtId)?.balance || 0)} at {debts.find(d => d.id === debt.debtId)?.apr || 0}% APR
                    </span>
                  </div>
                  <HiTrendingUp style={{fontSize: '2rem', color: '#10b981'}} />
                </div>
                <div className={styles.debtSummary}>
                  <div className={styles.summaryStat}>
                    <h4>Payoff Time</h4>
                    <p>{debt.payoffMonths} months</p>
                  </div>
                  <div className={styles.summaryStat}>
                    <h4>Total Interest</h4>
                    <p>{formatCurrency(debt.totalInterest)}</p>
                  </div>
                  <div className={styles.summaryStat}>
                    <h4>Total Paid</h4>
                    <p>{formatCurrency(debt.totalPaid)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

export default DebtPaydownPlanner;