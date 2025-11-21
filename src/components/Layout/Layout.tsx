import React, { useState } from 'react';
import styles from './Layout.module.css';
import { Outlet } from 'react-router-dom';
import { HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi';
import DynamicSidebar from '../Sidebar/DynamicSidebar';

const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={styles.layout}>
      
      <aside className={isCollapsed ? styles.sidebarCollapsed : styles.sidebar}>
        
        {/* REMOVED: Legacy Header. DynamicSidebar now handles the Branding/Header */}

        {/* 1. Flex Content (Takes all remaining height) */}
        <div className={styles.navWrapper}>
           <DynamicSidebar isCollapsed={isCollapsed} />
        </div> 

        {/* 2. Fixed Footer Toggle */}
        <div className={styles.toggleWrapper}>
          <button
            className={styles.toggleButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <HiChevronDoubleRight /> : <HiChevronDoubleLeft />}
            {!isCollapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;