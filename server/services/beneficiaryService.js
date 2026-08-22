import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';

export function toBeneficiaryResponse(b) {
  return {
    id: b.id,
    name: b.name,
    accountNumber: Number(b.accountNumber),
    nickname: b.nickname,
    createdAt: b.createdAt ? b.createdAt.toISOString() : null,
  };
}

export const beneficiaryService = {
  async mine(owner) {
    const list = await prisma.beneficiary.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toBeneficiaryResponse);
  },

  async add(owner, { name, accountNumber, nickname }) {
    if (!name || !accountNumber) {
      throw ApiException.badRequest('Name and account number are required');
    }

    const created = await prisma.beneficiary.create({
      data: {
        ownerId: owner.id,
        name: name.trim(),
        accountNumber: BigInt(accountNumber),
        nickname: nickname ? nickname.trim() : null,
      },
    });

    return toBeneficiaryResponse(created);
  },

  async remove(owner, id) {
    const benef = await prisma.beneficiary.findUnique({
      where: { id: Number(id) },
    });
    if (!benef) {
      throw ApiException.notFound('Beneficiary not found');
    }
    if (benef.ownerId !== owner.id) {
      throw ApiException.forbidden("You don't own this beneficiary");
    }

    await prisma.beneficiary.delete({
      where: { id: Number(id) },
    });
  },
};

export default beneficiaryService;
