import { Router, Response } from 'express';
import { validate, ruleSchema } from '@vibe-router/shared-utils';
import { evaluateRule } from '@vibe-router/rule-engine';
import { ApiResponse, Document } from '@vibe-router/shared-types';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  listRules,
  createRule,
  getRuleById,
  updateRule,
  deleteRule,
} from '../services/ruleService';
import { getDocumentById } from '../services/documentService';
import { logAuditEvent } from '../services/auditService';

export const rulesRouter = Router();

rulesRouter.use(authenticate);

// GET /api/rules
rulesRouter.get('/', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const rules = await listRules(req.user!.tenantId);
  res.json({ success: true, data: rules });
});

// POST /api/rules
rulesRouter.post('/', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const validation = validate(ruleSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const rule = await createRule(req.user!.tenantId, req.user!.id, validation.data);

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'rule.created',
    resourceType: 'rule',
    resourceId: rule.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: rule });
});

// GET /api/rules/:id
rulesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const rule = await getRuleById(req.params['id']!, req.user!.tenantId);
  if (!rule) {
    res.status(404).json({ success: false, error: 'Rule not found' });
    return;
  }
  res.json({ success: true, data: rule });
});

// PUT /api/rules/:id
rulesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const validation = validate(ruleSchema.partial(), req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.errors.join(', ') });
    return;
  }

  const rule = await updateRule(req.params['id']!, req.user!.tenantId, validation.data);
  if (!rule) {
    res.status(404).json({ success: false, error: 'Rule not found' });
    return;
  }

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'rule.updated',
    resourceType: 'rule',
    resourceId: rule.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: rule });
});

// DELETE /api/rules/:id
rulesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const deleted = await deleteRule(req.params['id']!, req.user!.tenantId);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Rule not found' });
    return;
  }

  await logAuditEvent({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    action: 'rule.deleted',
    resourceType: 'rule',
    resourceId: req.params['id'],
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Rule deleted' });
});

// POST /api/rules/:id/test
rulesRouter.post('/:id/test', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  const rule = await getRuleById(req.params['id']!, req.user!.tenantId);
  if (!rule) {
    res.status(404).json({ success: false, error: 'Rule not found' });
    return;
  }

  const { documentId, document: documentData } = req.body as { documentId?: string; document?: Document };

  let doc: Document | null = null;
  if (documentId) {
    doc = await getDocumentById(documentId, req.user!.tenantId);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
  } else if (documentData) {
    doc = documentData;
  } else {
    res.status(400).json({ success: false, error: 'Provide documentId or document payload' });
    return;
  }

  const matched = evaluateRule(rule, doc);
  res.json({ success: true, data: { matched, ruleId: rule.id, documentId: doc.id } });
});
