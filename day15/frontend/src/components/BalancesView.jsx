export default function BalancesView({ balances, currentUserId }) {
  const me = balances.find((b) => b.userId === currentUserId);
  const myBalance = me?.netBalance ?? 0;
  const isZero = Math.abs(myBalance) < 0.01;
  const isPositive = myBalance > 0;

  const bannerText = isZero
    ? "You're all settled up in this group"
    : isPositive
    ? `You are owed ₹${myBalance.toFixed(2)} overall`
    : `You owe ₹${Math.abs(myBalance).toFixed(2)} overall`;

  const bannerClass = isZero ? 'banner-neutral' : isPositive ? 'banner-positive' : 'banner-negative';

  return (
    <div>
      <div className={`rounded-md px-4 py-3 font-semibold text-center mb-4 money ${bannerClass}`}>
        {bannerText}
      </div>

      <ul className="space-y-2">
        {balances.map((b) => {
          const isMe = b.userId === currentUserId;
          const rowIsZero = Math.abs(b.netBalance) < 0.01;
          const rowIsPositive = b.netBalance > 0;

          return (
            <li key={b.userId} className="card flex items-center justify-between px-4 py-2.5">
              <span className="font-medium">
                {b.name}
                {isMe ? ' (you)' : ''}
              </span>
              <span
                className={`text-sm font-semibold money ${
                  rowIsZero ? 'text-muted' : rowIsPositive ? 'text-emerald-dark' : 'text-brick'
                }`}
              >
                {rowIsZero
                  ? 'settled up'
                  : rowIsPositive
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
