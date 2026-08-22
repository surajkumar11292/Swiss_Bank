import express from 'express';
import cardController from '../controllers/cardController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', cardController.mine);
router.patch('/:accountNumber', cardController.update);
router.post('/:accountNumber/request-replacement', cardController.requestReplacement);

export default router;
