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
  const [splitValues, setSplitValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
  const isBalanced = Math.abs(remaining) <= 0.01;

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
      if (!isBalanced) {
        setError(`split amounts must add up to ${numericAmount} (currently ${splitSum.toFixed(2)})`);
        return;
      }
      body.splits = members.map((m) => ({
        userId: m.userId,
        amount: Number(splitValues[m.userId] || 0),
      }));
    } else if (splitType === 'PERCENTAGE') {
      if (!isBalanced) {
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
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input-field money"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Paid by</label>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="input-field">
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Split type</label>
          <select value={splitType} onChange={(e) => setSplitType(e.target.value)} className="input-field">
            {SPLIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {splitType !== 'EQUAL' && (
        <div className="rounded-md border border-border p-4 bg-paper">
          <div className="flex items-center justify-between text-sm font-medium mb-3">
            <span>Split {splitType === 'PERCENTAGE' ? '(%)' : '(amount)'}</span>
            <span className={`money ${isBalanced ? 'text-emerald-dark' : 'text-brick'}`}>
              Remaining: {remaining}
              {splitType === 'PERCENTAGE' ? '%' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between">
                <span className="text-sm">{m.name}</span>
                <input
                  type="number"
                  step="0.01"
                  value={splitValues[m.userId] ?? ''}
                  onChange={(e) => handleSplitValueChange(m.userId, e.target.value)}
                  className="input-field money w-24 py-1.5"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-brick">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Adding…' : 'Add expense'}
      </button>
    </form>
  );
}
