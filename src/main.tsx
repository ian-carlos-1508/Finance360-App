/* Replace file: src/main.tsx */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'; // Your global styles

// --- Import Layout ---
import Layout from './components/Layout/Layout';

// --- Import Auth Pages ---
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';

// --- Import Main App Pages ---
import Dashboard from './pages/Dashboard/Dashboard';
import IncomePage from './pages/Income/Income';
import AllIncomePage from './pages/Income/AllIncome';
import ExpensesPage from './pages/Expenses/Expenses';
import AllExpensesPage from './pages/Expenses/AllExpenses';
import TransfersPage from './pages/Transfers/Transfers';
import AllTransfersPage from './pages/Transfers/AllTransfers';
import BudgetsPage from './pages/Budgets/Budgets';
import SubscriptionsPage from './pages/Subscriptions/SubscriptionsPage';
import GoalsPage from './pages/Goals/Goals';
import AssetsPage from './pages/Assets/Assets';
import AnalyticsPage from './pages/Analytics/Analytics';
import ReportsPage from './pages/Analytics/Reports';
import StatementsPage from './pages/Analytics/StatementsPage';
import FinancialHealth from './pages/FinancialHealth/FinancialHealth';
import AccountsPage from './pages/Accounts/Accounts';
import CategoriesPage from './pages/Categories/Categories';
import Settings from './pages/Settings/Settings';

// --- Import Planners ---
import PlannersHub from './pages/Planners/PlannersHub';
import DebtPaydownPlanner from './pages/Planners/DebtPaydownPlanner';
import InvestmentCalculator from './pages/Planners/InvestmentCalculator';
import RealEstateCalculator from './pages/Planners/RealEstateCalculator';
import MortgageCalculator from './pages/Planners/MortgageCalculator';
// --- NEW IMPORT ---
import FinancialIndependence from './pages/Planners/FinancialIndependence';

// --- Router configuration ---
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/income', element: <IncomePage /> },
      { path: '/income/all', element: <AllIncomePage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/expenses/all', element: <AllExpensesPage /> },
      { path: '/transfers', element: <TransfersPage /> },
      { path: '/transfers/all', element: <AllTransfersPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/subscriptions', element: <SubscriptionsPage /> },
      { path: '/goals', element: <GoalsPage /> },
      // --- Planners Routes ---
      { path: '/planners', element: <PlannersHub /> },
      { path: '/planners/debt', element: <DebtPaydownPlanner /> },
      { path: '/planners/investment', element: <InvestmentCalculator /> },
      { path: '/planners/real-estate', element: <RealEstateCalculator /> },
      { path: '/planners/mortgage', element: <MortgageCalculator /> },
      // --- NEW ROUTE ---
      { path: '/planners/fi', element: <FinancialIndependence /> },
      // --- End Planners Routes ---
      { path: '/assets', element: <AssetsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/analytics/reports', element: <ReportsPage /> },
      { path: '/analytics/statements', element: <StatementsPage /> },
      { path: '/health', element: <FinancialHealth /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/settings', element: <Settings /> },
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