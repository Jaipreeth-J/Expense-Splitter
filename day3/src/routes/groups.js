import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createGroup, listGroups, addMember } from '../controllers/groupsController.js';

const router = Router();

router.use(requireAuth); // every route below requires a valid JWT

router.post('/', createGroup);
router.get('/', listGroups);
router.post('/:id/members', addMember);

export default router;
