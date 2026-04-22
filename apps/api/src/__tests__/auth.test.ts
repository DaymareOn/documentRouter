import request from 'supertest';
import { app } from '../app';

jest.mock('../db/pool', () => {
  const mockQuery = jest.fn();
  const mockPool = { query: mockQuery, on: jest.fn() };
  return {
    getPool: jest.fn(() => mockPool),
    closePool: jest.fn(),
    __mockQuery: mockQuery,
  };
});

const getMockQuery = () => {
  const mod = jest.requireMock('../db/pool') as { __mockQuery: jest.Mock };
  return mod.__mockQuery;
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    getMockQuery().mockReset();
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already exists', async () => {
    getMockQuery()
      // First call: check existing user
      .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Email already registered');
  });

  it('returns 201 with tokens on successful registration', async () => {
    getMockQuery()
      // check existing user
      .mockResolvedValueOnce({ rows: [] })
      // insert tenant
      .mockResolvedValueOnce({
        rows: [{ id: 'tenant-id', name: "Test User's Workspace", slug: 'test-abc123', plan: 'free', settings: {} }],
      })
      // insert user
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          tenant_id: 'tenant-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          totp_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      })
      // insert refresh token
      .mockResolvedValueOnce({ rows: [] })
      // audit log
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('tokens');
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    getMockQuery().mockReset();
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for unknown email', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for wrong password', async () => {
    getMockQuery().mockResolvedValueOnce({
      rows: [{
        id: 'user-id',
        tenant_id: 'tenant-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        totp_enabled: false,
        totp_secret: null,
        // bcrypt hash of 'CorrectPassword!'
        password_hash: '$2b$12$invalidhashfortest00000000000000000000000000000000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
