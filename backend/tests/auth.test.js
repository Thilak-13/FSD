const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../src/config/db');
const { JWT_SECRET } = require('../src/config/env');
const User = require('../src/models/User');
const authRouter = require('../src/routes/auth.routes');
const { requireAuth } = require('../src/middleware/auth');
const { requireRole } = require('../src/middleware/roleGuard');

describe('Auth Integration Tests (POST /api/auth/login, requireAuth, roleGuard)', () => {
  let mongod;
  let app;
  const rawPassword = 'SecurePassword123!';
  let seededUser;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);

    // Setup dedicated Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    // Add test endpoints for auth middleware and role guard verification
    app.get('/api/test/protected', requireAuth, (req, res) => {
      res.status(200).json({ message: 'Success', user: req.user });
    });

    app.get(
      '/api/test/admin-only',
      requireAuth,
      requireRole('Admin'),
      (req, res) => {
        res.status(200).json({ message: 'Admin granted' });
      }
    );

    app.get(
      '/api/test/approver-or-admin',
      requireAuth,
      requireRole('Admin', 'Approver'),
      (req, res) => {
        res.status(200).json({ message: 'Authorized' });
      }
    );
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    seededUser = await User.create({
      name: 'Sarah Chen',
      email: 'sarah.chen@enterprise.com',
      passwordHash,
      role: 'Admin',
      department: 'Finance Operations',
      avatarUrl: 'https://images.unsplash.com/sarah.jpg',
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in successfully with valid email and password (happy path)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah.chen@enterprise.com',
          password: rawPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');

      const { user, token } = res.body;
      expect(user.id).toBe(seededUser.id || seededUser._id.toString());
      expect(user.name).toBe('Sarah Chen');
      expect(user.email).toBe('sarah.chen@enterprise.com');
      expect(user.role).toBe('Admin');
      expect(user.department).toBe('Finance Operations');
      expect(user.avatarUrl).toBe('https://images.unsplash.com/sarah.jpg');
      expect(user.passwordHash).toBeUndefined();

      // Verify token payload
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(seededUser.id || seededUser._id.toString());
      expect(decoded.email).toBe('sarah.chen@enterprise.com');
      expect(decoded.role).toBe('Admin');
      expect(decoded.name).toBe('Sarah Chen');
    });

    it('performs case-insensitive email lookup', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'SARAH.CHEN@ENTERPRISE.COM',
          password: rawPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('sarah.chen@enterprise.com');
    });

    it('rejects login with an invalid password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah.chen@enterprise.com',
          password: 'WrongPassword456!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
      expect(res.body.token).toBeUndefined();
    });

    it('rejects login with a non-existent email (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@enterprise.com',
          password: rawPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
      expect(res.body.token).toBeUndefined();
    });

    it('rejects login when email or password is missing (400)', async () => {
      const resNoEmail = await request(app)
        .post('/api/auth/login')
        .send({ password: rawPassword });
      expect(resNoEmail.status).toBe(400);
      expect(resNoEmail.body).toHaveProperty('error');

      const resNoPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah.chen@enterprise.com' });
      expect(resNoPassword.status).toBe(400);
      expect(resNoPassword.body).toHaveProperty('error');

      const resEmpty = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body).toHaveProperty('error');

      const resBlankString = await request(app)
        .post('/api/auth/login')
        .send({ email: '   ', password: '   ' });
      expect(resBlankString.status).toBe(400);
      expect(resBlankString.body).toHaveProperty('error');
    });
  });

  describe('requireAuth Middleware', () => {
    it('allows access to protected route with valid Bearer token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah.chen@enterprise.com',
          password: rawPassword,
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('sarah.chen@enterprise.com');
      expect(res.body.user.role).toBe('Admin');
    });

    it('denies access without Authorization header (401)', async () => {
      const res = await request(app).get('/api/test/protected');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('denies access with malformed header or invalid token (401)', async () => {
      const resMalformed = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'InvalidBearerToken');
      expect(resMalformed.status).toBe(401);

      const resBadToken = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(resBadToken.status).toBe(401);
    });
  });

  describe('requireRole Middleware', () => {
    it('allows access when user role matches allowed roles', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sarah.chen@enterprise.com',
          password: rawPassword,
        });

      const token = loginRes.body.token;

      const resAdmin = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${token}`);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.message).toBe('Admin granted');

      const resMulti = await request(app)
        .get('/api/test/approver-or-admin')
        .set('Authorization', `Bearer ${token}`);
      expect(resMulti.status).toBe(200);
      expect(resMulti.body.message).toBe('Authorized');
    });

    it('returns 403 Forbidden: Insufficient permissions when role does not match', async () => {
      // Create a Requester user
      const passwordHash = await bcrypt.hash('RequesterPass123!', 10);
      await User.create({
        name: 'Elena Rodriguez',
        email: 'elena@enterprise.com',
        passwordHash,
        role: 'Requester',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'elena@enterprise.com',
          password: 'RequesterPass123!',
        });

      const token = loginRes.body.token;

      const resAdmin = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(resAdmin.status).toBe(403);
      expect(resAdmin.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });

      const resApprover = await request(app)
        .get('/api/test/approver-or-admin')
        .set('Authorization', `Bearer ${token}`);

      expect(resApprover.status).toBe(403);
      expect(resApprover.body).toEqual({
        error: 'Forbidden: Insufficient permissions',
      });
    });
  });

  describe('GET /api/auth/users/:id (Malformed ID and Not Found validation)', () => {
    let adminToken;

    beforeEach(async () => {
      adminToken = jwt.sign(
        { id: seededUser._id.toString(), role: 'Admin', email: seededUser.email },
        JWT_SECRET
      );
    });

    it('retrieves user successfully with a valid user id (200)', async () => {
      const res = await request(app)
        .get(`/api/auth/users/${seededUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('sarah.chen@enterprise.com');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 404 and not 500 when id is malformed (invalid-id-123)', async () => {
      const res = await request(app)
        .get('/api/auth/users/invalid-id-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });

    it('returns 404 and not 500 when id is malformed non-hex string (nonexistent-id-0000000000000000)', async () => {
      const res = await request(app)
        .get('/api/auth/users/nonexistent-id-0000000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });

    it('returns 404 when id is a valid ObjectId format but user does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/auth/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });
  });
});
