import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const CTA_BUTTON_CLASS =
  'w-full h-14 rounded-pill bg-cta hover:bg-cta-hover shadow-cta text-white font-bold text-base tracking-wide uppercase flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function CtaButton({ children, className = '', ...rest }: Props) {
  return (
    <button {...rest} className={`${CTA_BUTTON_CLASS} ${className}`}>
      {children}
    </button>
  );
}
