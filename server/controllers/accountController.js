import accountService from '../services/accountService.js';

function csvField(v) {
  const s = String(v == null ? '' : v);
  return '"' + s.replace(/"/g, '""') + '"';
}

export const accountController = {
  async myAccounts(req, res, next) {
    try {
      const data = await accountService.myAccounts(req.user);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async one(req, res, next) {
    try {
      const data = await accountService.getOwnedAccount(req.user, req.params.number);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async history(req, res, next) {
    try {
      const { page = 0, size = 10 } = req.query;
      const data = await accountService.history(req.user, req.params.number, page, size);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async open(req, res, next) {
    try {
      const data = await accountService.open(req.user, req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async credit(req, res, next) {
    try {
      const data = await accountService.credit(req.user, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async debit(req, res, next) {
    try {
      const data = await accountService.debit(req.user, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async transfer(req, res, next) {
    try {
      const data = await accountService.transfer(req.user, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async statementCsv(req, res, next) {
    try {
      const accountNumber = req.params.number;
      const rows = await accountService.fullHistory(req.user, accountNumber);

      let csv = 'Description,Reference,Date,Type,Amount,Balance After\n';
      for (const e of rows) {
        csv += [
          csvField(e.description),
          csvField(e.reference),
          csvField(e.createdAt || ''),
          csvField(e.type),
          csvField(e.amount),
          csvField(e.balanceAfter),
        ].join(',') + '\n';
      }

      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      res.setHeader('Content-Disposition', `attachment; filename="statement-${accountNumber}.csv"`);
      res.status(200).send(Buffer.from(csv, 'utf-8'));
    } catch (err) {
      next(err);
    }
  },
};

export default accountController;
