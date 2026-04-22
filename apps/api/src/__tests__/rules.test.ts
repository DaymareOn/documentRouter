import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';

const TEST_SECRET = 'test-secret';
process.env.JWT_SECRET = TEST_SECRET;

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

function makeAuthToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    { sub: 'user-id', email: 'user@example.com', tenantId: 'tenant-id', role: 'admin', ...overrides },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

const AUTH_HEADER = () => `Bearer ${makeAuthToken()}`;

const CONDITION_ID = '11111111-1111-1111-1111-111111111111';
const ACTION_ID = '22222222-2222-2222-2222-222222222222';

const VALID_RULE_BODY = {
  name: 'Invoice Router',
  description: 'Routes invoices to accounting',
  isActive: true,
  priority: 10,
  logic: 'AND',
  conditions: [
    { id: CONDITION_ID, field: 'ocr_text', operator: 'contains', value: 'invoice' },
  ],
  actions: [
    { id: ACTION_ID, type: 'email', config: { to: 'accounting@example.com' } },
  ],
};

const MOCK_RULE_ROW = {
  id: 'rule-id',
  tenant_id: 'tenant-id',
  user_id: 'user-id',
  name: 'Invoice Router',
  description: 'Routes invoices to accounting',
  is_active: true,
  priority: 10,
  logic: 'AND',
  conditions: [{ id: CONDITION_ID, field: 'ocr_text', operator: 'contains', value: 'invoice' }],
  actions: [{ id: ACTION_ID, type: 'email', config: { to: 'accounting@example.com' } }],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('GET /api/rules', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/rules');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns empty list when no rules', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/rules')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns rules list', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] });

    const res = await request(app)
      .get('/api/rules')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Invoice Router');
  });
});

describe('POST /api/rules', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', AUTH_HEADER())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when conditions is empty', async () => {
    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', AUTH_HEADER())
      .send({ ...VALID_RULE_BODY, conditions: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when actions is empty', async () => {
    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', AUTH_HEADER())
      .send({ ...VALID_RULE_BODY, actions: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a rule and returns 201', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] }) // createRule
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .post('/api/rules')
      .set('Authorization', AUTH_HEADER())
      .send(VALID_RULE_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('rule-id');
    expect(res.body.data.name).toBe('Invoice Router');
  });
});

describe('GET /api/rules/:id', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when rule not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/rules/nonexistent')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns rule when found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] });

    const res = await request(app)
      .get('/api/rules/rule-id')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('rule-id');
  });
});

describe('PUT /api/rules/:id', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when rule not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/rules/nonexistent')
      .set('Authorization', AUTH_HEADER())
      .send({ name: 'Updated Rule' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('updates rule and returns updated data', async () => {
    const updatedRow = { ...MOCK_RULE_ROW, name: 'Updated Rule' };
    getMockQuery()
      .mockResolvedValueOnce({ rows: [updatedRow] }) // updateRule
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .put('/api/rules/rule-id')
      .set('Authorization', AUTH_HEADER())
      .send({ name: 'Updated Rule' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Rule');
  });
});

describe('DELETE /api/rules/:id', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when rule not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete('/api/rules/nonexistent')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('deletes rule and returns success', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rowCount: 1 }) // deleteRule
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .delete('/api/rules/rule-id')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/rules/:id/test', () => {
  beforeEach(() => getMockQuery().mockReset());

  const MOCK_DOC_ROW = {
    id: 'doc-id',
    tenant_id: 'tenant-id',
    user_id: 'user-id',
    filename: 'invoice.pdf',
    mime_type: 'application/pdf',
    size: 1024,
    status: 'pending',
    source: 'upload',
    s3_key: 'uploads/tenant-id/invoice.pdf',
    s3_bucket: 'documents',
    ocr_text: 'This is an invoice for $100.00',
    metadata: { keywords: ['invoice'], isEncrypted: false },
    tags: [],
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('returns 404 when rule not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/rules/nonexistent/test')
      .set('Authorization', AUTH_HEADER())
      .send({ documentId: 'doc-id' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when neither documentId nor document payload provided', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] });

    const res = await request(app)
      .post('/api/rules/rule-id/test')
      .set('Authorization', AUTH_HEADER())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('evaluates rule against document by ID and returns match result', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] }) // getRuleById
      .mockResolvedValueOnce({ rows: [MOCK_DOC_ROW] }); // getDocumentById

    const res = await request(app)
      .post('/api/rules/rule-id/test')
      .set('Authorization', AUTH_HEADER())
      .send({ documentId: 'doc-id' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matched');
    expect(res.body.data.ruleId).toBe('rule-id');
    expect(res.body.data.documentId).toBe('doc-id');
  });

  it('returns 404 when document not found by ID', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [MOCK_RULE_ROW] }) // getRuleById
      .mockResolvedValueOnce({ rows: [] }); // getDocumentById

    const res = await request(app)
      .post('/api/rules/rule-id/test')
      .set('Authorization', AUTH_HEADER())
      .send({ documentId: 'missing-doc' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
