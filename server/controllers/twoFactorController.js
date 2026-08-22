import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';
import totpService from '../services/totpService.js';

export const twoFactorController = {
  async status(req, res, next) {
    try {
      res.json({ enabled: Boolean(req.user.totpEnabled) });
    } catch (err) {
      next(err);
    }
  },

  async setup(req, res, next) {
    try {
      if (req.user.totpEnabled) {
        throw ApiException.badRequest('2FA is already enabled — disable it first to reset the key');
      }
      const secret = totpService.generateSecret();
      await prisma.user.update({
        where: { id: req.user.id },
        data: { totpSecret: secret },
      });
      const otpauthUri = totpService.otpAuthUri(secret, req.user.email);
      res.json({ secret, otpauthUri });
    } catch (err) {
      next(err);
    }
  },

  async enable(req, res, next) {
    try {
      const { code } = req.body;
      if (!req.user.totpSecret) {
        throw ApiException.badRequest('Start setup first');
      }
      if (!totpService.verify(req.user.totpSecret, code)) {
        throw ApiException.totpInvalid('Incorrect code — check your authenticator app and try again');
      }
      await prisma.user.update({
        where: { id: req.user.id },
        data: { totpEnabled: true },
      });
      res.status(200).send();
    } catch (err) {
      next(err);
    }
  },

  async disable(req, res, next) {
    try {
      const { password, code } = req.body;
      const matches = await bcrypt.compare(password, req.user.passwordHash);
      if (!matches) {
        throw ApiException.forbidden('Current password is incorrect');
      }
      if (!totpService.verify(req.user.totpSecret, code)) {
        throw ApiException.totpInvalid('Incorrect code');
      }
      await prisma.user.update({
        where: { id: req.user.id },
        data: { totpEnabled: false, totpSecret: null },
      });
      res.status(200).send();
    } catch (err) {
      next(err);
    }
  },
};

export default twoFactorController;
