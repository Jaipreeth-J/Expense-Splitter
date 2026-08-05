import { pool } from '../config/db.js';

// POST /api/groups
// Creates a group and auto-adds the creator as the first member
export async function createGroup(req, res) {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'group name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO groups (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name.trim(), userId]
    );
    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [group.id, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ group });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create group error:', err.message);
    res.status(500).json({ error: 'something went wrong creating the group' });
  } finally {
    client.release();
  }
}

// GET /api/groups
// Lists all groups the logged-in user is a member of
export async function listGroups(req, res) {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
              COUNT(gm2.id)::int AS member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       JOIN group_members gm2 ON gm2.group_id = g.id
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [userId]
    );
    res.json({ groups: result.rows });
  } catch (err) {
    console.error('List groups error:', err.message);
    res.status(500).json({ error: 'something went wrong fetching groups' });
  }
}

// POST /api/groups/:id/members
// Adds a user (by email) to the group. Only existing members can add others.
export async function addMember(req, res) {
  const groupId = req.params.id;
  const { email } = req.body;
  const requesterId = req.user.id;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const groupResult = await pool.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'group not found' });
    }

    const requesterMembership = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, requesterId]
    );
    if (requesterMembership.rows.length === 0) {
      return res.status(403).json({ error: 'you are not a member of this group' });
    }

    const userResult = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'no user found with that email' });
    }
    const userToAdd = userResult.rows[0];

    const existing = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userToAdd.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'user is already a member of this group' });
    }

    const insertResult = await pool.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       RETURNING id, group_id, user_id, joined_at`,
      [groupId, userToAdd.id]
    );

    res.status(201).json({ member: { ...insertResult.rows[0], user: userToAdd } });
  } catch (err) {
    console.error('Add member error:', err.message);
    res.status(500).json({ error: 'something went wrong adding the member' });
  }
}
