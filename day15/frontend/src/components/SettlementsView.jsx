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
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm text-muted flex-1">
          The minimum set of payments to settle the whole group — computed by matching the largest
          creditor with the largest debtor.
        </p>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="inline-flex items-center justify-center rounded-md border border-gold px-3 py-1.5
                     text-sm font-medium text-gold whitespace-nowrap transition-colors
                     hover:bg-gold hover:text-white disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : '↓ Export PDF'}
        </button>
      </div>

      {error && <p className="text-sm text-brick mb-3">{error}</p>}

      {settlements.length === 0 ? (
        <p className="text-sm font-medium text-emerald-dark">
          Everyone's settled up — no payments needed.
        </p>
      ) : (
        <ul className="space-y-2">
          {settlements.map((s) => {
            const key = `${s.from}-${s.to}`;
            const canSettle = currentUserId === s.from || currentUserId === s.to;
            return (
              <li key={key} className="card flex items-center justify-between px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold">{s.fromName}</span> pays{' '}
                  <span className="font-semibold">{s.toName}</span>
                  <span className="money font-semibold text-ink"> ₹{s.amount.toFixed(2)}</span>
                </div>
                {canSettle && (
                  <button
                    onClick={() => handleMarkSettled(s)}
                    disabled={settlingKey === key}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    {settlingKey === key ? 'Recording…' : 'Mark as settled'}
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
