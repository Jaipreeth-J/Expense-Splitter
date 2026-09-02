import { pool } from '../config/db.js';
import { computeGroupBalances } from '../services/balanceService.js';
import { simplifyDebts } from '../utils/debtSimplifier.js';

// GET /api/groups/:id/settlements  (Day 7)
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

// POST /api/settlements  (Day 8)
// Records that a payment actually happened between two group members.
// Only the payer or the recipient can record it (basic self-service guard —
// stops a random third member from fabricating someone else's payment).
export async function recordSettlement(req, res) {
  const requesterId = req.user.id;
  const { groupId, fromUserId, toUserId, amount } = req.body;

  if (!groupId || !fromUserId || !toUserId) {
    return res.status(400).json({ error: 'groupId, fromUserId, and toUserId are required' });
  }
  if (fromUserId === toUserId) {
    return res.status(400).json({ error: 'fromUserId and toUserId must be different' });
  }
  const numericAmount = Number(amount);
  if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (requesterId !== fromUserId && requesterId !== toUserId) {
    return res.status(403).json({ error: 'you can only record settlements you are a part of' });
  }

  try {
    const membersResult = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = membersResult.rows.map((r) => r.user_id);

    if (memberIds.length === 0) {
      return res.status(404).json({ error: 'group not found or has no members' });
    }
    if (!memberIds.includes(fromUserId) || !memberIds.includes(toUserId)) {
      return res.status(400).json({ error: 'both users must be members of this group' });
    }

    const result = await pool.query(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, status, settled_at)
       VALUES ($1, $2, $3, $4, 'PAID', NOW())
       RETURNING id, group_id, from_user, to_user, amount, status, settled_at`,
      [groupId, fromUserId, toUserId, numericAmount]
    );

    res.status(201).json({ settlement: result.rows[0] });
  } catch (err) {
    console.error('Record settlement error:', err.message);
    res.status(500).json({ error: 'something went wrong recording the settlement' });
  }
}

// GET /api/groups/:id/settlements/history  (Day 8)
export async function getSettlementHistory(req, res) {
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
      `SELECT s.id, s.amount, s.status, s.settled_at,
              s.from_user, fu.name AS from_name,
              s.to_user, tu.name AS to_name
       FROM settlements s
       JOIN users fu ON fu.id = s.from_user
       JOIN users tu ON tu.id = s.to_user
       WHERE s.group_id = $1
       ORDER BY s.settled_at DESC`,
      [groupId]
    );

    res.json({ settlements: result.rows });
  } catch (err) {
    console.error('Get settlement history error:', err.message);
    res.status(500).json({ error: 'something went wrong fetching settlement history' });
  }
}
