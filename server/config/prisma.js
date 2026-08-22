import { PrismaClient } from '@prisma/client';

BigInt.prototype.toJSON = function () {
  return Number(this);
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
