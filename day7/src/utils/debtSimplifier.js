const EPSILON = 0.01;

/**
 * Given balances [{ userId, name, netBalance }], returns the minimal set of
 * transactions to settle the group: [{ from, fromName, to, toName, amount }]
 *
 * Algorithm: greedily match the largest creditor with the largest debtor,
 * settle the smaller of the two amounts, repeat until everyone is ~0.
 * This is the classic minimum-cash-flow approach — it doesn't guarantee the
 * mathematically optimal minimum transaction count in every case (that's an
 * NP-hard problem in general), but it's a strong, simple, well-known
 * approximation and is what's expected here.
 */
export function simplifyDebts(balances) {
  const creditors = balances
    .filter((b) => b.netBalance > EPSILON)
    .map((b) => ({ userId: b.userId, name: b.name, amount: b.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.netBalance < -EPSILON)
    .map((b) => ({ userId: b.userId, name: b.name, amount: -b.netBalance })) // store as positive "amount owed"
    .sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settleAmount = Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100;

    if (settleAmount > EPSILON) {
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: settleAmount,
      });
    }

    creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
    debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;

    if (creditor.amount <= EPSILON) i++;
    if (debtor.amount <= EPSILON) j++;
  }

  return transactions;
}
