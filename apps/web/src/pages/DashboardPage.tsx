import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, Shield, HardDrive } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import type { Document, AuditLog } from '@vibe-router/shared-types';

interface Stats {
  totalDocuments: number;
  processedToday: number;
  activeRules: number;
  storageUsed: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, rulesRes] = await Promise.allSettled([
          api.get('/documents?pageSize=5&sortBy=createdAt&sortOrder=desc'),
          api.get('/rules?pageSize=100'),
        ]);

        if (docsRes.status === 'fulfilled') {
          const docs: Document[] = docsRes.value.data.data?.items ?? [];
          setRecentDocs(docs);
          const today = new Date().toDateString();
          setStats({
            totalDocuments: docsRes.value.data.data?.total ?? 0,
            processedToday: docs.filter(
              (d) => d.status === 'processed' && new Date(d.createdAt).toDateString() === today
            ).length,
            activeRules: rulesRes.status === 'fulfilled'
              ? (rulesRes.value.data.data?.items ?? []).filter((r: { isActive: boolean }) => r.isActive).length
              : 0,
            storageUsed: docs.reduce((acc, d) => acc + d.size, 0),
          });
        }
      } catch {
        // silently fail - show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: t('dashboard.totalDocuments'), value: stats?.totalDocuments ?? 0, icon: FileText, color: 'var(--color-primary)' },
    { label: t('dashboard.processedToday'), value: stats?.processedToday ?? 0, icon: CheckCircle, color: 'var(--color-success)' },
    { label: t('dashboard.activeRules'), value: stats?.activeRules ?? 0, icon: Shield, color: 'var(--color-secondary)' },
    { label: t('dashboard.storageUsed'), value: formatBytes(stats?.storageUsed ?? 0), icon: HardDrive, color: 'var(--color-warning)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {t('dashboard.welcome')}, {user?.name}
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: `${color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {t('dashboard.recentDocuments')}
          </h2>
          {recentDocs.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{t('documents.noDocuments')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '200px',
                    }}
                  >
                    {doc.filename}
                  </span>
                  <Badge
                    variant={
                      doc.status === 'processed' ? 'success' :
                      doc.status === 'failed' ? 'danger' :
                      doc.status === 'processing' ? 'info' : 'warning'
                    }
                  >
                    {t(`documents.${doc.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {t('dashboard.recentActivity')}
          </h2>
          {recentActivity.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentActivity.map((log) => (
                <div key={log.id} style={{ fontSize: '0.875rem', padding: '0.375rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>{log.action}</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
