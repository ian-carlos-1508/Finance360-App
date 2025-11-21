/* File: src/main.tsx */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'; 

// --- Providers ---
// NEW: Import the Toast Provider
import { GamificationToastProvider } from './context/GamificationToastContext';

import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';

// ... (Keep all your existing imports for Hubs and Pages) ...
import ControlHub from './pages/Hubs/ControlHub';
import BuildHub from './pages/Hubs/BuildHub';
import OptimizeHub from './pages/Hubs/OptimizeHub';
import TransactionHubPage from './pages/Transactions/TransactionHub'; 
import IncomePage from './pages/Income/Income';
import AllIncomePage from './pages/Income/AllIncome'; 
import ExpensesPage from './pages/Expenses/Expenses';
import AllExpensesPage from './pages/Expenses/AllExpenses'; 
import TransfersPage from './pages/Transfers/Transfers';
import AllTransfersPage from './pages/Transfers/AllTransfers'; 
import BudgetsPage from './pages/Budgets/Budgets';
import FinancialHealth from './pages/FinancialHealth/FinancialHealth';
import SubscriptionsPage from './pages/Subscriptions/SubscriptionsPage';
import GoalsPage from './pages/Goals/Goals';
import DebtPaydownPlanner from './pages/Planners/DebtPaydownPlanner';
import MortgageCalculator from './pages/Planners/MortgageCalculator';
import AssetsPage from './pages/Assets/Assets';
import InvestmentCalculator from './pages/Planners/InvestmentCalculator';
import FinancialIndependence from './pages/Planners/FinancialIndependence';
import RealEstateCalculator from './pages/Planners/RealEstateCalculator';
import AnalyticsPage from './pages/Analytics/Analytics';
import ReportsPage from './pages/Analytics/Reports'; 
import StatementsPage from './pages/Analytics/StatementsPage';
import AccountsPage from './pages/Accounts/Accounts';
import CategoriesPage from './pages/Categories/Categories';
import Settings from './pages/Settings/Settings';
import PlannersHub from './pages/Planners/PlannersHub';
import OnboardingWizard from './pages/Onboarding/OnboardingWizard';

// ... (Keep your router configuration exactly as it is) ...
const router = createBrowserRouter([
  // ... existing routes ...
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <ControlHub /> }, 
      { path: '/control', element: <ControlHub /> }, 
      { path: '/build', element: <BuildHub /> }, 
      { path: '/optimize', element: <OptimizeHub /> }, 
      { path: '/transactions-hub', element: <TransactionHubPage /> }, 
      { path: '/income', element: <IncomePage /> },
      { path: '/income/all', element: <AllIncomePage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/expenses/all', element: <AllExpensesPage /> },
      { path: '/transfers', element: <TransfersPage /> },
      { path: '/transfers/all', element: <AllTransfersPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/health', element: <FinancialHealth /> },
      { path: '/subscriptions', element: <SubscriptionsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/planners/debt', element: <DebtPaydownPlanner /> },
      { path: '/planners/mortgage', element: <MortgageCalculator /> },
      { path: '/assets', element: <AssetsPage /> },
      { path: '/planners/investment', element: <InvestmentCalculator /> },
      { path: '/planners/fi', element: <FinancialIndependence /> },
      { path: '/planners/real-estate', element: <RealEstateCalculator /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/analytics/reports', element: <ReportsPage /> },
      { path: '/analytics/statements', element: <StatementsPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/settings', element: <Settings /> },
      { path: '/planners', element: <PlannersHub /> },
      { path: '/onboarding', element: <OnboardingWizard /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* WRAP THE ROUTER IN THE PROVIDER */}
    <GamificationToastProvider>
      <RouterProvider router={router} />
    </GamificationToastProvider>
  </React.StrictMode>
);