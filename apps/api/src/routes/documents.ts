import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validate, documentUploadSchema } from '@vibe-router/shared-utils';
import { ApiResponse } from '@vibe-router/shared-types';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  listDocuments,
  createDocument,
  getDocumentById,
  softDeleteDocument,
  updateDocumentStatus,
  updateDocumentS3Key,
} from '../services/documentService';
import { logAuditEvent } from '../services/auditService';

export const documentsRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

documentsRouter.use(authenticate);

// GET /api/documents
documentsRouter.get('/', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const page = parseInt(req.query['page'] as string || '1', 10);
  const pageSize = Math.min(parseInt(req.query['pageSize'] as string || '20', 10), 100);
  const status = req.query['status'] as string | undefined;
  const search = req.query['search'] as string | undefined;

  const { items, total } = await listDocuments({
    tenantId: req.user!.tenantId,
    page,
    pageSize,
    status: status as Parameters<typeof listDocuments>[0]['status'],
    search,
  });

  res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// POST /api/documents
documentsRouter.post('/', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const validation = validate(documentUploadSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const doc = await createDocument(req.user!.tenantId, req.user!.id, validation.data);

  const presignedUrl = `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.S3_BUCKET || 'documents'}/${encodeURIComponent(doc.id)}/${encodeURIComponent(doc.filename)}`;

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'document.created',
    resourceType: 'document',
    resourceId: doc.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: { document: doc, uploadUrl: presignedUrl } });
});

// POST /api/documents/upload (multipart)
documentsRouter.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const mimeType = req.file.mimetype || 'application/octet-stream';
  const s3Key = `uploads/${req.user!.tenantId}/${req.file.filename}`;
  const s3Bucket = process.env.S3_BUCKET || 'documents';

  const doc = await createDocument(req.user!.tenantId, req.user!.id, {
    filename: req.file.originalname,
    mimeType,
    size: req.file.size,
    source: 'upload',
    tags: req.body['tags'] ? (req.body['tags'] as string).split(',').map((t: string) => t.trim()) : [],
    s3Key,
    s3Bucket,
  });

  const updated = await updateDocumentS3Key(doc.id, req.user!.tenantId, s3Key, s3Bucket);

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'document.uploaded',
    resourceType: 'document',
    resourceId: doc.id,
    details: { filename: req.file.originalname, size: req.file.size },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: updated ?? doc });
});

// GET /api/documents/:id
documentsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const doc = await getDocumentById(req.params['id']!, req.user!.tenantId);
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }
  res.json({ success: true, data: doc });
});

// DELETE /api/documents/:id
documentsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const deleted = await softDeleteDocument(req.params['id']!, req.user!.tenantId);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'document.deleted',
    resourceType: 'document',
    resourceId: req.params['id'],
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Document deleted' });
});

// POST /api/documents/:id/process
documentsRouter.post('/:id/process', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const doc = await getDocumentById(req.params['id']!, req.user!.tenantId);
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  await updateDocumentStatus(doc.id, req.user!.tenantId, 'processing');

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'document.process_triggered',
    resourceType: 'document',
    resourceId: doc.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'OCR processing triggered', data: { documentId: doc.id, status: 'processing' } });
});

// GET /api/documents/:id/download
documentsRouter.get('/:id/download', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const doc = await getDocumentById(req.params['id']!, req.user!.tenantId);
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  // In production this should be a real presigned URL from an S3 client; the timestamp here is for cache-busting only.
  const downloadUrl = `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${doc.s3Bucket}/${doc.s3Key}?cb=${Date.now()}`;

  res.json({ success: true, data: { downloadUrl, expiresIn: 3600 } });
});
