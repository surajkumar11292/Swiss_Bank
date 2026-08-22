import express from 'express';
import twoFactorController from '../controllers/twoFactorController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/status', twoFactorController.status);
router.post('/setup', twoFactorController.setup);
router.post('/enable', twoFactorController.enable);
router.post('/disable', twoFactorController.disable);

export default router;
