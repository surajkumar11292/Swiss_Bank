import cardService from '../services/cardService.js';

export const cardController = {
  async mine(req, res, next) {
    try {
      const data = await cardService.mine(req.user);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const data = await cardService.update(req.user, req.params.accountNumber, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async requestReplacement(req, res, next) {
    try {
      const data = await cardService.requestReplacement(req.user, req.params.accountNumber);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};

export default cardController;
