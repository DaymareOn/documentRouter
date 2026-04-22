import type {
  Document,
  Rule,
  RuleCondition,
  RuleEvaluationResult,
} from '@vibe-router/shared-types';

type DocumentContext = {
  ocr_text: string;
  filename: string;
  sender: string;
  recipient: string;
  amount: number;
  date: string;
  mime_type: string;
  tags: string[];
  source: string;
};

function buildContext(document: Document): DocumentContext {
  return {
    ocr_text: document.ocrText || '',
    filename: document.filename,
    sender: document.metadata.sender || '',
    recipient: document.metadata.recipient || '',
    amount: document.metadata.amount || 0,
    date: document.metadata.date || '',
    mime_type: document.mimeType,
    tags: document.tags,
    source: document.source,
  };
}

function evaluateCondition(condition: RuleCondition, context: DocumentContext): boolean {
  const rawValue = context[condition.field as keyof DocumentContext];
  const conditionValue = condition.value;

  if (Array.isArray(rawValue)) {
    const strArray = rawValue.map(String);
    switch (condition.operator) {
      case 'contains':
        return strArray.some((v) => v.toLowerCase().includes(conditionValue.toLowerCase()));
      case 'not_contains':
        return !strArray.some((v) => v.toLowerCase().includes(conditionValue.toLowerCase()));
      case 'equals':
        return strArray.includes(conditionValue);
      case 'not_equals':
        return !strArray.includes(conditionValue);
      default:
        return false;
    }
  }

  const strValue = String(rawValue);
  const numValue = Number(rawValue);

  switch (condition.operator) {
    case 'contains':
      return strValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'not_contains':
      return !strValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'equals':
      return strValue === conditionValue;
    case 'not_equals':
      return strValue !== conditionValue;
    case 'starts_with':
      return strValue.toLowerCase().startsWith(conditionValue.toLowerCase());
    case 'ends_with':
      return strValue.toLowerCase().endsWith(conditionValue.toLowerCase());
    case 'regex':
      return new RegExp(conditionValue, 'i').test(strValue);
    case 'gt':
      return numValue > Number(conditionValue);
    case 'lt':
      return numValue < Number(conditionValue);
    case 'gte':
      return numValue >= Number(conditionValue);
    case 'lte':
      return numValue <= Number(conditionValue);
    default:
      return false;
  }
}

export function evaluateRule(rule: Rule, document: Document): boolean {
  const context = buildContext(document);
  const results = rule.conditions.map((condition) => evaluateCondition(condition, context));

  if (rule.logic === 'AND') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export async function evaluateRules(
  rules: Rule[],
  document: Document
): Promise<RuleEvaluationResult[]> {
  const results: RuleEvaluationResult[] = [];
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (!rule.isActive) continue;

    const matched = evaluateRule(rule, document);
    results.push({
      ruleId: rule.id,
      matched,
      actionsExecuted: [],
      errors: [],
    });
  }

  return results;
}
