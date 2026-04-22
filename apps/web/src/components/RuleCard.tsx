import { Shield, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Rule } from '@vibe-router/shared-types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

interface RuleCardProps {
  rule: Rule;
  onEdit?: (rule: Rule) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

export function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
          <Shield size={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{rule.name}</h3>
            <Badge variant={rule.isActive ? 'success' : 'default'}>
              {rule.isActive ? t('rules.active') : t('rules.inactive')}
            </Badge>
          </div>
          {rule.description && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              {rule.description}
            </p>
          )}
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.375rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            <span>{rule.conditions.length} {t('rules.conditions')}</span>
            <span>{rule.actions.length} {t('rules.actions')}</span>
            <span>{t('rules.priority')}: {rule.priority}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(rule)}>
                <Edit size={14} /> {t('common.edit')}
              </Button>
            )}
            {onToggle && (
              <Button variant="ghost" size="sm" onClick={() => onToggle(rule.id, !rule.isActive)}>
                {rule.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {rule.isActive ? t('rules.inactive') : t('rules.active')}
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" onClick={() => onDelete(rule.id)}>
                <Trash2 size={14} /> {t('common.delete')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
