import express from 'express';
import authRoutes from './authRoutes.js';
import accountRoutes from './accountRoutes.js';
import twoFactorRoutes from './twoFactorRoutes.js';
import beneficiaryRoutes from './beneficiaryRoutes.js';
import billPayRoutes from './billPayRoutes.js';
import cardRoutes from './cardRoutes.js';
import supportRoutes from './supportRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/beneficiaries', beneficiaryRoutes);
router.use('/billpay', billPayRoutes);
router.use('/cards', cardRoutes);
router.use('/support/tickets', supportRoutes);
router.use('/admin', adminRoutes);

export default router;
