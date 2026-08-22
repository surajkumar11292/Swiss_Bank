import accountService, { toAccountResponse } from '../services/accountService.js';
import supportService from '../services/supportService.js';
import userService from '../services/userService.js';

export const adminController = {
  async users(req, res, next) {
    try {
      const users = await userService.allUsers();
      const result = users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt ? u.createdAt.toISOString() : null,
        accounts: u.accounts ? u.accounts.map(toAccountResponse) : [],
      }));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async freeze(req, res, next) {
    try {
      await accountService.setFrozen(req.params.accountNumber, true);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async unfreeze(req, res, next) {
    try {
      await accountService.setFrozen(req.params.accountNumber, false);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async tickets(req, res, next) {
    try {
      const list = await supportService.allTickets();
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async closeTicket(req, res, next) {
    try {
      await supportService.close(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

export default adminController;
