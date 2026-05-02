import type { ReactNode } from 'react';

type Variant = 'price' | 'cta' | 'neutral';

interface Props {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  price: 'bg-price/15 text-price',
  cta: 'bg-cta text-white',
  neutral: 'bg-bg-raised text-text-secondary',
};

export function Badge({ variant = 'price', children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-semibold ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
