import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE'];

export default function ExpenseForm({ groupId, members, onExpenseAdded }) {
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState('EQUAL');
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [splitValues, setSplitValues] = useState({}); // { userId: "value" }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // When switching to EXACT/PERCENTAGE, prefill an even split as a starting
  // point — most expenses are close to even, so this saves typing and gives
  // the person something to see immediately rather than a wall of blanks.
  useEffect(() => {
    if (splitType === 'EQUAL' || members.length === 0) return;

    const prefilled = {};
    if (splitType === 'PERCENTAGE') {
      const evenPercentage = (100 / members.length).toFixed(2);
      members.forEach((m) => (prefilled[m.userId] = evenPercentage));
    } else if (splitType === 'EXACT' && amount) {
      const evenAmount = (Number(amount) / members.length).toFixed(2);
      members.forEach((m) => (prefilled[m.userId] = evenAmount));
    }
    setSplitValues(prefilled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, members.length]);

  const splitSum = Object.values(splitValues).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const target = splitType === 'PERCENTAGE' ? 100 : Number(amount) || 0;
  const remaining = Math.round((target - splitSum) * 100) / 100;

  function handleSplitValueChange(userId, value) {
    setSplitValues((prev) => ({ ...prev, [userId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('description is required');
      return;
    }
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError('enter a valid amount');
      return;
    }

    const body = {
      description: description.trim(),
      amount: numericAmount,
      paidBy: Number(paidBy),
      splitType,
    };

    if (splitType === 'EXACT') {
      if (Math.abs(remaining) > 0.01) {
        setError(`split amounts must add up to ${numericAmount} (currently ${splitSum.toFixed(2)})`);
        return;
      }
      body.splits = members.map((m) => ({
        userId: m.userId,
        amount: Number(splitValues[m.userId] || 0),
      }));
    } else if (splitType === 'PERCENTAGE') {
      if (Math.abs(remaining) > 0.01) {
        setError(`percentages must add up to 100 (currently ${splitSum.toFixed(2)})`);
        return;
      }
      body.splits = members.map((m) => ({
        userId: m.userId,
        percentage: Number(splitValues[m.userId] || 0),
      }));
    }

    setSubmitting(true);
    try {
      await apiFetch(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // Reset form
      setDescription('');
      setAmount('');
      setSplitType('EQUAL');
      setSplitValues({});
      onExpenseAdded();
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <label style={styles.label}>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.input}
            placeholder="e.g. Dinner"
          />
        </label>

        <label style={styles.label}>
          Amount
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
            placeholder="0.00"
          />
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>
          Paid by
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} style={styles.input}>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Split type
          <select value={splitType} onChange={(e) => setSplitType(e.target.value)} style={styles.input}>
            {SPLIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {splitType !== 'EQUAL' && (
        <div style={styles.splitsBox}>
          <div style={styles.splitsHeader}>
            <span>Split {splitType === 'PERCENTAGE' ? '(%)' : '(amount)'}</span>
            <span style={{ color: Math.abs(remaining) > 0.01 ? '#c0392b' : '#27ae60' }}>
              Remaining: {remaining}
              {splitType === 'PERCENTAGE' ? '%' : ''}
            </span>
          </div>
          {members.map((m) => (
            <div key={m.userId} style={styles.splitRow}>
              <span style={styles.splitName}>{m.name}</span>
              <input
                type="number"
                step="0.01"
                value={splitValues[m.userId] ?? ''}
                onChange={(e) => handleSplitValueChange(m.userId, e.target.value)}
                style={styles.splitInput}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" disabled={submitting} style={styles.button}>
        {submitting ? 'Adding...' : 'Add expense'}
      </button>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  row: { display: 'flex', gap: '0.75rem' },
  label: { flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.85rem', gap: '0.25rem' },
  input: { padding: '0.5rem', fontSize: '1rem' },
  splitsBox: { border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem' },
  splitsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  splitRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  splitName: { fontSize: '0.9rem' },
  splitInput: { width: '90px', padding: '0.35rem', fontSize: '0.9rem' },
  error: { color: '#c0392b', fontSize: '0.9rem' },
  button: { padding: '0.6rem', fontSize: '1rem', cursor: 'pointer' },
};
