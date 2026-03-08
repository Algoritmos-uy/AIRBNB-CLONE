import { Router } from 'express';
import { adminLogin, adminLogout, listRegisteredUsers, requireAdmin } from '../controllers/admin.controller.js';

const router = Router();

router.post('/login', adminLogin);
router.post('/logout', adminLogout);
router.get('/users', requireAdmin, listRegisteredUsers);

export default router;
