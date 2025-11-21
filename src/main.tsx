/* File: src/main.tsx */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'; 

// --- Layout ---
import Layout from './components/Layout/Layout';

// --- Auth Pages ---
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';

// --- V2 HUBS (The Level Dashboards) ---
import ControlHub from './pages/Hubs/ControlHub';
import BuildHub from './pages/Hubs/BuildHub';
import OptimizeHub from './pages/Hubs/OptimizeHub';

// =========================================
// STEP 1: 🎛️ CONTROL (Cash Flow Mastery)
// =========================================
// REMOVED: Legacy Dashboard import
import TransactionHubPage from './pages/Transactions/TransactionHub'; 
import IncomePage from './pages/Income/Income';
import AllIncomePage from './pages/Income/AllIncome'; 
import ExpensesPage from './pages/Expenses/Expenses';
import AllExpensesPage from './pages/Expenses/AllExpenses'; 
import TransfersPage from './pages/Transfers/Transfers';
import AllTransfersPage from './pages/Transfers/AllTransfers'; 
import BudgetsPage from './pages/Budgets/Budgets';

// =========================================
// STEP 2: 🛡️ BUILD (Security & Savings)
// =========================================
import FinancialHealth from './pages/FinancialHealth/FinancialHealth';
import SubscriptionsPage from './pages/Subscriptions/SubscriptionsPage';
import GoalsPage from './pages/Goals/Goals';
import DebtPaydownPlanner from './pages/Planners/DebtPaydownPlanner';
import MortgageCalculator from './pages/Planners/MortgageCalculator';

// =========================================
// STEP 3: 🚀 OPTIMIZE (Wealth & Analysis)
// =========================================
import AssetsPage from './pages/Assets/Assets';
import InvestmentCalculator from './pages/Planners/InvestmentCalculator';
import FinancialIndependence from './pages/Planners/FinancialIndependence';
import RealEstateCalculator from './pages/Planners/RealEstateCalculator';
import AnalyticsPage from './pages/Analytics/Analytics';
import ReportsPage from './pages/Analytics/Reports'; 
import StatementsPage from './pages/Analytics/StatementsPage';

// =========================================
// ⚙️ ADMIN (Configuration)
// =========================================
import AccountsPage from './pages/Accounts/Accounts';
import CategoriesPage from './pages/Categories/Categories';
import Settings from './pages/Settings/Settings';
import PlannersHub from './pages/Planners/PlannersHub';

// --- V2 Onboarding ---
import OnboardingWizard from './pages/Onboarding/OnboardingWizard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // --- Root Route ---
      // V2: The Control Hub is now the landing page
      { path: '/', element: <ControlHub /> }, 

      // --- V2 HUB ROUTES ---
      { path: '/control', element: <ControlHub /> }, 
      { path: '/build', element: <BuildHub /> }, 
      { path: '/optimize', element: <OptimizeHub /> }, 

      // --- V2 Step 1: CONTROL Tools ---
      { path: '/transactions-hub', element: <TransactionHubPage /> }, 
      
      // Direct Links
      { path: '/income', element: <IncomePage /> },
      { path: '/income/all', element: <AllIncomePage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/expenses/all', element: <AllExpensesPage /> },
      { path: '/transfers', element: <TransfersPage /> },
      { path: '/transfers/all', element: <AllTransfersPage /> },
      
      { path: '/budgets', element: <BudgetsPage /> },

      // --- V2 Step 2: BUILD Tools ---
      { path: '/health', element: <FinancialHealth /> },
      { path: '/subscriptions', element: <SubscriptionsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/planners/debt', element: <DebtPaydownPlanner /> },
      { path: '/planners/mortgage', element: <MortgageCalculator /> },
      
      // --- V2 Step 3: OPTIMIZE Tools ---
      { path: '/assets', element: <AssetsPage /> },
      { path: '/planners/investment', element: <InvestmentCalculator /> },
      { path: '/planners/fi', element: <FinancialIndependence /> },
      { path: '/planners/real-estate', element: <RealEstateCalculator /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/analytics/reports', element: <ReportsPage /> },
      { path: '/analytics/statements', element: <StatementsPage /> },

      // --- ADMIN ---
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/settings', element: <Settings /> },
      { path: '/planners', element: <PlannersHub /> },

      // --- ONBOARDING ---
      { path: '/onboarding', element: <OnboardingWizard /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);