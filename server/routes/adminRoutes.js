import express from 'express';
import adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', adminController.users);
router.post('/accounts/:accountNumber/freeze', adminController.freeze);
router.post('/accounts/:accountNumber/unfreeze', adminController.unfreeze);
router.get('/tickets', adminController.tickets);
router.post('/tickets/:id/close', adminController.closeTicket);

export default router;
