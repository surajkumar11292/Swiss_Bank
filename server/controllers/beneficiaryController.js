import beneficiaryService from '../services/beneficiaryService.js';

export const beneficiaryController = {
  async mine(req, res, next) {
    try {
      const list = await beneficiaryService.mine(req.user);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async add(req, res, next) {
    try {
      const created = await beneficiaryService.add(req.user, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await beneficiaryService.remove(req.user, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

export default beneficiaryController;
