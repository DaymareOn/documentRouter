import request from 'supertest';
import { app } from '../app';

describe('GET /api/health', () => {
  it('returns 200 or 503', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });
});
