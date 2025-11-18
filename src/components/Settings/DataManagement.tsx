/* Create file: src/components/Settings/DataManagement.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

function DataManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper function to trigger browser download
  const downloadCSV = (csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    
    // Format the date for the filename
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `finance360_export_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error } = await supabase.rpc('fn_export_transactions_csv');

    if (error) {
      setError(error.message);
    } else if (data) {
      downloadCSV(data);
      setSuccess('Data exported successfully!');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Export Your Data</h2>
        <p className={styles.profileInfo} style={{ marginBottom: '1.5rem' }}>
          Download a complete CSV file of all your transactions.
        </p>

        <button
          className={styles.saveButton}
          onClick={handleExport}
          disabled={loading}
          style={{ width: '200px' }}
        >
          {loading ? 'Exporting...' : 'Export Transactions'}
        </button>

        {error && <p className={styles.errorText} style={{ marginTop: '1rem' }}>{error}</p>}
        {success && <p className={styles.successText} style={{ marginTop: '1rem' }}>{success}</p>}
      </div>

      {/* Placeholder for the "Reset Data" danger zone we planned */}
      <div className={styles.dangerZone}>
        <h2 className={styles.cardTitle}>Reset All Data</h2>
        <p>
          Permanently delete all your application data (transactions, budgets,
          accounts, etc.). This action cannot be undone.
        </p>
        <button
          className={styles.deleteButton}
          disabled={true} // We will enable this later
        >
          Reset All Application Data
        </button>
      </div>
    </div>
  );
}

export default DataManagement;