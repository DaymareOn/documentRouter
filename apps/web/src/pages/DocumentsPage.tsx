import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload, LayoutGrid, List } from 'lucide-react';
import { api } from '../lib/api';
import { DocumentCard } from '../components/DocumentCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Document } from '@vibe-router/shared-types';

export function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents', {
        params: { page, pageSize: 12, sortBy: 'createdAt', sortOrder: 'desc' },
      });
      setDocuments(data.data?.items ?? []);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      for (const file of acceptedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('source', 'upload');
          await api.post('/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast.success(`${file.name} uploaded`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      setUploading(false);
      fetchDocuments();
    },
    [fetchDocuments]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirm'))) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success(t('common.success'));
      fetchDocuments();
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const { data } = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = documents.find((d) => d.id === id)?.filename ?? 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('documents.title')}</h1>
      </div>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
          transition: 'all 0.15s',
        }}
      >
        <input {...getInputProps()} />
        <Upload size={32} style={{ margin: '0 auto', color: 'var(--color-primary)', display: 'block' }} />
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)' }}>
          {uploading ? t('common.loading') : t('documents.dragAndDrop')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            label=""
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredDocs.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
          {t('documents.noDocuments')}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
            gap: '1rem',
          }}
        >
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={(id) => navigate(`/documents/${id}`)}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.back')}
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
