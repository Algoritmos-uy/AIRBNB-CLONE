import { Router } from 'express';
import { createReservation, listReservations, getAvailability, deleteReservation } from '../controllers/reservations.controller.js';
import { requireUser } from '../controllers/auth.controller.js';
import { requireAdmin } from '../controllers/admin.controller.js';

const router = Router();

router.post('/', requireUser, createReservation);
router.get('/', requireAdmin, listReservations);
router.delete('/:id', requireAdmin, deleteReservation);
router.get('/availability/:propertyId', getAvailability);

export default router;
