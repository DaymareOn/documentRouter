import { Document, DocumentMetadata, DocumentStatus, DocumentUploadRequest } from '@vibe-router/shared-types';
import { getPool } from '../db/pool';

function rowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    filename: row.filename as string,
    mimeType: row.mime_type as string,
    size: Number(row.size),
    status: row.status as DocumentStatus,
    source: row.source as Document['source'],
    s3Key: row.s3_key as string,
    s3Bucket: row.s3_bucket as string,
    ocrText: row.ocr_text as string | undefined,
    metadata: (row.metadata as DocumentMetadata) ?? { keywords: [], isEncrypted: false },
    tags: (row.tags as string[]) ?? [],
    version: Number(row.version),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export interface ListDocumentsOptions {
  tenantId: string;
  page?: number;
  pageSize?: number;
  status?: DocumentStatus;
  search?: string;
}

export async function listDocuments(options: ListDocumentsOptions): Promise<{ items: Document[]; total: number }> {
  const pool = getPool();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
  const params: unknown[] = [options.tenantId];
  let paramIdx = 2;

  if (options.status) {
    conditions.push(`d.status = $${paramIdx++}`);
    params.push(options.status);
  }
  if (options.search) {
    conditions.push(`(d.filename ILIKE $${paramIdx} OR d.ocr_text ILIKE $${paramIdx})`);
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM documents d WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM documents d WHERE ${whereClause} ORDER BY d.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, pageSize, offset]
  );

  return { items: dataResult.rows.map(rowToDocument), total };
}

export async function createDocument(
  tenantId: string,
  userId: string,
  input: DocumentUploadRequest & { s3Key?: string; s3Bucket?: string }
): Promise<Document> {
  const pool = getPool();
  const s3Key = input.s3Key ?? '';
  const s3Bucket = input.s3Bucket ?? process.env.S3_BUCKET ?? 'documents';
  const metadata: DocumentMetadata = { keywords: [], isEncrypted: false };

  const { rows } = await pool.query(
    `INSERT INTO documents
       (tenant_id, user_id, filename, mime_type, size, status, source, s3_key, s3_bucket, metadata, tags)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      tenantId,
      userId,
      input.filename,
      input.mimeType,
      input.size,
      input.source,
      s3Key,
      s3Bucket,
      JSON.stringify(metadata),
      input.tags ?? [],
    ]
  );

  return rowToDocument(rows[0]);
}

export async function getDocumentById(id: string, tenantId: string): Promise<Document | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}

export async function softDeleteDocument(id: string, tenantId: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'UPDATE documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateDocumentStatus(
  id: string,
  tenantId: string,
  status: DocumentStatus,
  ocrText?: string
): Promise<Document | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE documents
     SET status = $3, ocr_text = COALESCE($4, ocr_text), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, tenantId, status, ocrText ?? null]
  );
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}

export async function updateDocumentS3Key(
  id: string,
  tenantId: string,
  s3Key: string,
  s3Bucket: string
): Promise<Document | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE documents
     SET s3_key = $3, s3_bucket = $4, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, tenantId, s3Key, s3Bucket]
  );
  return rows.length > 0 ? rowToDocument(rows[0]) : null;
}
