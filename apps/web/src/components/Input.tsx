import { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text)',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx('input', error && 'input-error', className)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '1rem',
            width: '100%',
            minHeight: '2.75rem',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <span
            id={`${inputId}-error`}
            role="alert"
            style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}
          >
            {error}
          </span>
        )}
        {helperText && !error && (
          <span
            id={`${inputId}-helper`}
            style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
