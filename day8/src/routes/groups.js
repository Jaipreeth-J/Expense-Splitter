import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createGroup, listGroups, addMember } from '../controllers/groupsController.js';
import { createExpense, listExpenses } from '../controllers/expensesController.js';
import { getBalances } from '../controllers/balancesController.js';
import { getSimplifiedSettlements, getSettlementHistory } from '../controllers/settlementsController.js';

const router = Router();

router.use(requireAuth); // every route below requires a valid JWT

router.post('/', createGroup);
router.get('/', listGroups);
router.post('/:id/members', addMember);

router.post('/:id/expenses', createExpense);
router.get('/:id/expenses', listExpenses);

router.get('/:id/balances', getBalances);
router.get('/:id/settlements', getSimplifiedSettlements);
router.get('/:id/settlements/history', getSettlementHistory);

export default router;
