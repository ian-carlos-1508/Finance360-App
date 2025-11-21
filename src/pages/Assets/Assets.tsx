/* Replace file: src/pages/AssetsLiabilities/AssetsPage.tsx */

import { useState, useEffect, useCallback } from 'react';
import styles from '../Settings/Settings.module.css'; // Use master CSS
import { supabase } from '../../lib/supabaseClient';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import AccountManager from '../../components/Settings/AccountManager';
import { type Account } from '../../components/Accounts/AddAccountForm';
import InvestmentManager from '../../components/Investments/InvestmentManager';
import RealEstateManager from '../../components/RealEstate/RealEstateManager';
import DebtManager from '../../components/Debts/DebtManager';
import CreditCardManager from '../../components/Accounts/CreditCardManager';
import { formatCurrency } from '../../lib/utils';
// NEW: Import BackToHub
import BackToHub from '../../components/Navigation/BackToHub'; 
// --- NEW: Import the centralized colors ---
import {
  CHART_COLORS,
  COLOR_EXPENSE,
  COLOR_INCOME,
  COLOR_TRANSFER,
} from '../../lib/chartColors';

// --- Type Definitions ---
type NetWorthData = {
  total_cash: number;
  total_investments: number;
  total_real_estate: number;
  total_other_debts: number;
  total_credit_card_debt: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
};

type PieData = { name: string; value: number };
type ActiveAssetTab = 'cash' | 'investments' | 'real_estate';
type ActiveLiabilityTab = 'credit_cards' | 'loans';

// --- NEW: Define semantic colors for liability breakdown ---
const LIABILITY_COLORS_SEMANTIC = [
  COLOR_EXPENSE, // Credit Card Debt (Red)
  CHART_COLORS[3], // Other Debts & Loans (Gold Accent)
];

// --- Component: Liability Distribution Pie Chart ---
function LiabilityDistributionChart({ data }: { data: PieData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {data.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            marginTop: '30%',
            color: '#6b7280',
          }}
        >
          No liabilities recorded.
        </p>
      ) : (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  LIABILITY_COLORS_SEMANTIC[
                    index % LIABILITY_COLORS_SEMANTIC.length
                  ]
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              formatCurrency(value),
              'Debt Amount',
            ]}
            labelFormatter={(label) => label}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}

