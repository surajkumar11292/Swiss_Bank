import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma.js';
import userService from '../services/userService.js';
import accountService from '../services/accountService.js';
import beneficiaryService from '../services/beneficiaryService.js';
import billPayService from '../services/billPayService.js';
import supportService from '../services/supportService.js';

async function main() {
  console.log('🌱 Starting Swiss Bank data seeder...');

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already has users. Skipping seed.');
    return;
  }

  // 1. Create Demo User
  console.log('Creating demo user: demo@bank.app...');
  const demo = await userService.register({
    fullName: 'Demo User',
    email: 'demo@bank.app',
    password: 'demo12345',
    phone: '9876543210',
    dateOfBirth: '1996-04-12',
    panNumber: 'ABCDE1234F',
    address: 'Bahnhofstrasse 45, 8001 Zurich, Switzerland',
  });

  const primary = await accountService.open(demo, {
    holderName: 'Demo User',
    openingBalance: 50000.0,
    pin: '1234',
  });

  await accountService.open(demo, {
    holderName: 'Demo Savings',
    openingBalance: 12500.0,
    pin: '1234',
  });

  // 2. Create Second User (Priya Shah)
  console.log('Creating second user: priya@example.com...');
  const other = await userService.register({
    fullName: 'Priya Shah',
    email: 'priya@example.com',
    password: 'password123',
    phone: '9123456780',
    dateOfBirth: '1998-09-03',
    panNumber: 'PQRSX5678K',
    address: '44 Alpine Way, Geneva, Switzerland',
  });

  const otherAccount = await accountService.open(other, {
    holderName: 'Priya Shah',
    openingBalance: 8000.0,
    pin: '5678',
  });

  // 3. Add Beneficiary to Demo
  console.log('Adding saved beneficiary for demo user...');
  await beneficiaryService.add(demo, {
    name: 'Priya Shah',
    accountNumber: otherAccount.accountNumber,
    nickname: 'Priya',
  });

  // 4. Create initial bill payment
  console.log('Creating seeded bill payment...');
  await billPayService.pay(demo, {
    accountNumber: primary.accountNumber,
    category: 'Electricity',
    consumer: 'SIG Geneva · 4471029',
    amount: 1180.0,
    pin: '1234',
  });

  // 5. Create initial support ticket
  console.log('Creating seeded support ticket...');
  await supportService.raise(demo, {
    subject: 'Question about international transfers',
    message: 'Hi, does Swiss Bank support instant transfers to European SEPA accounts? Thanks!',
  });

  // 6. Create Admin User
  console.log('Creating bank admin: admin@bank.app...');
  const admin = await userService.register({
    fullName: 'Bank Admin',
    email: 'admin@bank.app',
    password: 'admin12345',
    phone: '9988776655',
    dateOfBirth: '1990-01-20',
    panNumber: 'ADMIN1234Z',
    address: 'Swiss Bank HQ, Paradeplatz 8, 8001 Zurich',
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { role: 'ADMIN' },
  });

  console.log('✅ Swiss Bank Database successfully seeded with demo and admin accounts!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
