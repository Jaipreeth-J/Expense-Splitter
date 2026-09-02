import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { recordSettlement } from '../controllers/settlementsController.js';

const router = Router();

router.use(requireAuth);

router.post('/', recordSettlement);

export default router;
