// Run with: node tests/rounding.test.mjs
// No DB connection needed — these test the pure calculation functions directly.

import assert from 'node:assert/strict';
import {
  round2,
  computeEqualSplit,
  validateAndBuildExactSplit,
  validateAndBuildPercentageSplit,
} from '../src/utils/splitCalculator.js';
import { simplifyDebts } from '../src/utils/debtSimplifier.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function sumShares(splits) {
  return round2(splits.reduce((sum, s) => sum + s.shareAmount, 0));
}

console.log('EQUAL split — uneven division');
test('₹100 / 3 members sums to exactly 100.00', () => {
  const splits = computeEqualSplit(100, [1, 2, 3]);
  assert.equal(sumShares(splits), 100);
  // classic case: 33.33 + 33.33 + 33.34
  assert.deepEqual(
    splits.map((s) => s.shareAmount).sort(),
    [33.33, 33.33, 33.34]
  );
});

test('₹10 / 7 members sums to exactly 10.00 (repeating decimal)', () => {
  const splits = computeEqualSplit(10, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sumShares(splits), 10);
});

test('₹0.03 / 2 members still sums correctly (smallest possible amount)', () => {
  const splits = computeEqualSplit(0.03, [1, 2]);
  assert.equal(sumShares(splits), 0.03);
});

test('large group (15 members) with an awkward amount', () => {
  const splits = computeEqualSplit(999.97, Array.from({ length: 15 }, (_, i) => i + 1));
  assert.equal(sumShares(splits), 999.97);
  assert.equal(splits.length, 15);
});

console.log('\nEXACT split — the Day 14 rounding fix');
test('a genuine sub-cent shortfall is now caught loudly instead of silently drifting in storage', () => {
  // Before the fix: 33.333 + 33.333 + 33.334 = 100.000 unrounded, so the OLD
  // code validated it as a pass. But Postgres's NUMERIC(10,2) column rounds
  // each value independently on insert: 33.33 + 33.33 + 33.33 = 99.99 — a
  // real cent goes missing, silently, discovered only later (if ever) via
  // the balance sanity-check warning.
  // After the fix: rounding happens BEFORE the sum check, so this same input
  // is correctly rejected up front, with a clear message telling the person
  // to adjust their split — instead of accepting bad data and drifting later.
  assert.throws(
    () =>
      validateAndBuildExactSplit(100, [
        { userId: 1, amount: 33.333 },
        { userId: 2, amount: 33.333 },
        { userId: 3, amount: 33.334 },
      ], [1, 2, 3]),
    /must sum to the expense total/
  );
});

test('legitimate 2-decimal splits are never falsely rejected by floating point noise', () => {
  // This is the other half of the Day 14 fix: comparing rounded-to-rounded
  // instead of subtracting raw floats against an epsilon. Repeated float
  // addition can land on values like 99.99000000000006 even when every
  // individual number is a clean 2-decimal currency amount — an epsilon
  // comparison can misfire on that noise. Round-then-compare sidesteps it.
  const splits = validateAndBuildExactSplit(100, [
    { userId: 1, amount: 33.33 },
    { userId: 2, amount: 33.33 },
    { userId: 3, amount: 33.34 },
  ], [1, 2, 3]);
  assert.equal(sumShares(splits), 100);
});

test('rejects splits that genuinely do not sum to the total', () => {
  assert.throws(
    () =>
      validateAndBuildExactSplit(100, [
        { userId: 1, amount: 40 },
        { userId: 2, amount: 40 },
      ], [1, 2]),
    /must sum to the expense total/
  );
});

test('rejects a split for a user not in the group', () => {
  assert.throws(
    () => validateAndBuildExactSplit(100, [{ userId: 999, amount: 100 }], [1, 2]),
    /not a member/
  );
});

test('rejects duplicate userId in splits', () => {
  assert.throws(
    () =>
      validateAndBuildExactSplit(100, [
        { userId: 1, amount: 50 },
        { userId: 1, amount: 50 },
      ], [1, 2]),
    /duplicate/
  );
});

console.log('\nPERCENTAGE split');
test('repeating-decimal percentages (33.33/33.33/33.34) sum correctly', () => {
  const splits = validateAndBuildPercentageSplit(100, [
    { userId: 1, percentage: 33.33 },
    { userId: 2, percentage: 33.33 },
    { userId: 3, percentage: 33.34 },
  ], [1, 2, 3]);
  assert.equal(sumShares(splits), 100);
});

test('rejects percentages that do not sum to 100', () => {
  assert.throws(
    () =>
      validateAndBuildPercentageSplit(100, [
        { userId: 1, percentage: 60 },
        { userId: 2, percentage: 30 },
      ], [1, 2]),
    /must sum to 100/
  );
});

console.log('\nDebt simplification — convergence with rounding-prone balances');
test('balances from an uneven 3-way split settle to exactly zero', () => {
  // Mirrors a real scenario: A pays 100, split 3 ways (33.33/33.33/33.34)
  const balances = [
    { userId: 1, name: 'A', netBalance: 66.67 }, // paid 100, owes 33.33
    { userId: 2, name: 'B', netBalance: -33.33 },
    { userId: 3, name: 'C', netBalance: -33.34 },
  ];
  const settlements = simplifyDebts(balances);
  const totalSettled = round2(settlements.reduce((sum, s) => sum + s.amount, 0));
  assert.equal(totalSettled, 66.67);
});

test('large group (10 members) with random-ish balances all converge to zero net', () => {
  const balances = [
    { userId: 1, name: 'A', netBalance: 120.5 },
    { userId: 2, name: 'B', netBalance: -45.25 },
    { userId: 3, name: 'C', netBalance: 30.75 },
    { userId: 4, name: 'D', netBalance: -100.0 },
    { userId: 5, name: 'E', netBalance: -6.0 },
  ];
  const totalPositive = round2(balances.filter((b) => b.netBalance > 0).reduce((s, b) => s + b.netBalance, 0));
  const settlements = simplifyDebts(balances);
  const totalSettled = round2(settlements.reduce((sum, s) => sum + s.amount, 0));
  assert.equal(totalSettled, totalPositive);
});

test('already-settled group (all zero balances) produces no transactions', () => {
  const balances = [
    { userId: 1, name: 'A', netBalance: 0 },
    { userId: 2, name: 'B', netBalance: 0 },
  ];
  assert.equal(simplifyDebts(balances).length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
