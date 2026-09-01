import { pool } from '../config/db.js';
import { computeGroupBalances } from '../services/balanceService.js';

// GET /api/groups/:id/balances
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

    const balances = await computeGroupBalances(groupId);

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
