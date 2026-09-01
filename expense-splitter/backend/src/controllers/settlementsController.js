import { pool } from '../config/db.js';
import { computeGroupBalances } from '../services/balanceService.js';
import { simplifyDebts } from '../utils/debtSimplifier.js';

// GET /api/groups/:id/settlements
// Returns the minimal set of transactions to settle everyone's balance to zero.
export async function getSimplifiedSettlements(req, res) {
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
    const settlements = simplifyDebts(balances);

    res.json({ settlements });
  } catch (err) {
    console.error('Get settlements error:', err.message);
    res.status(500).json({ error: 'something went wrong computing settlements' });
  }
}
