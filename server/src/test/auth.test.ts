import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setupTestDB } from './setup';
import { User } from '../models/User';
import { authRouter } from '../routes/auth.routes';
import { config } from '../config/env';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API (POST /api/auth/login & Token Verification)', () => {
  setupTestDB();

  const rawPassword = 'SecurePassword123!';
  let seededUser: any;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    seededUser = await User.create({
      id: 'user-admin-1',
      name: 'Sarah Chen',
      email: 'sarah.chen@enterprise.com',
      passwordHash,
      role: 'Admin',
      department: 'Finance Operations',
      avatarUrl: 'https://images.unsplash.com/sarah.jpg',
    });
  });

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
    expect(user.id).toBe(seededUser.id);
    expect(user.name).toBe('Sarah Chen');
    expect(user.email).toBe('sarah.chen@enterprise.com');
    expect(user.role).toBe('Admin');
    expect(user.department).toBe('Finance Operations');
    expect(user.avatarUrl).toBe('https://images.unsplash.com/sarah.jpg');
    expect(user.passwordHash).toBeUndefined();

    // Verify token can be decoded
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    expect(decoded.id).toBe(seededUser.id);
    expect(decoded.email).toBe('sarah.chen@enterprise.com');
    expect(decoded.role).toBe('Admin');
    expect(decoded.name).toBe('Sarah Chen');
  });

  it('is case-insensitive for email lookup', async () => {
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
  });

  it('allows access to GET /api/auth/me with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.chen@enterprise.com',
        password: rawPassword,
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('sarah.chen@enterprise.com');
    expect(meRes.body.user.id).toBe(seededUser.id);
  });

  it('denies access to GET /api/auth/me without token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('denies access to GET /api/auth/me with malformed or invalid token (401)', async () => {
    const resMalformed = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidToken');
    expect(resMalformed.status).toBe(401);

    const resBadToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(resBadToken.status).toBe(401);
  });
});
