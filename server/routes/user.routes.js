import { Router } from 'express';
import { requireUser } from '../middleware/requireUser.js';
import { getMyReservations } from '../controllers/user.controller.js';

const router = Router();
router.get('/my-reservations', requireUser, getMyReservations);

export default router;