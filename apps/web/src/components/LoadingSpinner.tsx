import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: '1rem',
    md: '2rem',
    lg: '3rem',
  };

  return (
    <div
      className={clsx('loading-spinner-wrapper', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <svg
        width={sizes[size]}
        height={sizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'spin 1s linear infinite' }}
        aria-label="Loading"
      >
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="var(--color-border)"
          strokeWidth="4"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
