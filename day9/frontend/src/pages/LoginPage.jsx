import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.heading}>Log in</h1>

        {error && <p style={styles.error}>{error}</p>}

        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>

        <p style={styles.footerText}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', paddingTop: '4rem' },
  form: { width: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  heading: { marginBottom: '0.5rem' },
  label: { display: 'flex', flexDirection: 'column', fontSize: '0.9rem', gap: '0.25rem' },
  input: { padding: '0.5rem', fontSize: '1rem' },
  button: { padding: '0.6rem', fontSize: '1rem', marginTop: '0.5rem', cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: '0.9rem' },
  footerText: { fontSize: '0.85rem', marginTop: '0.5rem' },
};
