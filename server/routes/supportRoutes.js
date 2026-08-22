import express from 'express';
import supportController from '../controllers/supportController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', supportController.mine);
router.post('/', supportController.raise);

export default router;
