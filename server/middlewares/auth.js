import prisma from '../config/prisma.js';
import { ApiException } from './errorHandler.js';

export async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return next(ApiException.unauthorized('Not authenticated'));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user) {
      req.session.destroy(() => {});
      return next(ApiException.unauthorized('Not authenticated'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(ApiException.forbidden("You don't have permission to do that"));
  }
  next();
}
