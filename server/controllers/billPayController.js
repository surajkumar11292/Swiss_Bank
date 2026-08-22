import billPayService from '../services/billPayService.js';

export const billPayController = {
  async history(req, res, next) {
    try {
      const { page = 0, size = 8 } = req.query;
      const data = await billPayService.history(req.user, page, size);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async pay(req, res, next) {
    try {
      const data = await billPayService.pay(req.user, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
};

export default billPayController;
