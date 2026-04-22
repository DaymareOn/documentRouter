import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as OTPAuth from 'otpauth';
import { createHash, randomBytes } from 'crypto';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateId,
  validate,
  loginSchema,
  registerSchema,
} from '@vibe-router/shared-utils';
import { ApiResponse, User, AuthTokens, Tenant } from '@vibe-router/shared-types';
import { getPool } from '../db/pool';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/auditService';

export const authRouter = Router();

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = () => process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 7;

function parseJwtExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User['role'],
    tenantId: row.tenant_id as string,
    totpEnabled: row.totp_enabled as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

async function issueTokens(user: User): Promise<AuthTokens> {
  const pool = getPool();
  const accessToken = generateAccessToken(
    { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role },
    JWT_SECRET(),
    JWT_EXPIRES_IN()
  );

  const refreshToken = generateRefreshToken(
    { sub: user.id },
    REFRESH_SECRET()
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, hashToken(refreshToken), expiresAt]
  );

  const expiresInSeconds = parseJwtExpiry(JWT_EXPIRES_IN());
  return { accessToken, refreshToken, expiresIn: expiresInSeconds };
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response<ApiResponse>) => {
  const validation = validate(registerSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const { email, name, password } = validation.data;
  const pool = getPool();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const tenantSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + randomBytes(4).toString('hex');
  const defaultSettings: Tenant['settings'] = {
    maxDocuments: 100,
    maxStorageBytes: 1024 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    ocrProvider: 'auto',
    encryptionEnabled: false,
    retentionDays: 90,
  };

  const tenantResult = await pool.query(
    "INSERT INTO tenants (name, slug, plan, settings) VALUES ($1, $2, 'free', $3) RETURNING *",
    [name + "'s Workspace", tenantSlug, JSON.stringify(defaultSettings)]
  );
  const tenant = tenantResult.rows[0];

  const passwordHash = await hashPassword(password);
  const userResult = await pool.query(
    "INSERT INTO users (tenant_id, email, name, password_hash, role) VALUES ($1, $2, $3, $4, 'admin') RETURNING *",
    [tenant.id, email, name, passwordHash]
  );

  const user = rowToUser(userResult.rows[0]);
  const tokens = await issueTokens(user);

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'user.registered',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: { user, tokens } });
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response<ApiResponse>) => {
  const validation = validate(loginSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const { email, password, totpCode } = validation.data;
  const pool = getPool();

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (rows.length === 0) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const dbUser = rows[0];
  const valid = await verifyPassword(password, dbUser.password_hash);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  if (dbUser.totp_enabled) {
    if (!totpCode) {
      res.status(200).json({ success: true, data: { requiresTotp: true } });
      return;
    }
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(dbUser.totp_secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const delta = totp.validate({ token: totpCode, window: 1 });
    if (delta === null) {
      res.status(401).json({ success: false, error: 'Invalid TOTP code' });
      return;
    }
  }

  const user = rowToUser(dbUser);
  const tokens = await issueTokens(user);

  await logAuditEvent({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'user.login',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: { user, tokens } });
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const pool = getPool();
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(refreshToken)]);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response<ApiResponse>) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'Refresh token required' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = verifyToken(refreshToken, REFRESH_SECRET());
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    return;
  }

  const pool = getPool();
  const tokenHash = hashToken(refreshToken);
  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [tokenHash]
  );

  if (rows.length === 0) {
    res.status(401).json({ success: false, error: 'Refresh token not found or expired' });
    return;
  }

  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);

  const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  if (userResult.rows.length === 0) {
    res.status(401).json({ success: false, error: 'User not found' });
    return;
  }

  const user = rowToUser(userResult.rows[0]);
  const tokens = await issueTokens(user);

  res.json({ success: true, data: tokens });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, data: rowToUser(rows[0]) });
});

// POST /api/auth/totp/setup
authRouter.post('/totp/setup', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const secret = new OTPAuth.Secret();
  const totp = new OTPAuth.TOTP({
    issuer: 'VibeRouter',
    label: rows[0].email as string,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  await pool.query(
    'UPDATE users SET totp_secret = $1, updated_at = NOW() WHERE id = $2',
    [secret.base32, req.user!.id]
  );

  res.json({
    success: true,
    data: {
      secret: secret.base32,
      otpauthUrl: totp.toString(),
    },
  });
});

// POST /api/auth/totp/verify
authRouter.post('/totp/verify', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const schema = z.object({ code: z.string().length(6) });
  const validation = validate(schema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (rows.length === 0 || !rows[0].totp_secret) {
    res.status(400).json({ success: false, error: 'TOTP not set up' });
    return;
  }

  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(rows[0].totp_secret as string),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: validation.data.code, window: 1 });
  if (delta === null) {
    res.status(400).json({ success: false, error: 'Invalid TOTP code' });
    return;
  }

  await pool.query(
    'UPDATE users SET totp_enabled = TRUE, updated_at = NOW() WHERE id = $1',
    [req.user!.id]
  );

  res.json({ success: true, message: '2FA enabled successfully' });
});

// POST /api/auth/totp/disable
authRouter.post('/totp/disable', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const schema = z.object({ password: z.string() });
  const validation = validate(schema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  if (rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const valid = await verifyPassword(validation.data.password, rows[0].password_hash as string);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return;
  }

  await pool.query(
    'UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, updated_at = NOW() WHERE id = $1',
    [req.user!.id]
  );

  res.json({ success: true, message: '2FA disabled successfully' });
});
