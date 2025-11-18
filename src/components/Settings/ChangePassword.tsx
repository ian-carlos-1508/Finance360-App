/* Create file: src/components/Settings/ChangePassword.tsx */

import { useState } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';

function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Your password has been updated successfully!');
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className={styles.card} style={{ marginTop: '2rem' }}>
      <h2 className={styles.cardTitle}>Change Password</h2>
      <form className={styles.modalForm} onSubmit={handleUpdate}>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="newPassword">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="At least 6 characters"
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="Repeat new password"
          />
        </div>

        <div className={styles.modalFooter} style={{ border: 'none', padding: 0, marginTop: '0.5rem' }}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading}
            style={{ width: '180px' }} // A bit wider for the text
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>{success}</p>}
      </form>
    </div>
  );
}

export default ChangePassword;