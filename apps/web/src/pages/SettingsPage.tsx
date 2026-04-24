import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try { await api.put('/users/me', { name: profileName, email: profileEmail }); toast.success(t('common.success')); }
    catch { toast.error(t('errors.networkError')); } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { toast.error(t('errors.requiredField')); return; }
    if (newPassword.length < 8) { toast.error(t('errors.passwordTooShort')); return; }
    setSavingPassword(true);
    try { await api.put('/users/me/password', { currentPassword, newPassword }); toast.success(t('common.success')); setCurrentPassword(''); setNewPassword(''); }
    catch { toast.error(t('errors.networkError')); } finally { setSavingPassword(false); }
  };

  const sectionTitle: React.CSSProperties = { fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('settings.title')}</h1>
      <Card>
        <h2 style={sectionTitle}>{t('settings.profile')}</h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label={t('common.name')} value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          <Input label={t('auth.email')} type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
          <Button type="submit" variant="primary" loading={savingProfile} style={{ alignSelf: 'flex-start' }}>{t('settings.saveChanges')}</Button>
        </form>
      </Card>
      <Card>
        <h2 style={sectionTitle}>{t('settings.security')}</h2>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label={t('settings.currentPassword')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          <Input label={t('settings.newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          <Button type="submit" variant="primary" loading={savingPassword} style={{ alignSelf: 'flex-start' }}>{t('settings.changePassword')}</Button>
        </form>
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('settings.enable2fa')}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
            {user?.totpEnabled ? t('settings.disable2fa') : t('settings.enable2fa')}
          </p>
          <Button variant={user?.totpEnabled ? 'danger' : 'secondary'} size="sm" onClick={async () => {
            try { await api.post('/auth/totp/toggle'); toast.success(t('common.success')); }
            catch { toast.error(t('errors.networkError')); }
          }}>
            {user?.totpEnabled ? t('settings.disable2fa') : t('settings.enable2fa')}
          </Button>
        </div>
      </Card>
      <Card>
        <h2 style={sectionTitle}>{t('settings.language')}</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['en', 'fr'].map((lang) => (
            <Button key={lang} variant={i18n.language === lang ? 'primary' : 'secondary'} size="sm" onClick={() => i18n.changeLanguage(lang)}>
              {lang === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
