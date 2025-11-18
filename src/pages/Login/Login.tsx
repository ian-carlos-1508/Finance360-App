import React, { useState } from 'react';
import styles from '../Auth.module.css';
import { Link, useNavigate } from 'react-router-dom';
// NEW: Import our Supabase client
import { supabase } from '../../lib/supabaseClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // We will use this now!
  const [loading, setLoading] = useState(false); // NEW: To disable button
  const navigate = useNavigate(); // NEW: To redirect

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // This is the Supabase login function
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message); // Show error to user
    } else {
      // SUCCESS: Redirect to the dashboard
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back!</h1>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading} // NEW
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading} // NEW
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {/* NEW: Show different text when loading */}
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/signup" className={styles.footerLink}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;