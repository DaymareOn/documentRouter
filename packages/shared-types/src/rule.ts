export type ConditionOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte';

export type ConditionField =
  | 'ocr_text'
  | 'filename'
  | 'sender'
  | 'recipient'
  | 'amount'
  | 'date'
  | 'mime_type'
  | 'tags'
  | 'source';

export type ActionType = 'email' | 's3_push' | 'webhook' | 'tag' | 'archive' | 'notify';
export type LogicOperator = 'AND' | 'OR';

export interface RuleCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

export interface RuleAction {
  id: string;
  type: ActionType;
  config: Record<string, string>;
}

export interface Rule {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  logic: LogicOperator;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleEvaluationResult {
  ruleId: string;
  matched: boolean;
  actionsExecuted: string[];
  errors: string[];
}
