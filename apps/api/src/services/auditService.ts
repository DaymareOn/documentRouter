import { getPool } from '../db/pool';
import { logger } from '../utils/logger';

export interface AuditEventInput {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO audit_logs
         (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.tenantId ?? null,
        event.userId ?? null,
        event.action,
        event.resourceType ?? null,
        event.resourceId ?? null,
        JSON.stringify(event.details ?? {}),
        event.ipAddress ?? null,
        event.userAgent ?? null,
      ]
    );
  } catch (err) {
    logger.error('Failed to write audit log:', err);
  }
}
