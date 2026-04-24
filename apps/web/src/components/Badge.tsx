import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantColors: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--color-border)', color: 'var(--color-text)' },
  success: { bg: '#dcfce7', color: 'var(--color-success)' },
  warning: { bg: '#fef9c3', color: 'var(--color-warning)' },
  danger: { bg: '#fee2e2', color: 'var(--color-danger)' },
  info: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const colors = variantColors[variant];
  return (
    <span
      className={clsx('badge', `badge-${variant}`, className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        borderRadius: 'var(--radius-xl)',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.color,
        minHeight: 'unset',
      }}
    >
      {children}
    </span>
  );
}
