import { useState } from 'react';
import { apiFetch, downloadFile } from '../api';

export default function SettlementsView({ groupId, settlements, currentUserId, onSettled }) {
  const [settlingKey, setSettlingKey] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  async function handleMarkSettled(s) {
    const key = `${s.from}-${s.to}`;
    setSettlingKey(key);
    setError('');
    try {
      await apiFetch('/settlements', {
        method: 'POST',
        body: JSON.stringify({
          groupId: Number(groupId),
          fromUserId: s.from,
          toUserId: s.to,
          amount: s.amount,
        }),
      });
      onSettled();
    } catch (err) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setSettlingKey(null);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setError('');
    try {
      await downloadFile(`/groups/${groupId}/settlements/pdf`, 'settlement-summary.pdf');
    } catch (err) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <p style={styles.intro}>
          The minimum set of payments to settle the whole group — computed by matching the largest
          creditor with the largest debtor.
        </p>
        <button onClick={handleExportPdf} disabled={exporting} style={styles.exportButton}>
          {exporting ? 'Exporting...' : '⬇ Export PDF'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {settlements.length === 0 ? (
        <p style={styles.allSettled}>✅ Everyone's settled up — no payments needed.</p>
      ) : (
        <ul style={styles.list}>
          {settlements.map((s) => {
            const key = `${s.from}-${s.to}`;
            const canSettle = currentUserId === s.from || currentUserId === s.to;
            return (
              <li key={key} style={styles.card}>
                <div style={styles.transactionText}>
                  <strong>{s.fromName}</strong> pays <strong>{s.toName}</strong>
                  <span style={styles.amount}> ₹{s.amount.toFixed(2)}</span>
                </div>
                {canSettle && (
                  <button
                    onClick={() => handleMarkSettled(s)}
                    disabled={settlingKey === key}
                    style={styles.button}
                  >
                    {settlingKey === key ? 'Recording...' : 'Mark as settled'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  intro: { fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem', flex: 1 },
  exportButton: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  allSettled: { color: '#1e8e5a', fontWeight: 600 },
  error: { color: '#c0392b', fontSize: '0.9rem', marginBottom: '0.5rem' },
  list: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
  },
  transactionText: { fontSize: '0.95rem' },
  amount: { color: '#2c3e50', fontWeight: 700, marginLeft: '0.25rem' },
  button: { padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' },
};
