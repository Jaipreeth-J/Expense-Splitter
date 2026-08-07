import { pool } from '../config/db.js';

// POST /api/groups/:id/expenses
// Day 4 scope: EQUAL split only. EXACT and PERCENTAGE come on Day 5.
export async function createExpense(req, res) {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { description, amount, paidBy } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  const numericAmount = Number(amount);
  if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  // Who actually paid — defaults to the person making the request
  const payerId = paidBy || userId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Requester must be a member of the group
    const requesterMembership = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (requesterMembership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'you are not a member of this group' });
    }

    // Get all current members to split across
    const membersResult = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = membersResult.rows.map((r) => r.user_id);

    if (memberIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'group has no members to split between' });
    }

    // Verify the payer is actually a member
    if (!memberIds.includes(payerId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'paidBy must be a member of this group' });
    }

    const expenseResult = await client.query(
      `INSERT INTO expenses (group_id, paid_by, description, amount, split_type)
       VALUES ($1, $2, $3, $4, 'EQUAL')
       RETURNING id, group_id, paid_by, description, amount, split_type, created_at`,
      [groupId, payerId, description.trim(), numericAmount]
    );
    const expense = expenseResult.rows[0];

    // Equal split, rounded to cents. Any leftover paise from rounding
    // goes to the last member — proper rounding-safe distribution is a
    // Day 14 cleanup item per the plan.
    const shareBase = Math.floor((numericAmount / memberIds.length) * 100) / 100;
    const totalBase = shareBase * (memberIds.length - 1);
    const lastShare = Math.round((numericAmount - totalBase) * 100) / 100;

    const splits = [];
    for (let i = 0; i < memberIds.length; i++) {
      const share = i === memberIds.length - 1 ? lastShare : shareBase;
      const splitResult = await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share_amount)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, share_amount`,
        [expense.id, memberIds[i], share]
      );
      splits.push(splitResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ expense: { ...expense, splits } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create expense error:', err.message);
    res.status(500).json({ error: 'something went wrong creating the expense' });
  } finally {
    client.release();
  }
}

// GET /api/groups/:id/expenses
export async function listExpenses(req, res) {
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

    const expensesResult = await pool.query(
      `SELECT e.id, e.description, e.amount, e.split_type, e.created_at,
              e.paid_by, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC`,
      [groupId]
    );

    const expenses = expensesResult.rows;

    // Attach splits for each expense
    for (const expense of expenses) {
      const splitsResult = await pool.query(
        `SELECT es.user_id, u.name, es.share_amount
         FROM expense_splits es
         JOIN users u ON u.id = es.user_id
         WHERE es.expense_id = $1`,
        [expense.id]
      );
      expense.splits = splitsResult.rows;
    }

    res.json({ expenses });
  } catch (err) {
    console.error('List expenses error:', err.message);
    res.status(500).json({ error: 'something went wrong fetching expenses' });
  }
}
