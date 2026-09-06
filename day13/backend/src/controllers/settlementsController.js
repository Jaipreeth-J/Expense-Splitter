import PDFDocument from 'pdfkit';
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

// GET /api/groups/:id/settlements/pdf  (Day 13)
// Generates a settlement summary PDF: group balances + the simplified
// settlement suggestions, streamed directly as a download.
export async function exportSettlementsPdf(req, res) {
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

    const groupResult = await pool.query('SELECT name FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'group not found' });
    }
    const groupName = groupResult.rows[0].name;

    const balances = await computeGroupBalances(groupId);
    const settlements = simplifyDebts(balances);

    const doc = new PDFDocument({ margin: 50 });

    const safeFileName = groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="settlement-summary-${safeFileName}.pdf"`);

    doc.pipe(res);

    // --- Header ---
    doc.fontSize(20).text('Settlement Summary', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#555').text(groupName, { align: 'center' });
    doc.fontSize(10).fillColor('#888').text(new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown(1.5);

    // --- Balances section ---
    doc.fontSize(14).fillColor('#000').text('Balances');
    doc.moveDown(0.5);
    balances.forEach((b) => {
      const isZero = Math.abs(b.netBalance) < 0.01;
      const label = isZero
        ? 'settled up'
        : b.netBalance > 0
        ? `is owed Rs. ${b.netBalance.toFixed(2)}`
        : `owes Rs. ${Math.abs(b.netBalance).toFixed(2)}`;
      doc.fontSize(11).fillColor('#000').text(`${b.name}  —  ${label}`);
    });
    doc.moveDown(1.5);

    // --- Settlements section ---
    doc.fontSize(14).text('Suggested Settlements');
    doc.moveDown(0.5);
    if (settlements.length === 0) {
      doc.fontSize(11).fillColor('#1e8e5a').text('Everyone is settled up — no payments needed.');
    } else {
      settlements.forEach((s) => {
        doc.fontSize(11).fillColor('#000').text(`${s.fromName} pays ${s.toName}  —  Rs. ${s.amount.toFixed(2)}`);
      });
    }

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor('#999')
      .text('Generated by Expense Splitter', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Export settlements PDF error:', err.message);
    // Only send a JSON error if we haven't already started streaming the PDF
    if (!res.headersSent) {
      res.status(500).json({ error: 'something went wrong generating the PDF' });
    } else {
      res.end();
    }
  }
}
