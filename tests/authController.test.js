const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Auth Controller', () => {
  const testEmail = 'testuser@example.com';
  const testPassword = 'TestPassword123';

  // Clean up test user before and after tests
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered');
      expect(res.body.user).toHaveProperty('email', testEmail);
    });

    it('should not register an existing user', async () => {
      // Register once
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: testPassword });

      // Try to register again
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'User already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user', async () => {
      // Ensure user exists
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: testPassword });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.result).toHaveProperty('token');
    });

    it('should not login with wrong credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
});