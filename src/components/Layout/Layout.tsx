/* Replace file: src/components/Layout/Layout.tsx */

import React, { useState } from 'react';
import styles from './Layout.module.css';
import { NavLink, Outlet } from 'react-router-dom';

import {
  HiChartPie,
  HiCog,
  HiFire,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiArrowSmDown,
  HiArrowSmUp,
  HiSwitchHorizontal,
  HiChartBar,
  HiOutlineBriefcase,
  HiDocumentReport,
  HiCreditCard,
  HiTag,
  HiClock,
  HiHeart,
  HiFlag,
  HiCalculator // <-- NEW ICON
} from 'react-icons/hi';

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    if (isCollapsed) {
      return isActive ? styles.navItemActiveCollapsed : styles.navItemCollapsed;
    }
    return isActive ? styles.navItemActive : styles.navItem;
  };

  return (
    <div className={`${styles.layout} print-layout-wrapper`}>
      
      <aside className={`${isCollapsed ? styles.sidebarCollapsed : styles.sidebar} no-print`}>
        <div className={styles.sidebarHeader}>
          <HiFire className={styles.headerIcon} />
          <span className={styles.navText}>Finance360</span>
        </div>

        <nav>
          <ul className={styles.nav}>
            {/* --- CORE PAGES --- */}
            <li>
              <NavLink to="/" end className={getNavLinkClass}>
                <HiChartPie className={styles.navIcon} />
                <span className={styles.navText}>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/income" className={getNavLinkClass}>
                <HiArrowSmDown className={styles.navIcon} />
                <span className={styles.navText}>Income</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/expenses" className={getNavLinkClass}>
                <HiArrowSmUp className={styles.navIcon} />
                <span className={styles.navText}>Expenses</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/transfers" className={getNavLinkClass}>
                <HiSwitchHorizontal className={styles.navIcon} />
                <span className={styles.navText}>Transfers</span>
              </NavLink>
            </li>

            {/* --- PLANNING PAGES --- */}
            <li>
              <NavLink to="/budgets" className={getNavLinkClass}>
                <HiChartBar className={styles.navIcon} />
                <span className={styles.navText}>Budgets</span>
              </NavLink>
            </li>
            
            <li>
              <NavLink to="/subscriptions" className={getNavLinkClass}>
                <HiClock className={styles.navIcon} />
                <span className={styles.navText}>Subscriptions</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/goals" className={getNavLinkClass}>
                <HiFlag className={styles.navIcon} />
                <span className={styles.navText}>Goals</span>
              </NavLink>
            </li>
            
            {/* --- NEW PLANNER LINK --- */}
            <li>
              <NavLink to="/planners" className={getNavLinkClass}>
                <HiCalculator className={styles.navIcon} />
                <span className={styles.navText}>Planners</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/assets" className={getNavLinkClass}>
                <HiOutlineBriefcase className={styles.navIcon} />
                <span className={styles.navText}>Assets & Liabilities</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/analytics" className={getNavLinkClass}>
                <HiDocumentReport className={styles.navIcon} />
                <span className={styles.navText}>Analytics & Reports</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/health" className={getNavLinkClass}>
                <HiHeart className={styles.navIcon} />
                <span className={styles.navText}>Financial Health</span>
              </NavLink>
            </li>

            {/* --- MANAGEMENT PAGES --- */}
            <li>
              <NavLink to="/accounts" className={getNavLinkClass}>
                <HiCreditCard className={styles.navIcon} />
                <span className={styles.navText}>Accounts</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/categories" className={getNavLinkClass}>
                <HiTag className={styles.navIcon} />
                <span className={styles.navText}>Categories</span>
              </NavLink>
            </li>

            {/* --- SETTINGS PAGE --- */}
            <li>
              <NavLink to="/settings" className={getNavLinkClass}>
                <HiCog className={styles.navIcon} />
                <span className={styles.navText}>Settings</span>
              </NavLink>
            </li>
          </ul>
        </nav> 

        {/* --- COLLAPSE BUTTON --- */}
        <div className={styles.toggleWrapper}>
          <button
            className={isCollapsed ? styles.navItemCollapsed : styles.navItem}
            onClick={toggleSidebar}
            style={{ width: '100%' }}
          >
            {isCollapsed ? (
              <HiChevronDoubleRight className={styles.navIcon} />
            ) : (
              <HiChevronDoubleLeft className={styles.navIcon} />
            )}
            <span className={styles.navText}>
              {isCollapsed ? 'Expand' : 'Collapse'}
            </span>
          </button>
        </div>
      </aside>

      <main className={`${styles.content} print-content-container`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;