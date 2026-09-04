export default function ExpenseList({ expenses }) {
  if (expenses.length === 0) {
    return <p style={{ color: '#666' }}>No expenses yet — add one above.</p>;
  }

  return (
    <ul style={styles.list}>
      {expenses.map((expense) => (
        <li key={expense.id} style={styles.card}>
          <div style={styles.headerRow}>
            <span style={styles.description}>{expense.description}</span>
            <span style={styles.amount}>₹{Number(expense.amount).toFixed(2)}</span>
          </div>
          <div style={styles.metaRow}>
            <span>Paid by {expense.paid_by_name}</span>
            <span style={styles.badge}>{expense.split_type}</span>
          </div>
          <div style={styles.splitsRow}>
            {expense.splits.map((s) => (
              <span key={s.user_id} style={styles.splitChip}>
                {s.name}: ₹{Number(s.share_amount).toFixed(2)}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

const styles = {
  list: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  card: { border: '1px solid #e0e0e0', borderRadius: '6px', padding: '0.75rem 1rem' },
  headerRow: { display: 'flex', justifyContent: 'space-between', fontWeight: 600 },
  amount: { color: '#2c3e50' },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#666',
    marginTop: '0.25rem',
  },
  badge: {
    background: '#eef2f7',
    borderRadius: '4px',
    padding: '0.1rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  splitsRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' },
  splitChip: {
    background: '#f7f7f7',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    color: '#444',
  },
};
