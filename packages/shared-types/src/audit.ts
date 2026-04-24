export type AuditAction =
  | 'document.upload'
  | 'document.process'
  | 'document.route'
  | 'document.delete'
  | 'rule.create'
  | 'rule.update'
  | 'rule.delete'
  | 'user.login'
  | 'user.logout'
  | 'user.register';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
