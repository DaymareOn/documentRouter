import { FileText, Trash2, Download, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Document } from '@vibe-router/shared-types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'warning',
  processing: 'info',
  processed: 'success',
  failed: 'danger',
  archived: 'default',
};

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onView?: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ document, onDelete, onDownload, onView }: DocumentCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
          <FileText size={32} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <h3
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '200px',
              }}
              title={document.filename}
            >
              {document.filename}
            </h3>
            <Badge variant={statusVariant[document.status] ?? 'default'}>
              {t(`documents.${document.status}`)}
            </Badge>
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <span>{formatBytes(document.size)}</span>
            <span>{document.mimeType}</span>
            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {onView && (
              <Button variant="ghost" size="sm" onClick={() => onView(document.id)}>
                <Eye size={14} /> {t('common.view')}
              </Button>
            )}
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={() => onDownload(document.id)}>
                <Download size={14} /> {t('documents.download')}
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" onClick={() => onDelete(document.id)}>
                <Trash2 size={14} /> {t('documents.delete')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
