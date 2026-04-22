import type { Document, Rule } from '@vibe-router/shared-types';
import { evaluateRule, evaluateRules } from '../evaluator';

const baseDocument: Document = {
  id: 'doc-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  filename: 'invoice_2024.pdf',
  mimeType: 'application/pdf',
  size: 204800,
  status: 'processed',
  source: 'upload',
  s3Key: 'tenant-1/doc-1.pdf',
  s3Bucket: 'vibe-router-docs',
  ocrText: 'Invoice from Acme Corp. Amount due: $1500.00. Please pay by 2024-03-31.',
  metadata: {
    title: 'Invoice',
    date: '2024-03-01',
    amount: 1500,
    currency: 'USD',
    sender: 'Acme Corp',
    recipient: 'John Doe',
    keywords: ['invoice', 'payment'],
    language: 'en',
    pageCount: 2,
    isEncrypted: false,
  },
  tags: ['finance', 'invoice'],
  version: 1,
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
};

const baseRule: Rule = {
  id: 'rule-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  name: 'Test Rule',
  isActive: true,
  priority: 1,
  logic: 'AND',
  conditions: [],
  actions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('evaluateRule - AND logic', () => {
  it('returns true when all conditions match', () => {
    const rule: Rule = {
      ...baseRule,
      logic: 'AND',
      conditions: [
        { id: 'c1', field: 'sender', operator: 'equals', value: 'Acme Corp' },
        { id: 'c2', field: 'ocr_text', operator: 'contains', value: 'Invoice' },
      ],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('returns false when one condition does not match', () => {
    const rule: Rule = {
      ...baseRule,
      logic: 'AND',
      conditions: [
        { id: 'c1', field: 'sender', operator: 'equals', value: 'Acme Corp' },
        { id: 'c2', field: 'filename', operator: 'equals', value: 'contract.pdf' },
      ],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(false);
  });
});

describe('evaluateRule - OR logic', () => {
  it('returns true when at least one condition matches', () => {
    const rule: Rule = {
      ...baseRule,
      logic: 'OR',
      conditions: [
        { id: 'c1', field: 'sender', operator: 'equals', value: 'Unknown' },
        { id: 'c2', field: 'ocr_text', operator: 'contains', value: 'Invoice' },
      ],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('returns false when no conditions match', () => {
    const rule: Rule = {
      ...baseRule,
      logic: 'OR',
      conditions: [
        { id: 'c1', field: 'sender', operator: 'equals', value: 'Nobody' },
        { id: 'c2', field: 'filename', operator: 'equals', value: 'contract.pdf' },
      ],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(false);
  });
});

describe('evaluateRule - string operators', () => {
  it('contains (case-insensitive)', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'ocr_text', operator: 'contains', value: 'acme' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('not_contains', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'ocr_text', operator: 'not_contains', value: 'XYZ Corp' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('starts_with', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'filename', operator: 'starts_with', value: 'invoice' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('ends_with', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'filename', operator: 'ends_with', value: '.pdf' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('regex', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'ocr_text', operator: 'regex', value: '\\$\\d+\\.\\d{2}' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('equals', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'mime_type', operator: 'equals', value: 'application/pdf' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('not_equals', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'source', operator: 'not_equals', value: 'email' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });
});

describe('evaluateRule - numeric operators', () => {
  it('gt', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'amount', operator: 'gt', value: '1000' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('lt', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'amount', operator: 'lt', value: '2000' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('gte (exact match)', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'amount', operator: 'gte', value: '1500' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('lte (exact match)', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'amount', operator: 'lte', value: '1500' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('gt fails when amount is not greater', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'amount', operator: 'gt', value: '2000' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(false);
  });
});

describe('evaluateRule - array fields (tags)', () => {
  it('contains tag', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'tags', operator: 'contains', value: 'finance' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('not_contains missing tag', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'tags', operator: 'not_contains', value: 'legal' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });

  it('equals specific tag', () => {
    const rule: Rule = {
      ...baseRule,
      conditions: [{ id: 'c1', field: 'tags', operator: 'equals', value: 'invoice' }],
    };
    expect(evaluateRule(rule, baseDocument)).toBe(true);
  });
});

describe('evaluateRules', () => {
  it('skips inactive rules', async () => {
    const rules: Rule[] = [
      { ...baseRule, id: 'r1', isActive: false, conditions: [{ id: 'c1', field: 'sender', operator: 'equals', value: 'Acme Corp' }] },
      { ...baseRule, id: 'r2', isActive: true, priority: 2, conditions: [{ id: 'c2', field: 'filename', operator: 'contains', value: 'invoice' }] },
    ];
    const results = await evaluateRules(rules, baseDocument);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('r2');
    expect(results[0].matched).toBe(true);
  });

  it('sorts by priority', async () => {
    const rules: Rule[] = [
      { ...baseRule, id: 'r2', priority: 2, conditions: [{ id: 'c1', field: 'sender', operator: 'equals', value: 'Acme Corp' }] },
      { ...baseRule, id: 'r1', priority: 1, conditions: [{ id: 'c2', field: 'sender', operator: 'equals', value: 'Acme Corp' }] },
    ];
    const results = await evaluateRules(rules, baseDocument);
    expect(results[0].ruleId).toBe('r1');
    expect(results[1].ruleId).toBe('r2');
  });
});
