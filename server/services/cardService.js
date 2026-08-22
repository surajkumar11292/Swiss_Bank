import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';

export function toCardResponse(c, account) {
  const acct = account || c.account;
  return {
    accountNumber: Number(acct.accountNumber),
    holderName: acct.holderName,
    network: c.network,
    expiryMonth: c.expiryMonth,
    expiryYear: c.expiryYear,
    frozen: c.frozen,
    contactlessEnabled: c.contactlessEnabled,
    onlineEnabled: c.onlineEnabled,
    dailyLimit: Number(c.dailyLimit),
    replacementRequestedAt: c.replacementRequestedAt ? c.replacementRequestedAt.toISOString() : null,
  };
}

export const cardService = {
  async getOrCreate(account) {
    let card = await prisma.card.findUnique({
      where: { accountId: account.id },
      include: { account: true },
    });

    if (!card) {
      const now = new Date();
      const expiryYear = now.getFullYear() + 4;
      const expiryMonth = now.getMonth() + 1;

      card = await prisma.card.create({
        data: {
          accountId: account.id,
          network: 'VISA',
          expiryMonth,
          expiryYear,
          frozen: false,
          contactlessEnabled: true,
          onlineEnabled: true,
          dailyLimit: 25000.0,
        },
        include: { account: true },
      });
    }

    return card;
  },

  async mine(owner) {
    const ownedAccounts = await prisma.account.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
    });

    const cards = await Promise.all(
      ownedAccounts.map((acct) => this.getOrCreate(acct))
    );

    return cards.map((c) => toCardResponse(c));
  },

  async getOrCreateOwned(owner, accountNumber) {
    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound('Account not found');
    }
    if (acct.ownerId !== owner.id) {
      throw ApiException.forbidden("You don't own this account");
    }
    return this.getOrCreate(acct);
  },

  async update(owner, accountNumber, { frozen, contactlessEnabled, onlineEnabled }) {
    const card = await this.getOrCreateOwned(owner, accountNumber);

    const updateData = {};
    if (frozen !== undefined) updateData.frozen = Boolean(frozen);
    if (contactlessEnabled !== undefined) updateData.contactlessEnabled = Boolean(contactlessEnabled);
    if (onlineEnabled !== undefined) updateData.onlineEnabled = Boolean(onlineEnabled);

    const updated = await prisma.card.update({
      where: { id: card.id },
      data: updateData,
      include: { account: true },
    });

    return toCardResponse(updated);
  },

  async requestReplacement(owner, accountNumber) {
    const card = await this.getOrCreateOwned(owner, accountNumber);

    const updated = await prisma.card.update({
      where: { id: card.id },
      data: { replacementRequestedAt: new Date() },
      include: { account: true },
    });

    return toCardResponse(updated);
  },
};

export default cardService;
