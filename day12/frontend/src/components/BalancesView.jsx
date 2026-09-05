export default function BalancesView({ balances, currentUserId }) {
  const me = balances.find((b) => b.userId === currentUserId);
  const myBalance = me?.netBalance ?? 0;

  let bannerText;
  let bannerStyle;
  if (Math.abs(myBalance) < 0.01) {
    bannerText = "You're all settled up in this group";
    bannerStyle = styles.bannerNeutral;
  } else if (myBalance > 0) {
    bannerText = `You are owed ₹${myBalance.toFixed(2)} overall`;
    bannerStyle = styles.bannerPositive;
  } else {
    bannerText = `You owe ₹${Math.abs(myBalance).toFixed(2)} overall`;
    bannerStyle = styles.bannerNegative;
  }

  return (
    <div>
      <div style={{ ...styles.banner, ...bannerStyle }}>{bannerText}</div>

      <ul style={styles.list}>
        {balances.map((b) => {
          const isMe = b.userId === currentUserId;
          const isZero = Math.abs(b.netBalance) < 0.01;
          const isPositive = b.netBalance > 0;

          return (
            <li key={b.userId} style={styles.row}>
              <span style={styles.name}>
                {b.name}
                {isMe ? ' (you)' : ''}
              </span>
              <span
                style={{
                  ...styles.balanceText,
                  color: isZero ? '#888' : isPositive ? '#1e8e5a' : '#c0392b',
                }}
              >
                {isZero
                  ? 'settled up'
                  : isPositive
                  ? `is owed ₹${b.netBalance.toFixed(2)}`
                  : `owes ₹${Math.abs(b.netBalance).toFixed(2)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const styles = {
  banner: {
    padding: '0.9rem 1rem',
    borderRadius: '8px',
    fontWeight: 600,
    marginBottom: '1rem',
    textAlign: 'center',
  },
  bannerPositive: { background: '#e6f6ee', color: '#1e8e5a' },
  bannerNegative: { background: '#fdecea', color: '#c0392b' },
  bannerNeutral: { background: '#f0f0f0', color: '#555' },
  list: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.6rem 0.8rem',
    background: '#f7f7f7',
    borderRadius: '6px',
  },
  name: { fontWeight: 600 },
  balanceText: { fontWeight: 600, fontSize: '0.9rem' },
};