function AssetsPage() {
  // --- State ---
  const [kpiData, setKpiData] = useState<NetWorthData | null>(null);
  const [assetAllocationPie, setAssetAllocationPie] = useState<PieData[]>([]);
  const [liabilityDistributionPie, setLiabilityDistributionPie] = useState<
    PieData[]
  >([]);
  const [assetTab, setAssetTab] = useState<ActiveAssetTab>('cash');
  const [liabilityTab, setLiabilityTab] =
    useState<ActiveLiabilityTab>('credit_cards');

  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<Account[]>([]);

  // --- NEW: Define semantic colors for Asset Allocation ---
  // --- UPDATED: Removed Liabilities (Red) from this array ---
  const ASSET_COLORS_SEMANTIC = [
    COLOR_TRANSFER, // Cash (Blue)
    COLOR_INCOME, // Investments (Teal)
    CHART_COLORS[3], // Real Estate (Gold)
  ];

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    // 1. Fetch Net Worth KPIs
    const { data: kpi, error: kpiError } = await supabase
      .from('v_net_worth')
      .select('*')
      .single();

    if (kpiError) {
      console.error('Error fetching net worth:', kpiError);
    } else if (kpi) {
      setKpiData(kpi);

      // --- THIS IS THE FIX ---
      // Asset Allocation Pie Chart (Assets ONLY)
      const processedAssetPie = [
        { name: 'Cash', value: kpi.total_cash },
        { name: 'Investments', value: kpi.total_investments },
        { name: 'Real Estate', value: kpi.total_real_estate },
        // Removed: { name: 'Liabilities', value: Math.abs(kpi.total_liabilities) }
      ];
      setAssetAllocationPie(processedAssetPie.filter((d) => d.value > 0));
      // --- END FIX ---

      // Liability Distribution Pie Chart (Liabilities Breakdown)
      const processedLiabilityPie = [
        {
          name: 'Credit Card Debt',
          value: Math.abs(kpi.total_credit_card_debt),
        },
        {
          name: 'Other Debts & Loans',
          value: Math.abs(kpi.total_other_debts),
        },
      ];
      const validLiabilityData = processedLiabilityPie.filter(
        (d) => d.value > 0
      );
      setLiabilityDistributionPie(validLiabilityData);
    }

    // 2. Fetch ALL accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('*, current_balance')
      .order('account_name', { ascending: true });

    if (accError) {
      console.error('Error fetching accounts:', accError);
    } else if (accounts) {
      setCashAccounts(accounts.filter((acc) => acc.type === 'cash'));
      setCreditAccounts(accounts.filter((acc) => acc.type === 'credit'));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDataUpdate = () => {
    fetchData();
  };

  return (
    <div>
      {/* NEW: Back to Hub Navigation (Optimize Hub) */}
      <BackToHub to="/optimize" label="Back to Wealth HQ" />

      <h1 className={styles.title}>Assets & Liabilities</h1>

      <div className={styles.pageGrid}>
        {/* --- SECTION 1: KPI Cards --- */}
        <div className={styles.kpiSection}>
          <div className={`${styles.kpiCard} ${styles.blue}`}>
            <h3 className={styles.kpiTitle}>Net Worth</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData?.net_worth)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.green}`}>
            <h3 className={styles.kpiTitle}>Total Assets</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(kpiData?.total_assets)}
            </p>
          </div>
          <div className={`${styles.kpiCard} ${styles.red}`}>
            <h3 className={styles.kpiTitle}>Total Liabilities</h3>
            <p className={styles.kpiValue}>
              {formatCurrency(
                kpiData ? kpiData.total_liabilities * -1 : undefined
              )}
            </p>
          </div>
        </div>

        {/* --- SECTION 2: ASSETS Management Card --- */}
        <div className={`${styles.card} ${styles.tableSection}`}>
          <h2 className={styles.cardTitle}>My Assets</h2>
          <div className={styles.tabHeader}>
            <button
              className={
                assetTab === 'cash' ? styles.tabButtonActive : styles.tabButton
              }
              onClick={() => setAssetTab('cash')}
            >
              Cash Accounts
            </button>
            <button
              className={
                assetTab === 'investments'
                  ? styles.tabButtonActive
                  : styles.tabButton
              }
              onClick={() => setAssetTab('investments')}
            >
              Investments
            </button>
            <button
              className={
                assetTab === 'real_estate'
                  ? styles.tabButtonActive
                  : styles.tabButton
              }
              onClick={() => setAssetTab('real_estate')}
            >
              Real Estate
            </button>
          </div>

          <div>
            {assetTab === 'cash' && (
              <AccountManager
                onDataUpdated={handleDataUpdate}
                onAccountSelect={() => {}}
                selectedAccountId={null}
                accounts={cashAccounts}
                filter="cash"
              />
            )}
            {assetTab === 'investments' && (
              <InvestmentManager onDataUpdated={handleDataUpdate} />
            )}
            {assetTab === 'real_estate' && (
              <RealEstateManager onDataUpdated={handleDataUpdate} />
            )}
          </div>
        </div>

        {/* --- SECTION 3: LIABILITIES Management Card --- */}
        <div className={`${styles.card} ${styles.tableSection}`}>
          <h2 className={styles.cardTitle}>My Liabilities</h2>
          <div className={styles.tabHeader}>
            <button
              className={
                liabilityTab === 'credit_cards'
                  ? styles.tabButtonActive
                  : styles.tabButton
              }
              onClick={() => setLiabilityTab('credit_cards')}
            >
              Credit Cards
            </button>
            <button
              className={
                liabilityTab === 'loans'
                  ? styles.tabButtonActive
                  : styles.tabButton
              }
              onClick={() => setLiabilityTab('loans')}
            >
              Loans & Debts
            </button>
          </div>

          <div>
            {liabilityTab === 'credit_cards' && (
              <CreditCardManager
                onDataUpdated={handleDataUpdate}
                accounts={creditAccounts}
              />
            )}
            {liabilityTab === 'loans' && (
              <DebtManager onDataUpdated={handleDataUpdate} />
            )}
          </div>
        </div>

        {/* --- SECTION 4: Analytics --- */}
        <div className={styles.analyticsSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Asset Allocation</h2>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetAllocationPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry: any) =>
                      `${(entry.percent * 100).toFixed(0)}%`
                    }
                  >
                    {/* --- UPDATED: Use new semantic asset colors --- */}
                    {assetAllocationPie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          ASSET_COLORS_SEMANTIC[
                            index % ASSET_COLORS_SEMANTIC.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Liability Breakdown</h2>
            <div className={styles.chartContainer}>
              <LiabilityDistributionChart data={liabilityDistributionPie} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetsPage;