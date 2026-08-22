import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';
import totpService from '../services/totpService.js';
import userService, { toUserResponse } from '../services/userService.js';

const MAX_MFA_ATTEMPTS = 5;

export const authController = {
  async register(req, res, next) {
    try {
      const { fullName, email, password, phone, dateOfBirth, panNumber, address } = req.body;
      if (!fullName || !email || !password) {
        throw ApiException.badRequest('Full name, email, and password are required');
      }

      const user = await userService.register({
        fullName,
        email,
        password,
        phone,
        dateOfBirth,
        panNumber,
        address,
      });

      res.status(201).json(toUserResponse(user));
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(ApiException.badRequest('Email and password are required'));
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!user) {
        return next(new ApiException(401, 'Invalid email or password'));
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return next(new ApiException(401, 'Invalid email or password'));
      }

      if (user.totpEnabled) {
        req.session.mfaUserId = user.id;
        req.session.mfaAttempts = 0;
        return res.json({
          mfaRequired: true,
          fullName: user.fullName,
          user: null,
        });
      }

      req.session.userId = user.id;
      res.json({
        mfaRequired: false,
        fullName: null,
        user: toUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyLoginCode(req, res, next) {
    try {
      const { code } = req.body;
      const mfaUserId = req.session ? req.session.mfaUserId : null;

      if (!mfaUserId) {
        throw ApiException.forbidden('No sign-in in progress -- please sign in again');
      }

      const user = await prisma.user.findUnique({
        where: { id: mfaUserId },
      });

      if (!user || !user.totpSecret) {
        throw ApiException.forbidden('Invalid session state -- please sign in again');
      }

      if (!totpService.verify(user.totpSecret, code)) {
        const attempts = (req.session.mfaAttempts || 0) + 1;
        if (attempts >= MAX_MFA_ATTEMPTS) {
          req.session.destroy(() => {});
          throw ApiException.forbidden('Too many incorrect codes -- please sign in again');
        }
        req.session.mfaAttempts = attempts;
        throw ApiException.totpInvalid(`Incorrect code -- ${MAX_MFA_ATTEMPTS - attempts} attempts left`);
      }

      delete req.session.mfaUserId;
      delete req.session.mfaAttempts;
      req.session.userId = user.id;

      res.json({
        mfaRequired: false,
        fullName: null,
        user: toUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      res.json(toUserResponse(req.user));
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw ApiException.badRequest('Current password and new password are required');
      }
      await userService.changePassword(req.user, currentPassword, newPassword);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      if (req.session) {
        req.session.destroy(() => {
          res.clearCookie('connect.sid');
          res.status(204).send();
        });
      } else {
        res.status(204).send();
      }
    } catch (err) {
      next(err);
    }
  },
};

export default authController;
