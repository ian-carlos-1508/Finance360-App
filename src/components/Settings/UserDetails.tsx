/* Create file: src/components/Settings/UserDetails.tsx */

import { useState, useEffect } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { type User } from '@supabase/supabase-js';

function UserDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Set the name from metadata, or default to an empty string
        setFullName(user.user_metadata?.full_name || '');
      }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Your name has been updated successfully!');
    }
    setLoading(false);
  };

  if (!user) {
    return <p>Loading user details...</p>;
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>User Details</h2>
      <form className={styles.modalForm} onSubmit={handleUpdate}>
        <div className={styles.formRow}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            className={styles.input}
            value={user.email || ''}
            disabled
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="fullName">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            placeholder="e.g., Ian Carlos Guardia"
          />
        </div>

        <div className={styles.modalFooter} style={{ border: 'none', padding: 0, marginTop: '0.5rem' }}>
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

export default UserDetails;