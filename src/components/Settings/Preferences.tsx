/* Create file: src/components/Settings/Preferences.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

// Define the shape of our preferences
type UserPreferences = {
  currency: 'USD' | 'EUR' | 'PAB';
  defaultDateRange: 'ytd' | 'month' | '30days';
};

function Preferences() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [prefs, setPrefs] = useState<UserPreferences>({
    currency: 'USD',
    defaultDateRange: 'ytd',
  });

  // Fetch current preferences when component loads
  useEffect(() => {
    const fetchPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.preferences) {
        setPrefs(user.user_metadata.preferences);
      }
    };
    fetchPreferences();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPrefs(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.updateUser({
      data: { preferences: prefs },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Preferences saved successfully!');
    }
    setLoading(false);
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Application Preferences</h2>
      <form className={styles.modalForm} onSubmit={handleSave}>
        
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            className={styles.input}
            value={prefs.currency}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="PAB">PAB (B/.)</option>
            {/* Add more currencies as needed */}
          </select>
        </div>
        <p className={styles.listItemSubtext} style={{ gridColumn: '2', marginTop: '-0.5rem' }}>
          This will change the currency symbol used across the app.
        </p>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="defaultDateRange">
            Default Date Range
          </label>
          <select
            id="defaultDateRange"
            name="defaultDateRange"
            className={styles.input}
            value={prefs.defaultDateRange}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="ytd">Year to Date</option>
            <option value="month">This Month</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
        <p className={styles.listItemSubtext} style={{ gridColumn: '2', marginTop: '-0.5rem' }}>
          The default date filter to use on overview pages.
        </p>

        <div className={styles.modalFooter} style={{ border: 'none', padding: 0, marginTop: '1rem' }}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading}
            style={{ width: '150px' }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>{success}</p>}
      </form>
    </div>
  );
}

export default Preferences;