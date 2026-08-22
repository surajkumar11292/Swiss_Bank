import express from 'express';
import beneficiaryController from '../controllers/beneficiaryController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', beneficiaryController.mine);
router.post('/', beneficiaryController.add);
router.delete('/:id', beneficiaryController.remove);

export default router;
