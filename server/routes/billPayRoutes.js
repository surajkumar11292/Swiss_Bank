import express from 'express';
import billPayController from '../controllers/billPayController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/history', billPayController.history);
router.post('/', billPayController.pay);

export default router;
