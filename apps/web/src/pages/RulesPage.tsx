import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { RuleCard } from '../components/RuleCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Rule, RuleCondition, RuleAction, ConditionField, ConditionOperator, ActionType, LogicOperator } from '@vibe-router/shared-types';

const conditionFields: ConditionField[] = ['ocr_text', 'filename', 'sender', 'recipient', 'amount', 'date', 'mime_type', 'tags', 'source'];
const conditionOperators: ConditionOperator[] = ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'regex', 'gt', 'lt', 'gte', 'lte'];
const actionTypes: ActionType[] = ['email', 's3_push', 'webhook', 'tag', 'archive', 'notify'];

function generateId() {
  return Math.random().toString(36).slice(2);
}

interface RuleFormData {
  name: string;
  description: string;
  logic: LogicOperator;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

const defaultForm: RuleFormData = {
  name: '',
  description: '',
  logic: 'AND',
  priority: 1,
  isActive: true,
  conditions: [],
  actions: [],
};

export function RulesPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rules');
      setRules(data.data?.items ?? []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => { setEditingRule(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm({ name: rule.name, description: rule.description ?? '', logic: rule.logic, priority: rule.priority, isActive: rule.isActive, conditions: rule.conditions, actions: rule.actions });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('errors.requiredField')); return; }
    setSaving(true);
    try {
      if (editingRule) { await api.put(`/rules/${editingRule.id}`, form); } else { await api.post('/rules', form); }
      toast.success(t('common.success')); setModalOpen(false); fetchRules();
    } catch { toast.error(t('errors.networkError')); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm'))) return;
    try { await api.delete(`/rules/${id}`); toast.success(t('common.success')); fetchRules(); } catch { toast.error(t('errors.networkError')); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await api.patch(`/rules/${id}`, { isActive }); fetchRules(); } catch { toast.error(t('errors.networkError')); }
  };

  const addCondition = () => setForm((f) => ({ ...f, conditions: [...f.conditions, { id: generateId(), field: 'filename' as ConditionField, operator: 'contains' as ConditionOperator, value: '' }] }));
  const updateCondition = (index: number, updates: Partial<RuleCondition>) => setForm((f) => { const conditions = [...f.conditions]; conditions[index] = { ...conditions[index], ...updates }; return { ...f, conditions }; });
  const removeCondition = (index: number) => setForm((f) => ({ ...f, conditions: f.conditions.filter((_, i) => i !== index) }));
  const addAction = () => setForm((f) => ({ ...f, actions: [...f.actions, { id: generateId(), type: 'notify' as ActionType, config: {} }] }));
  const updateAction = (index: number, updates: Partial<RuleAction>) => setForm((f) => { const actions = [...f.actions]; actions[index] = { ...actions[index], ...updates }; return { ...f, actions }; });
  const removeAction = (index: number) => setForm((f) => ({ ...f, actions: f.actions.filter((_, i) => i !== index) }));

  const selectStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem', minHeight: '44px', cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('rules.title')}</h1>
        <Button variant="primary" onClick={openCreate}><Plus size={16} /> {t('rules.createRule')}</Button>
      </div>
      {loading ? <LoadingSpinner /> : rules.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>{t('rules.noRules')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rules.sort((a, b) => a.priority - b.priority).map((rule) => (
            <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRule ? t('rules.editRule') : t('rules.createRule')} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label={t('rules.ruleName')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label={t('rules.ruleDescription')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="logic-select" style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>{t('rules.logic')}</label>
              <select id="logic-select" value={form.logic} onChange={(e) => setForm((f) => ({ ...f, logic: e.target.value as LogicOperator }))} style={selectStyle}>
                <option value="AND">{t('rules.andLogic')}</option>
                <option value="OR">{t('rules.orLogic')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>{t('rules.priority')}</label>
              <input type="number" min={1} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 1 }))} style={{ ...selectStyle, width: '80px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: '44px' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} style={{ width: '1rem', height: '1rem', minHeight: 'unset' }} />
                {t('rules.active')}
              </label>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{t('rules.conditions')}</h3>
              <Button variant="secondary" size="sm" onClick={addCondition}><Plus size={14} /> {t('rules.addCondition')}</Button>
            </div>
            {form.conditions.map((cond, i) => (
              <div key={cond.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value as ConditionField })} style={selectStyle}>
                  {conditionFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={cond.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as ConditionOperator })} style={selectStyle}>
                  {conditionOperators.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
                <input type="text" value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder={t('rules.value')} style={{ ...selectStyle, flex: 1, minWidth: '100px' }} />
                <Button variant="danger" size="sm" onClick={() => removeCondition(i)}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{t('rules.actions')}</h3>
              <Button variant="secondary" size="sm" onClick={addAction}><Plus size={14} /> {t('rules.addAction')}</Button>
            </div>
            {form.actions.map((action, i) => (
              <div key={action.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                <select value={action.type} onChange={(e) => updateAction(i, { type: e.target.value as ActionType })} style={selectStyle}>
                  {actionTypes.map((actionType) => <option key={actionType} value={actionType}>{actionType}</option>)}
                </select>
                <Button variant="danger" size="sm" onClick={() => removeAction(i)}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
