import { pool } from '../config/db.js';

// Returns net balance per group member: { userId, name, email, totalPaid, totalOwed, netBalance }
// netBalance > 0 means they're owed money; < 0 means they owe money.
export async function computeGroupBalances(groupId) {
  const result = await pool.query(
    `WITH paid AS (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = $1
       GROUP BY paid_by
     ),
     owed AS (
       SELECT es.user_id, SUM(es.share_amount) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = $1
       GROUP BY es.user_id
     )
     SELECT gm.user_id,
            u.name,
            u.email,
            COALESCE(paid.total_paid, 0)::float AS total_paid,
            COALESCE(owed.total_owed, 0)::float AS total_owed,
            (COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0))::float AS net_balance
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN paid ON paid.user_id = gm.user_id
     LEFT JOIN owed ON owed.user_id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY net_balance DESC`,
    [groupId]
  );

  return result.rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    totalPaid: round2(r.total_paid),
    totalOwed: round2(r.total_owed),
    netBalance: round2(r.net_balance),
  }));
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
