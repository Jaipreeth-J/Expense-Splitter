import { pool } from '../config/db.js';

// GET /api/groups/:id/balances
// net_balance = total_paid - total_owed, per group member
export async function getBalances(req, res) {
  const groupId = req.params.id;
  const userId = req.user.id;

  try {
    const membership = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'you are not a member of this group' });
    }

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

    const balances = result.rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      totalPaid: round2(r.total_paid),
      totalOwed: round2(r.total_owed),
      netBalance: round2(r.net_balance), // positive = is owed money, negative = owes money
    }));

    // Sanity check: balances should always sum to ~0. If they don't, something's
    // wrong upstream (e.g. a split that didn't sum to its expense total).
    const sumCheck = balances.reduce((sum, b) => sum + b.netBalance, 0);
    if (Math.abs(sumCheck) > 0.05) {
      console.warn(`Balance sanity check failed for group ${groupId}: sum = ${sumCheck}`);
    }

    res.json({ balances });
  } catch (err) {
    console.error('Get balances error:', err.message);
    res.status(500).json({ error: 'something went wrong calculating balances' });
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
