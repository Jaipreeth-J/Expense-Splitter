export function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * EQUAL split: divide evenly, rounded down to the cent for everyone except
 * the last member, who absorbs the leftover — guarantees the shares sum to
 * exactly `amount` (assuming `amount` itself is already 2-decimal-safe).
 */
export function computeEqualSplit(amount, memberIds) {
  const shareBase = Math.floor((amount / memberIds.length) * 100) / 100;
  const totalBase = shareBase * (memberIds.length - 1);
  const lastShare = round2(amount - totalBase);

  return memberIds.map((userId, i) => ({
    userId,
    shareAmount: i === memberIds.length - 1 ? lastShare : shareBase,
  }));
}

/**
 * EXACT split: each split's amount is rounded to 2 decimals BEFORE it's
 * validated or summed. This is the Day 14 fix — previously the raw,
 * unrounded value was validated (e.g. 33.333 x3 = 100.00, passes), but
 * Postgres's NUMERIC(10,2) column rounds each row on insert (33.33 x3 =
 * 99.99), silently drifting from the expense total after storage.
 * Rounding here first means what's validated is exactly what gets stored.
 */
export function validateAndBuildExactSplit(amount, splits, memberIds) {
  assertShapeAndMembership(splits, memberIds, 'amount');

  let total = 0;
  const result = splits.map((s) => {
    const shareAmount = round2(Number(s.amount));
    if (isNaN(shareAmount) || shareAmount < 0) {
      throw new Error('each split amount must be a non-negative number');
    }
    total += shareAmount;
    return { userId: s.userId, shareAmount };
  });

  // Compare rounded-to-rounded rather than subtracting raw floats and
  // checking against an epsilon. Subtraction-based comparison can misfire on
  // floating point noise (e.g. 99.99000000000005 vs 100 can read as "off by
  // more than a cent" even though both sides are really whole cents once
  // rounded). Rounding both sides first makes the comparison exact and
  // removes the noise problem entirely, while still correctly rejecting a
  // genuine shortfall (e.g. three-decimal input that rounds down to a real
  // missing cent).
  if (round2(total) !== round2(amount)) {
    throw new Error(`split amounts (${round2(total).toFixed(2)}) must sum to the expense total (${amount.toFixed(2)})`);
  }

  return result;
}

/**
 * PERCENTAGE split: shareAmount is computed from the percentage and rounded
 * to 2 decimals immediately (already correct before Day 14 — kept as-is).
 */
export function validateAndBuildPercentageSplit(amount, splits, memberIds) {
  assertShapeAndMembership(splits, memberIds, 'percentage');

  let totalPercentage = 0;
  const result = splits.map((s) => {
    const percentage = Number(s.percentage);
    if (isNaN(percentage) || percentage < 0) {
      throw new Error('each split percentage must be a non-negative number');
    }
    totalPercentage += percentage;
    return { userId: s.userId, shareAmount: round2(amount * (percentage / 100)) };
  });

  if (round2(totalPercentage) !== 100) {
    throw new Error(`split percentages (${round2(totalPercentage).toFixed(2)}) must sum to 100`);
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
