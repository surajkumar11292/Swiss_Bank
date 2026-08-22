import express from 'express';
import accountController from '../controllers/accountController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', accountController.myAccounts);
router.post('/', accountController.open);
router.post('/credit', accountController.credit);
router.post('/debit', accountController.debit);
router.post('/transfer', accountController.transfer);
router.get('/:number', accountController.one);
router.get('/:number/history', accountController.history);
router.get('/:number/statement.csv', accountController.statementCsv);

export default router;
