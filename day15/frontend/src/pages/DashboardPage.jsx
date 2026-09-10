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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <button onClick={logout} className="btn-secondary">
          Log out
        </button>
      </header>

      <section className="mb-8">
        <h2 className="section-label">Create a group</h2>
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Goa Trip"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="input-field"
          />
          <button type="submit" disabled={creating} className="btn-primary whitespace-nowrap">
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </section>

      {error && (
        <p className="rounded-md bg-brick-light px-3 py-2 text-sm text-brick mb-6">{error}</p>
      )}

      <section className="divider">
        <h2 className="section-label">Your groups</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading groups…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted">No groups yet — create one above to get started.</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  state={{ name: group.name }}
                  className="card flex items-center justify-between px-4 py-3 hover:border-ink transition-colors"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-sm text-muted">
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
