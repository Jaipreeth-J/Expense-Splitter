import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import BalancesView from '../components/BalancesView';
import SettlementsView from '../components/SettlementsView';

export default function GroupDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState(location.state?.name || '');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
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
      const [balancesData, expensesData, settlementsData] = await Promise.all([
        apiFetch(`/groups/${id}/balances`),
        apiFetch(`/groups/${id}/expenses`),
        apiFetch(`/groups/${id}/settlements`),
      ]);
      setMembers(balancesData.balances);
      setExpenses(expensesData.expenses);
      setSettlements(settlementsData.settlements);

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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="text-sm text-muted hover:text-ink">
        ← Back to groups
      </Link>

      <h1 className="text-2xl font-semibold mt-2 mb-6">{groupName || `Group #${id}`}</h1>

      {error && (
        <p className="rounded-md bg-brick-light px-3 py-2 text-sm text-brick mb-6">{error}</p>
      )}

      {/* Balances and settlements lead the page — this is the screen people
          actually come here for, so it sits above members/expenses management. */}
      <section>
        <h2 className="section-label">Balances</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading balances…</p>
        ) : (
          <BalancesView balances={members} currentUserId={user?.id} />
        )}
      </section>

      <section className="divider">
        <h2 className="section-label">Settle up</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <SettlementsView
            groupId={id}
            settlements={settlements}
            currentUserId={user?.id}
            onSettled={loadGroupDetails}
          />
        )}
      </section>

      <section className="divider">
        <h2 className="section-label">Members</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading members…</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.userId} className="card flex items-center justify-between px-4 py-2.5">
                <span className="font-medium">{m.name}</span>
                <span className="text-sm text-muted">{m.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="divider">
        <h2 className="section-label">Add a member</h2>
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="email"
            placeholder="friend@example.com"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            className="input-field"
          />
          <button type="submit" disabled={adding} className="btn-primary whitespace-nowrap">
            {adding ? 'Adding…' : 'Add member'}
          </button>
        </form>
        {addError && <p className="text-sm text-brick mt-2">{addError}</p>}
        {addSuccess && <p className="text-sm text-emerald-dark mt-2">{addSuccess}</p>}
        <p className="text-xs text-muted mt-2">
          The person must already have an account — they need to register first.
        </p>
      </section>

      <section className="divider">
        <h2 className="section-label">Add an expense</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted">Add at least one member before adding expenses.</p>
        ) : (
          <ExpenseForm groupId={id} members={members} onExpenseAdded={loadGroupDetails} />
        )}
      </section>

      <section className="divider mb-10">
        <h2 className="section-label">Expenses</h2>
        {loading ? <p className="text-sm text-muted">Loading expenses…</p> : <ExpenseList expenses={expenses} />}
      </section>
    </div>
  );
}
