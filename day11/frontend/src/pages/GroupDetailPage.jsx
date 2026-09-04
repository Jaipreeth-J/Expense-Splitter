import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { apiFetch } from '../api';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';

export default function GroupDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [groupName, setGroupName] = useState(location.state?.name || '');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

  async function loadGroupDetails() {
    setLoading(true);
    setError('');
    try {
      const [balancesData, expensesData] = await Promise.all([
        apiFetch(`/groups/${id}/balances`),
        apiFetch(`/groups/${id}/expenses`),
      ]);
      setMembers(balancesData.balances);
      setExpenses(expensesData.expenses);

      if (!groupName) {
        const groupsData = await apiFetch('/groups');
        const match = groupsData.groups.find((g) => String(g.id) === id);
        if (match) setGroupName(match.name);
      }
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    setAdding(true);
    setAddError('');
    setAddSuccess('');
    try {
      await apiFetch(`/groups/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newMemberEmail.trim() }),
      });
      setAddSuccess(`Added ${newMemberEmail.trim()}`);
      setNewMemberEmail('');
      await loadGroupDetails();
    } catch (err) {
      setAddError(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={styles.page}>
      <Link to="/dashboard" style={styles.backLink}>
        ← Back to groups
      </Link>

      <h1>{groupName || `Group #${id}`}</h1>

      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Members</h2>
        {loading ? (
          <p>Loading members...</p>
        ) : (
          <ul style={styles.memberList}>
            {members.map((m) => (
              <li key={m.userId} style={styles.memberRow}>
                <span style={styles.memberName}>{m.name}</span>
                <span style={styles.memberEmail}>{m.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Add a member</h2>
        <form onSubmit={handleAddMember} style={styles.addForm}>
          <input
            type="email"
            placeholder="friend@example.com"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={adding} style={styles.button}>
            {adding ? 'Adding...' : 'Add member'}
          </button>
        </form>
        {addError && <p style={styles.error}>{addError}</p>}
        {addSuccess && <p style={styles.success}>{addSuccess}</p>}
        <p style={styles.hint}>
          The person must already have an account — they need to register first.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Add an expense</h2>
        {loading ? (
          <p>Loading...</p>
        ) : members.length === 0 ? (
          <p style={{ color: '#666' }}>Add at least one member before adding expenses.</p>
        ) : (
          <ExpenseForm groupId={id} members={members} onExpenseAdded={loadGroupDetails} />
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>Expenses</h2>
        {loading ? <p>Loading expenses...</p> : <ExpenseList expenses={expenses} />}
      </section>
    </div>
  );
}

const styles = {
  page: { padding: '2rem', maxWidth: '600px', margin: '0 auto' },
  backLink: { display: 'inline-block', marginBottom: '1rem', color: '#555', textDecoration: 'none' },
  section: { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' },
  sectionHeading: { fontSize: '1.1rem', marginBottom: '0.75rem' },
  memberList: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  memberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.6rem 0.8rem',
    background: '#f7f7f7',
    borderRadius: '6px',
  },
  memberName: { fontWeight: 600 },
  memberEmail: { color: '#666', fontSize: '0.9rem' },
  addForm: { display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.5rem', fontSize: '1rem' },
  button: { padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' },
  error: { color: '#c0392b', fontSize: '0.9rem', marginTop: '0.5rem' },
  success: { color: '#27ae60', fontSize: '0.9rem', marginTop: '0.5rem' },
  hint: { color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' },
};
