import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Document } from '@vibe-router/shared-types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'warning',
  processing: 'info',
  processed: 'success',
  failed: 'danger',
  archived: 'default',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/documents/${id}`)
      .then(({ data }) => setDoc(data.data))
      .catch(() => toast.error(t('errors.networkError')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleDelete = async () => {
    if (!id || !confirm(t('common.confirm'))) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success(t('common.success'));
      navigate('/documents');
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleProcessOcr = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const { data } = await api.post(`/documents/${id}/process`);
      setDoc(data.data);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc?.filename ?? 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!doc) return <p>{t('errors.notFound')}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
          <ArrowLeft size={16} /> {t('common.back')}
        </Button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.filename}
        </h1>
        <Badge variant={statusVariant[doc.status] ?? 'default'}>
          {t(`documents.${doc.status}`)}
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          <Download size={14} /> {t('documents.download')}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleProcessOcr} loading={processing}>
          <RefreshCw size={14} /> {t('documents.processOcr')}
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 size={14} /> {t('documents.delete')}
        </Button>
      </div>

      <Card>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>File Info</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            [t('documents.fileName'), doc.filename],
            [t('documents.fileSize'), formatBytes(doc.size)],
            [t('documents.fileType'), doc.mimeType],
            [t('documents.uploadDate'), new Date(doc.createdAt).toLocaleString()],
            [t('documents.source'), doc.source],
            [t('documents.version'), doc.version.toString()],
          ].map(([label, value]) => (
            <div key={label}>
              <dt style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>{label}</dt>
              <dd style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {doc.metadata && (
        <Card>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('documents.metadata')}</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {Object.entries(doc.metadata)
              .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
              .map(([key, value]) => (
                <div key={key}>
                  <dt style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>{key}</dt>
                  <dd style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{String(value)}</dd>
                </div>
              ))}
          </dl>
        </Card>
      )}

      {doc.ocrText && (
        <Card>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('documents.ocrText')}</h2>
          <pre
            style={{
              fontSize: '0.875rem',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {doc.ocrText}
          </pre>
        </Card>
      )}

      {doc.tags?.length > 0 && (
        <Card>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('documents.tags')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {doc.tags.map((tag) => (
              <Badge key={tag} variant="info">{tag}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
