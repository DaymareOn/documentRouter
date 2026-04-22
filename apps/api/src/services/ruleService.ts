import { Rule } from '@vibe-router/shared-types';
import { getPool } from '../db/pool';

function rowToRule(row: Record<string, unknown>): Rule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    isActive: row.is_active as boolean,
    priority: Number(row.priority),
    logic: row.logic as Rule['logic'],
    conditions: row.conditions as Rule['conditions'],
    actions: row.actions as Rule['actions'],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  logic: Rule['logic'];
  conditions: Rule['conditions'];
  actions: Rule['actions'];
}

export async function listRules(tenantId: string): Promise<Rule[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM rules WHERE tenant_id = $1 ORDER BY priority ASC, created_at DESC',
    [tenantId]
  );
  return rows.map(rowToRule);
}

export async function createRule(
  tenantId: string,
  userId: string,
  input: CreateRuleInput
): Promise<Rule> {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO rules
       (tenant_id, user_id, name, description, is_active, priority, logic, conditions, actions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tenantId,
      userId,
      input.name,
      input.description ?? null,
      input.isActive,
      input.priority,
      input.logic,
      JSON.stringify(input.conditions),
      JSON.stringify(input.actions),
    ]
  );
  return rowToRule(rows[0]);
}

export async function getRuleById(id: string, tenantId: string): Promise<Rule | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM rules WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rows.length > 0 ? rowToRule(rows[0]) : null;
}

export async function updateRule(
  id: string,
  tenantId: string,
  input: Partial<CreateRuleInput>
): Promise<Rule | null> {
  const pool = getPool();
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id, tenantId];
  let paramIdx = 3;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIdx++}`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIdx++}`);
    params.push(input.description);
  }
  if (input.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIdx++}`);
    params.push(input.isActive);
  }
  if (input.priority !== undefined) {
    setClauses.push(`priority = $${paramIdx++}`);
    params.push(input.priority);
  }
  if (input.logic !== undefined) {
    setClauses.push(`logic = $${paramIdx++}`);
    params.push(input.logic);
  }
  if (input.conditions !== undefined) {
    setClauses.push(`conditions = $${paramIdx++}`);
    params.push(JSON.stringify(input.conditions));
  }
  if (input.actions !== undefined) {
    setClauses.push(`actions = $${paramIdx++}`);
    params.push(JSON.stringify(input.actions));
  }

  const { rows } = await pool.query(
    `UPDATE rules SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    params
  );
  return rows.length > 0 ? rowToRule(rows[0]) : null;
}

export async function deleteRule(id: string, tenantId: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM rules WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return (rowCount ?? 0) > 0;
}
