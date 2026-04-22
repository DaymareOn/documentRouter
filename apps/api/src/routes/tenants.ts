import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '@vibe-router/shared-utils';
import { ApiResponse } from '@vibe-router/shared-types';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../db/pool';
import { logAuditEvent } from '../services/auditService';

export const tenantsRouter = Router();

tenantsRouter.use(authenticate);

// GET /api/tenants/current
tenantsRouter.get('/current', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM tenants WHERE id = $1', [req.user!.tenantId]);
  if (rows.length === 0) {
    res.status(404).json({ success: false, error: 'Tenant not found' });
    return;
  }

  const row = rows[0];
  res.json({
    success: true,
    data: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

const tenantUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z
    .object({
      maxDocuments: z.number().int().positive().optional(),
      maxStorageBytes: z.number().int().positive().optional(),
      allowedMimeTypes: z.array(z.string()).optional(),
      ocrProvider: z.enum(['tesseract', 'google_vision', 'aws_textract', 'auto']).optional(),
      encryptionEnabled: z.boolean().optional(),
      retentionDays: z.number().int().positive().optional(),
    })
    .optional(),
});

// PUT /api/tenants/current
tenantsRouter.put('/current', requireRole('admin'), async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const validation = validate(tenantUpdateSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const pool = getPool();
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [req.user!.tenantId];
  let paramIdx = 2;

  if (validation.data.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    params.push(validation.data.name);
  }
  if (validation.data.settings !== undefined) {
    setClauses.push(`settings = settings || $${paramIdx++}`);
    params.push(JSON.stringify(validation.data.settings));
  }

  if (setClauses.length === 1) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  const { rows } = await pool.query(
    `UPDATE tenants SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  if (rows.length === 0) {
    res.status(404).json({ success: false, error: 'Tenant not found' });
    return;
  }

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'tenant.updated',
    resourceType: 'tenant',
    resourceId: req.user!.tenantId,
    details: validation.data as Record<string, unknown>,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const row = rows[0];
  res.json({
    success: true,
    data: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
});

// GET /api/tenants/current/users
tenantsRouter.get('/current/users', requireRole('admin'), async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, email, name, role, totp_enabled, created_at, updated_at
     FROM users WHERE tenant_id = $1 ORDER BY created_at ASC`,
    [req.user!.tenantId]
  );

  const users = rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    tenantId: req.user!.tenantId,
    totpEnabled: row.totp_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ success: true, data: users });
});
