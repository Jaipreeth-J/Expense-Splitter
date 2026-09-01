import { pool } from '../config/db.js';

const VALID_SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENTAGE'];
const EPSILON = 0.01; // tolerance for floating point comparison on money

// POST /api/groups/:id/expenses
export async function createExpense(req, res) {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { description, amount, paidBy, splitType = 'EQUAL', splits } = req.body;

  // --- basic field validation ---
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  const numericAmount = Number(amount);
  if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!VALID_SPLIT_TYPES.includes(splitType)) {
    return res.status(400).json({ error: `splitType must be one of ${VALID_SPLIT_TYPES.join(', ')}` });
  }
  if (splitType !== 'EQUAL' && (!Array.isArray(splits) || splits.length === 0)) {
    return res.status(400).json({ error: `splits array is required for ${splitType} split type` });
  }

  const payerId = paidBy || userId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const requesterMembership = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (requesterMembership.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'you are not a member of this group' });
    }

    const membersResult = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = membersResult.rows.map((r) => r.user_id);

    if (memberIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'group has no members to split between' });
    }
    if (!memberIds.includes(payerId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'paidBy must be a member of this group' });
    }

    // --- compute per-member shares based on splitType ---
    let computedSplits;
    try {
      if (splitType === 'EQUAL') {
        computedSplits = computeEqualSplit(numericAmount, memberIds);
      } else if (splitType === 'EXACT') {
        computedSplits = validateAndBuildExactSplit(numericAmount, splits, memberIds);
      } else {
        computedSplits = validateAndBuildPercentageSplit(numericAmount, splits, memberIds);
      }
    } catch (validationErr) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationErr.message });
    }

    const expenseResult = await client.query(
      `INSERT INTO expenses (group_id, paid_by, description, amount, split_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, group_id, paid_by, description, amount, split_type, created_at`,
      [groupId, payerId, description.trim(), numericAmount, splitType]
    );
    const expense = expenseResult.rows[0];

    const insertedSplits = [];
    for (const s of computedSplits) {
      const splitResult = await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share_amount)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, share_amount`,
        [expense.id, s.userId, s.shareAmount]
      );
      insertedSplits.push(splitResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ expense: { ...expense, splits: insertedSplits } });
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

// ---------- split calculation helpers ----------

function computeEqualSplit(amount, memberIds) {
  const shareBase = Math.floor((amount / memberIds.length) * 100) / 100;
  const totalBase = shareBase * (memberIds.length - 1);
  const lastShare = Math.round((amount - totalBase) * 100) / 100;

  return memberIds.map((userId, i) => ({
    userId,
    shareAmount: i === memberIds.length - 1 ? lastShare : shareBase,
  }));
}

function validateAndBuildExactSplit(amount, splits, memberIds) {
  assertShapeAndMembership(splits, memberIds, 'amount');

  let total = 0;
  const result = splits.map((s) => {
    const shareAmount = Number(s.amount);
    if (isNaN(shareAmount) || shareAmount < 0) {
      throw new Error('each split amount must be a non-negative number');
    }
    total += shareAmount;
    return { userId: s.userId, shareAmount };
  });

  if (Math.abs(total - amount) > EPSILON) {
    throw new Error(`split amounts (${total.toFixed(2)}) must sum to the expense total (${amount.toFixed(2)})`);
  }

  return result;
}

function validateAndBuildPercentageSplit(amount, splits, memberIds) {
  assertShapeAndMembership(splits, memberIds, 'percentage');

  let totalPercentage = 0;
  const result = splits.map((s) => {
    const percentage = Number(s.percentage);
    if (isNaN(percentage) || percentage < 0) {
      throw new Error('each split percentage must be a non-negative number');
    }
    totalPercentage += percentage;
    return { userId: s.userId, shareAmount: Math.round(amount * (percentage / 100) * 100) / 100 };
  });

  if (Math.abs(totalPercentage - 100) > EPSILON) {
    throw new Error(`split percentages (${totalPercentage.toFixed(2)}) must sum to 100`);
  }

  return result;
}

function assertShapeAndMembership(splits, memberIds, valueField) {
  for (const s of splits) {
    if (!s.userId || s[valueField] === undefined) {
      throw new Error(`each split must include userId and ${valueField}`);
    }
    if (!memberIds.includes(s.userId)) {
      throw new Error(`user ${s.userId} is not a member of this group`);
    }
  }
  const uniqueUserIds = new Set(splits.map((s) => s.userId));
  if (uniqueUserIds.size !== splits.length) {
    throw new Error('duplicate userId in splits');
  }
}
