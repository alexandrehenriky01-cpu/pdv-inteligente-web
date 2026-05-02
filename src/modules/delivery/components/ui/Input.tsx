import { forwardRef, type InputHTMLAttributes } from 'react';

export const INPUT_CLASS =
  'w-full h-12 px-4 rounded-item bg-bg-raised border border-bg-border text-text-primary placeholder:text-text-muted focus:border-accent-purple focus:outline-none focus:ring-2 focus:ring-accent-purple/20 transition-colors';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className = '', ...rest }, ref) => (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-text-secondary text-sm block">
          {label}
        </label>
      )}
      <input ref={ref} id={id} {...rest} className={`${INPUT_CLASS} ${className}`} />
    </div>
  )
);
Input.displayName = 'Input';
