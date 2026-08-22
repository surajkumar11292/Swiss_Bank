import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';
import accountService from './accountService.js';

export function toBillPaymentResponse(b) {
  return {
    id: b.id,
    accountNumber: b.account ? Number(b.account.accountNumber) : undefined,
    category: b.category,
    consumer: b.consumer,
    amount: Number(b.amount),
    reference: b.reference,
    createdAt: b.createdAt ? b.createdAt.toISOString() : null,
  };
}

export const billPayService = {
  async pay(owner, { accountNumber, category, consumer, amount, pin }) {
    if (!category || !consumer || !amount || !pin || !accountNumber) {
      throw ApiException.badRequest('Missing required bill payment parameters');
    }

    const { reference } = await accountService.debitInternal(
      owner,
      accountNumber,
      amount,
      pin,
      `${category} · ${consumer}`
    );

    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound('Account not found');
    }

    const created = await prisma.billPayment.create({
      data: {
        ownerId: owner.id,
        accountId: acct.id,
        category: category.trim(),
        consumer: consumer.trim(),
        amount: Number(amount),
        reference,
      },
      include: { account: true },
    });

    return toBillPaymentResponse(created);
  },

  async history(owner, page = 0, size = 8) {
    const take = Math.min(Number(size) || 8, 50);
    const skip = (Number(page) || 0) * take;

    const [totalElements, payments] = await Promise.all([
      prisma.billPayment.count({ where: { ownerId: owner.id } }),
      prisma.billPayment.findMany({
        where: { ownerId: owner.id },
        include: { account: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(totalElements / take) || (totalElements === 0 ? 0 : 1);
    const pageNum = Number(page) || 0;

    return {
      content: payments.map(toBillPaymentResponse),
      page: pageNum,
      size: take,
      totalElements,
      totalPages,
      first: pageNum === 0,
      last: pageNum >= totalPages - 1 || totalPages === 0,
    };
  },
};

export default billPayService;
