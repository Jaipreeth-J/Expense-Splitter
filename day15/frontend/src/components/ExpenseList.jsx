export default function ExpenseList({ expenses }) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted">No expenses yet — add one above.</p>;
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => (
        <li key={expense.id} className="card p-4">
          <div className="flex items-center justify-between font-medium">
            <span>{expense.description}</span>
            <span className="money">₹{Number(expense.amount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted mt-1">
            <span>Paid by {expense.paid_by_name}</span>
            <span className="badge">{expense.split_type}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {expense.splits.map((s) => (
              <span key={s.user_id} className="rounded bg-paper px-2 py-0.5 text-xs text-muted money">
                {s.name}: ₹{Number(s.share_amount).toFixed(2)}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
