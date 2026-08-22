import { jest, describe, test, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import prisma from '../config/prisma.js';

describe('Swiss Bank API Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('unauthenticated access is rejected with 401', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  test('register, login, and openAccount', async () => {
    const email = `testuser_${Date.now()}@bank.app`;
    
    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Integration Tester',
        email,
        password: 'password123',
        phone: '9876500000',
        dateOfBirth: '1995-05-15',
        panNumber: 'ABCDE1234F',
        address: '1 Swiss Way, Zurich',
      });
    expect(regRes.status).toBe(201);
    expect(regRes.body.email).toBe(email);

    // Login
    const userAgent = request.agent(app);
    const loginRes = await userAgent
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(email);

    // Open Account
    const openRes = await userAgent
      .post('/api/accounts')
      .send({
        holderName: 'Integration Tester',
        openingBalance: '1000.00',
        pin: '4321',
      });
    expect(openRes.status).toBe(201);
    expect(openRes.body.accountNumber).toBeDefined();
    expect(openRes.body.balance).toBe(1000.0);

    // List Accounts
    const listRes = await userAgent.get('/api/accounts');
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    const createdAcct = listRes.body.find((a) => a.accountNumber === openRes.body.accountNumber);
    expect(createdAcct).toBeDefined();
    expect(createdAcct.balance).toBe(1000.0);
  }, 30000);

  test('transfer moves money and writes double-entry ledger', async () => {
    const email = `transfer_${Date.now()}@bank.app`;
    const userAgent = request.agent(app);

    await userAgent.post('/api/auth/register').send({
      fullName: 'Transfer Tester',
      email,
      password: 'password123',
      phone: '9876511111',
      dateOfBirth: '1994-01-01',
      panNumber: 'TRANS1234F',
      address: 'Zurich Test',
    });

    await userAgent.post('/api/auth/login').send({ email, password: 'password123' });

    const acct1 = await userAgent.post('/api/accounts').send({
      holderName: 'Account One',
      openingBalance: '1000.00',
      pin: '1111',
    });
    const acct2 = await userAgent.post('/api/accounts').send({
      holderName: 'Account Two',
      openingBalance: '0.00',
      pin: '2222',
    });

    const fromNum = acct1.body.accountNumber;
    const toNum = acct2.body.accountNumber;

    // Execute transfer of 250
    const transferRes = await userAgent.post('/api/accounts/transfer').send({
      fromAccountNumber: fromNum,
      toAccountNumber: toNum,
      amount: '250.00',
      pin: '1111',
    });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.balance).toBe(750.0);

    // Check recipient balance
    const toRes = await userAgent.get(`/api/accounts/${toNum}`);
    expect(toRes.status).toBe(200);
    expect(toRes.body.balance).toBe(250.0);

    // Check sender ledger history
    const historyRes = await userAgent.get(`/api/accounts/${fromNum}/history`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.content[0].type).toBe('DEBIT');
    expect(historyRes.body.content[0].amount).toBe(250.0);
  }, 30000);

  test('transfer with insufficient balance is rejected with 400', async () => {
    const email = `nobal_${Date.now()}@bank.app`;
    const userAgent = request.agent(app);

    await userAgent.post('/api/auth/register').send({
      fullName: 'No Balance User',
      email,
      password: 'password123',
      dateOfBirth: '1990-01-01',
    });
    await userAgent.post('/api/auth/login').send({ email, password: 'password123' });

    const acct1 = await userAgent.post('/api/accounts').send({
      holderName: 'User A',
      openingBalance: '100.00',
      pin: '1111',
    });
    const acct2 = await userAgent.post('/api/accounts').send({
      holderName: 'User B',
      openingBalance: '0.00',
      pin: '2222',
    });

    const res = await userAgent.post('/api/accounts/transfer').send({
      fromAccountNumber: acct1.body.accountNumber,
      toAccountNumber: acct2.body.accountNumber,
      amount: '500.00',
      pin: '1111',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient balance');
  }, 30000);

  test('wrong PIN is rejected with 403', async () => {
    const email = `wrongpin_${Date.now()}@bank.app`;
    const userAgent = request.agent(app);

    await userAgent.post('/api/auth/register').send({
      fullName: 'Wrong PIN User',
      email,
      password: 'password123',
      dateOfBirth: '1990-01-01',
    });
    await userAgent.post('/api/auth/login').send({ email, password: 'password123' });

    const acct = await userAgent.post('/api/accounts').send({
      holderName: 'User Acct',
      openingBalance: '100.00',
      pin: '1111',
    });

    const res = await userAgent.post('/api/accounts/debit').send({
      accountNumber: acct.body.accountNumber,
      amount: '10.00',
      pin: '9999',
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Invalid security PIN');
  }, 30000);

  test('cannot access another user account', async () => {
    const ownerAgent = request.agent(app);
    const attackerAgent = request.agent(app);

    const ownerEmail = `owner_${Date.now()}@bank.app`;
    const attackerEmail = `attacker_${Date.now()}@bank.app`;

    await ownerAgent.post('/api/auth/register').send({
      fullName: 'Real Owner',
      email: ownerEmail,
      password: 'password123',
      dateOfBirth: '1990-01-01',
    });
    await ownerAgent.post('/api/auth/login').send({ email: ownerEmail, password: 'password123' });

    const ownerAcct = await ownerAgent.post('/api/accounts').send({
      holderName: 'Owner Account',
      openingBalance: '500.00',
      pin: '1111',
    });

    await attackerAgent.post('/api/auth/register').send({
      fullName: 'Attacker User',
      email: attackerEmail,
      password: 'password123',
      dateOfBirth: '1990-01-01',
    });
    await attackerAgent.post('/api/auth/login').send({ email: attackerEmail, password: 'password123' });

    const res = await attackerAgent.get(`/api/accounts/${ownerAcct.body.accountNumber}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You don't own this account");
  }, 30000);
});
