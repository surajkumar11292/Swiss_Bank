import supportService from '../services/supportService.js';

export const supportController = {
  async mine(req, res, next) {
    try {
      const list = await supportService.mine(req.user);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async raise(req, res, next) {
    try {
      const created = await supportService.raise(req.user, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
};

export default supportController;
