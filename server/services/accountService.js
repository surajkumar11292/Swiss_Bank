import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';
import totpService from './totpService.js';

const HIGH_VALUE_THRESHOLD = 50000;

function newReference() {
  return 'TXN-' + crypto.randomUUID().substring(0, 8).toUpperCase();
}

async function generateUniqueAccountNumber() {
  while (true) {
    const num = Math.floor(10000000 + Math.random() * 90000000);
    const exists = await prisma.account.findUnique({
      where: { accountNumber: BigInt(num) },
    });
    if (!exists) {
      return BigInt(num);
    }
  }
}

export function toAccountResponse(account) {
  return {
    id: account.id,
    accountNumber: Number(account.accountNumber),
    holderName: account.holderName,
    balance: Number(account.balance),
    frozen: account.frozen,
    createdAt: account.createdAt ? account.createdAt.toISOString() : null,
  };
}

export function toLedgerEntryResponse(entry) {
  return {
    id: entry.id,
    type: entry.type,
    amount: Number(entry.amount),
    balanceAfter: Number(entry.balanceAfter),
    description: entry.description,
    reference: entry.reference,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
  };
}

export const accountService = {
  async myAccounts(owner) {
    const list = await prisma.account.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toAccountResponse);
  },

  async getOwnedAccount(owner, accountNumber) {
    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound('Account not found');
    }
    if (acct.ownerId !== owner.id) {
      throw ApiException.forbidden("You don't own this account");
    }
    return toAccountResponse(acct);
  },

  async history(owner, accountNumber, page = 0, size = 10) {
    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound('Account not found');
    }
    if (acct.ownerId !== owner.id) {
      throw ApiException.forbidden("You don't own this account");
    }

    const take = Math.min(Number(size) || 10, 100);
    const skip = (Number(page) || 0) * take;

    const [totalElements, entries] = await Promise.all([
      prisma.ledgerEntry.count({ where: { accountId: acct.id } }),
      prisma.ledgerEntry.findMany({
        where: { accountId: acct.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(totalElements / take) || (totalElements === 0 ? 0 : 1);
    const pageNum = Number(page) || 0;

    return {
      content: entries.map(toLedgerEntryResponse),
      page: pageNum,
      size: take,
      totalElements,
      totalPages,
      first: pageNum === 0,
      last: pageNum >= totalPages - 1 || totalPages === 0,
    };
  },

  async fullHistory(owner, accountNumber) {
    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound('Account not found');
    }
    if (acct.ownerId !== owner.id) {
      throw ApiException.forbidden("You don't own this account");
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: acct.id },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map(toLedgerEntryResponse);
  },

  async open(owner, { holderName, openingBalance = 0, pin }) {
    if (!pin || pin.length < 4 || pin.length > 6) {
      throw ApiException.badRequest('Security PIN must be 4 to 6 digits');
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const accountNumber = await generateUniqueAccountNumber();
    const balanceNum = Number(openingBalance) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          accountNumber,
          ownerId: owner.id,
          holderName: holderName.trim(),
          balance: balanceNum,
          pinHash,
        },
      });

      if (balanceNum > 0) {
        await tx.ledgerEntry.create({
          data: {
            accountId: created.id,
            type: 'CREDIT',
            amount: balanceNum,
            balanceAfter: balanceNum,
            description: 'Opening deposit',
            reference: newReference(),
          },
        });
      }

      return created;
    });

    return toAccountResponse(result);
  },

  async credit(owner, { accountNumber, amount, pin }) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw ApiException.badRequest('Amount must be positive');
    }

    const result = await prisma.$transaction(async (tx) => {
      const acct = await tx.account.findUnique({
        where: { accountNumber: BigInt(accountNumber) },
      });
      if (!acct) {
        throw ApiException.notFound('Account not found');
      }
      if (acct.ownerId !== owner.id) {
        throw ApiException.forbidden("You don't own this account");
      }
      if (acct.frozen) {
        throw ApiException.forbidden(`Account #${accountNumber} is frozen — contact support`);
      }

      const matches = await bcrypt.compare(pin, acct.pinHash);
      if (!matches) {
        throw ApiException.forbidden('Invalid security PIN');
      }

      const updatedBalance = Number(acct.balance) + numAmount;

      const updated = await tx.account.update({
        where: { id: acct.id },
        data: { balance: updatedBalance },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: acct.id,
          type: 'CREDIT',
          amount: numAmount,
          balanceAfter: updatedBalance,
          description: 'Cash deposit',
          reference: newReference(),
        },
      });

      return updated;
    });

    return toAccountResponse(result);
  },

  async debit(owner, { accountNumber, amount, pin }) {
    const { account } = await this.debitInternal(owner, accountNumber, amount, pin, 'Cash withdrawal');
    return account;
  },

  async debitInternal(owner, accountNumber, amount, pin, description) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw ApiException.badRequest('Amount must be positive');
    }

    const ref = newReference();

    const result = await prisma.$transaction(async (tx) => {
      const acct = await tx.account.findUnique({
        where: { accountNumber: BigInt(accountNumber) },
      });
      if (!acct) {
        throw ApiException.notFound('Account not found');
      }
      if (acct.ownerId !== owner.id) {
        throw ApiException.forbidden("You don't own this account");
      }
      if (acct.frozen) {
        throw ApiException.forbidden(`Account #${accountNumber} is frozen — contact support`);
      }

      const matches = await bcrypt.compare(pin, acct.pinHash);
      if (!matches) {
        throw ApiException.forbidden('Invalid security PIN');
      }

      const currentBalance = Number(acct.balance);
      if (currentBalance < numAmount) {
        throw ApiException.badRequest('Insufficient balance');
      }

      const updatedBalance = currentBalance - numAmount;

      const updated = await tx.account.update({
        where: { id: acct.id },
        data: { balance: updatedBalance },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: acct.id,
          type: 'DEBIT',
          amount: numAmount,
          balanceAfter: updatedBalance,
          description,
          reference: ref,
        },
      });

      return updated;
    });

    return {
      account: toAccountResponse(result),
      reference: ref,
    };
  },

  async transfer(owner, { fromAccountNumber, toAccountNumber, amount, pin, totpCode }) {
    const fromNum = BigInt(fromAccountNumber);
    const toNum = BigInt(toAccountNumber);
    const numAmount = Number(amount);

    if (fromNum === toNum) {
      throw ApiException.badRequest('Cannot transfer to the same account');
    }
    if (!numAmount || numAmount <= 0) {
      throw ApiException.badRequest('Transfer amount must be positive');
    }

    // High value transfer check (>= 50,000)
    if (owner.totpEnabled && numAmount >= HIGH_VALUE_THRESHOLD) {
      if (!totpCode || totpCode.trim() === '') {
        throw ApiException.totpRequired(`This transfer is above ₹${HIGH_VALUE_THRESHOLD.toLocaleString('en-IN')} — enter your 2FA code to confirm`);
      }
      if (!totpService.verify(owner.totpSecret, totpCode.trim())) {
        throw ApiException.totpInvalid('Incorrect 2FA code');
      }
    }

    const ref = newReference();

    const result = await prisma.$transaction(async (tx) => {
      const fromAcct = await tx.account.findUnique({ where: { accountNumber: fromNum } });
      const toAcct = await tx.account.findUnique({ where: { accountNumber: toNum } });

      if (!fromAcct) {
        throw ApiException.notFound(`Account #${fromAccountNumber} not found`);
      }
      if (!toAcct) {
        throw ApiException.notFound(`Account #${toAccountNumber} not found`);
      }

      if (fromAcct.ownerId !== owner.id) {
        throw ApiException.forbidden("You don't own the source account");
      }
      if (fromAcct.frozen) {
        throw ApiException.forbidden(`Account #${fromAccountNumber} is frozen — contact support`);
      }
      if (toAcct.frozen) {
        throw ApiException.forbidden(`Recipient Account #${toAccountNumber} is frozen — contact support`);
      }

      const matches = await bcrypt.compare(pin, fromAcct.pinHash);
      if (!matches) {
        throw ApiException.forbidden('Invalid security PIN');
      }

      const fromBalance = Number(fromAcct.balance);
      if (fromBalance < numAmount) {
        throw ApiException.badRequest('Insufficient balance');
      }

      const updatedFromBalance = fromBalance - numAmount;
      const updatedToBalance = Number(toAcct.balance) + numAmount;

      const updatedFrom = await tx.account.update({
        where: { id: fromAcct.id },
        data: { balance: updatedFromBalance },
      });

      await tx.account.update({
        where: { id: toAcct.id },
        data: { balance: updatedToBalance },
      });

      // Write two ledger entries (Double-entry) under same reference
      await tx.ledgerEntry.create({
        data: {
          accountId: fromAcct.id,
          type: 'DEBIT',
          amount: numAmount,
          balanceAfter: updatedFromBalance,
          description: `Transfer to #${toAcct.accountNumber}`,
          reference: ref,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: toAcct.id,
          type: 'CREDIT',
          amount: numAmount,
          balanceAfter: updatedToBalance,
          description: `Transfer from #${fromAcct.accountNumber}`,
          reference: ref,
        },
      });

      return updatedFrom;
    });

    return toAccountResponse(result);
  },

  async setFrozen(accountNumber, frozen) {
    const acct = await prisma.account.findUnique({
      where: { accountNumber: BigInt(accountNumber) },
    });
    if (!acct) {
      throw ApiException.notFound(`Account #${accountNumber} not found`);
    }
    return prisma.account.update({
      where: { id: acct.id },
      data: { frozen: Boolean(frozen) },
    });
  },
};

export default accountService;
