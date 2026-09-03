import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/groups');
      setGroups(data.groups);
    } catch (err) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      setNewGroupName('');
      await loadGroups();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>Welcome, {user?.name}</h1>
        <button onClick={logout} style={styles.logoutButton}>
          Log out
        </button>
      </header>

      <section style={styles.createSection}>
        <h2 style={styles.sectionHeading}>Create a group</h2>
        <form onSubmit={handleCreateGroup} style={styles.createForm}>
          <input
            type="text"
            placeholder="e.g. Goa Trip"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={creating} style={styles.button}>
            {creating ? 'Creating...' : 'Create group'}
          </button>
        </form>
      </section>

      {error && <p style={styles.error}>{error}</p>}

      <section>
        <h2 style={styles.sectionHeading}>Your groups</h2>
        {loading ? (
          <p>Loading groups...</p>
        ) : groups.length === 0 ? (
          <p style={{ color: '#666' }}>No groups yet — create one above to get started.</p>
        ) : (
          <ul style={styles.groupList}>
            {groups.map((group) => (
              <li key={group.id} style={styles.groupCard}>
                <Link to={`/groups/${group.id}`} state={{ name: group.name }} style={styles.groupLink}>
                  <span style={styles.groupName}>{group.name}</span>
                  <span style={styles.memberCount}>
                    {group.member_count} member{group.member_count === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: { padding: '2rem', maxWidth: '600px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  logoutButton: { padding: '0.5rem 1rem', cursor: 'pointer' },
  sectionHeading: { fontSize: '1.1rem', marginBottom: '0.5rem' },
  createSection: { marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e0e0e0' },
  createForm: { display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.5rem', fontSize: '1rem' },
  button: { padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: '0.9rem', marginBottom: '1rem' },
  groupList: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  groupCard: { border: '1px solid #e0e0e0', borderRadius: '6px' },
  groupLink: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.9rem 1rem',
    textDecoration: 'none',
    color: 'inherit',
  },
  groupName: { fontWeight: 600 },
  memberCount: { color: '#666', fontSize: '0.9rem' },
};
