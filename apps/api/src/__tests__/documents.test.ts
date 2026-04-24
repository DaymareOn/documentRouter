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

const MOCK_DOC_ROW = {
  id: 'doc-id',
  tenant_id: 'tenant-id',
  user_id: 'user-id',
  filename: 'test.pdf',
  mime_type: 'application/pdf',
  size: 1024,
  status: 'pending',
  source: 'upload',
  s3_key: 'uploads/tenant-id/test.pdf',
  s3_bucket: 'documents',
  ocr_text: null,
  metadata: { keywords: [], isEncrypted: false },
  tags: [],
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('GET /api/documents', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns paginated document list', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [MOCK_DOC_ROW, { ...MOCK_DOC_ROW, id: 'doc-id-2' }] });

    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
  });

  it('returns empty list when no documents', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });
});

describe('POST /api/documents', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', AUTH_HEADER())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a document and returns 201', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [MOCK_DOC_ROW] }) // createDocument
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', AUTH_HEADER())
      .send({ filename: 'test.pdf', mimeType: 'application/pdf', size: 1024, source: 'upload' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('uploadUrl');
  });
});

describe('GET /api/documents/:id', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when document not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/documents/nonexistent')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns document when found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [MOCK_DOC_ROW] });

    const res = await request(app)
      .get('/api/documents/doc-id')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('doc-id');
  });
});

describe('DELETE /api/documents/:id', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when document not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .delete('/api/documents/nonexistent')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('soft-deletes document and returns success', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rowCount: 1 }) // softDeleteDocument
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .delete('/api/documents/doc-id')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/documents/:id/process', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when document not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/documents/nonexistent/process')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('triggers processing and returns success', async () => {
    getMockQuery()
      .mockResolvedValueOnce({ rows: [MOCK_DOC_ROW] }) // getDocumentById
      .mockResolvedValueOnce({ rows: [{ ...MOCK_DOC_ROW, status: 'processing' }] }) // updateDocumentStatus
      .mockResolvedValueOnce({ rows: [] }); // logAuditEvent

    const res = await request(app)
      .post('/api/documents/doc-id/process')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('processing');
  });
});

describe('GET /api/documents/:id/download', () => {
  beforeEach(() => getMockQuery().mockReset());

  it('returns 404 when document not found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/documents/nonexistent/download')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns download URL when document found', async () => {
    getMockQuery().mockResolvedValueOnce({ rows: [MOCK_DOC_ROW] });

    const res = await request(app)
      .get('/api/documents/doc-id/download')
      .set('Authorization', AUTH_HEADER());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('downloadUrl');
    expect(res.body.data).toHaveProperty('expiresIn');
  });
});
