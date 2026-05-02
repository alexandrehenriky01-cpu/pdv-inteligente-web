import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const SECONDARY_BUTTON_CLASS =
  'w-full h-14 rounded-pill border-2 border-accent-magenta text-text-primary font-bold text-base tracking-wide uppercase flex items-center justify-center gap-2 hover:bg-accent-magenta/10 transition-all duration-200 active:scale-[0.98]';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function SecondaryButton({ children, className = '', ...rest }: Props) {
  return (
    <button {...rest} className={`${SECONDARY_BUTTON_CLASS} ${className}`}>
      {children}
    </button>
  );
}
