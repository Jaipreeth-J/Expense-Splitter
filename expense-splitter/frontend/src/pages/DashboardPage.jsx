import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Welcome, {user?.name}</h1>
        <button onClick={logout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Log out
        </button>
      </div>
      <p style={{ color: '#666' }}>
        Your groups will show up here — built out on Day 10.
      </p>
    </div>
  );
}
