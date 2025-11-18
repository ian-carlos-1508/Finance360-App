/* Replace file: src/pages/Settings/Settings.tsx */

import { useState } from 'react';
import styles from './Settings.module.css';
// supabase import is no longer needed here
import UserDetails from '../../components/Settings/UserDetails';
import ChangePassword from '../../components/Settings/ChangePassword';
import DangerZone from '../../components/Settings/DangerZone';
import Preferences from '../../components/Settings/Preferences';
// --- NEW: Import the DataManagement component ---
import DataManagement from '../../components/Settings/DataManagement';

// Define the available tabs
type ActiveTab = 'profile' | 'preferences' | 'data' | 'about';

function Settings() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  // --- Content for tabs ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div>
            <UserDetails />
            <ChangePassword />
            <DangerZone />
          </div>
        );
      case 'preferences':
        return (
          <Preferences />
        );
      case 'data':
        return (
          // --- UPDATED: Render the new component ---
          <DataManagement />
        );
      case 'about':
        return (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>About</h2>
            <p className={styles.profileInfo}>
              <strong>Finance360</strong>
              <br />
              Version 1.0.0
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className={styles.title}>Settings</h1>

      {/* --- Tab Navigation --- */}
      <div className={styles.tabHeader}>
        <button
          className={
            activeTab === 'profile'
              ? styles.tabButtonActive
              : styles.tabButton
          }
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={
            activeTab === 'preferences'
              ? styles.tabButtonActive
              : styles.tabButton
          }
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          className={
            activeTab === 'data' ? styles.tabButtonActive : styles.tabButton
          }
          onClick={() => setActiveTab('data')}
        >
          Data Management
        </button>
        <button
          className={
            activeTab === 'about' ? styles.tabButtonActive : styles.tabButton
          }
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      {/* --- Tab Content --- */}
      <div style={{ marginTop: '1.5rem' }}>{renderTabContent()}</div>
    </div>
  );
}

export default Settings;