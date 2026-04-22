import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: '', color: 'var(--color-border)' },
    { label: 'Weak', color: 'var(--color-danger)' },
    { label: 'Fair', color: 'var(--color-warning)' },
    { label: 'Good', color: '#65a30d' },
    { label: 'Strong', color: 'var(--color-success)' },
  ];
  return { score, ...levels[score] };
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name) e.name = t('errors.requiredField');
    if (!email) e.email = t('errors.requiredField');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('errors.invalidEmail');
    if (!password) e.password = t('errors.requiredField');
    else if (password.length < 8) e.password = t('errors.passwordTooShort');
    if (password !== confirmPassword) e.confirmPassword = t('errors.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(email, name, password);
      navigate('/dashboard');
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            DocRouter
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{t('auth.signUp')}</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label={t('auth.name')}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
              autoFocus
            />
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <div>
              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: '4px',
                          flex: 1,
                          borderRadius: '2px',
                          backgroundColor: i <= strength.score ? strength.color : 'var(--color-border)',
                          transition: 'background-color 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: strength.color, marginTop: '0.25rem' }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" loading={loading} style={{ marginTop: '0.5rem' }}>
              {t('auth.signUp')}
            </Button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {t('auth.haveAccount')}{' '}
            <Link to="/login">{t('auth.signIn')}</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
