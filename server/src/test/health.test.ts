import request from 'supertest';
import { app } from '../app';
import { setupTestDB } from './setup';

describe('Health Check & App Foundation', () => {
  setupTestDB();

  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
