import React, { useState } from 'react';
import styles from '../Auth.module.css';
import { Link, useNavigate } from 'react-router-dom';
// NEW: Import our Supabase client
import { supabase } from '../../lib/supabaseClient';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // We will use this now!
  const [loading, setLoading] = useState(false); // NEW: To disable button on submit
  const navigate = useNavigate(); // NEW: To redirect after login

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Disable button
    setError(''); // Clear any old errors

    // This is the Supabase signup function
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message); // This will set and show the error
    } else if (data.user) {
      // Supabase sends a confirmation email.
      // We can let the user know, but for now, let's just log in.
      // For a real app, you'd show a "Please check your email" message.
      // For this app, let's just log them in directly.
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (loginError) {
        setError(loginError.message);
      } else {
        // SUCCESS: Redirect to the dashboard
        navigate('/');
      }
    }
    setLoading(false); // Re-enable button
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Your Account</h1>
        </div>

        <form className={styles.form} onSubmit={handleSignUp}>
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading} // NEW
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {/* NEW: Show different text when loading */}
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;