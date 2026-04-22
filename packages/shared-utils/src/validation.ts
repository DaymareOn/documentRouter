import { z } from 'zod';

/** Maximum allowed upload size: 100 MB */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8).max(128);
export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  totpCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(255),
  password: passwordSchema,
});

export const documentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().positive().max(MAX_UPLOAD_BYTES),
  source: z.enum(['upload', 'email', 'scanner', 'api']),
  tags: z.array(z.string()).optional(),
});

export const ruleConditionSchema = z.object({
  id: uuidSchema,
  field: z.enum([
    'ocr_text',
    'filename',
    'sender',
    'recipient',
    'amount',
    'date',
    'mime_type',
    'tags',
    'source',
  ]),
  operator: z.enum([
    'contains',
    'not_contains',
    'equals',
    'not_equals',
    'starts_with',
    'ends_with',
    'regex',
    'gt',
    'lt',
    'gte',
    'lte',
  ]),
  value: z.string(),
});

export const ruleActionSchema = z.object({
  id: uuidSchema,
  type: z.enum(['email', 's3_push', 'webhook', 'tag', 'archive', 'notify']),
  config: z.record(z.string()),
});

export const ruleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean(),
  priority: z.number().int().min(0).max(1000),
  logic: z.enum(['AND', 'OR']),
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1),
});

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
