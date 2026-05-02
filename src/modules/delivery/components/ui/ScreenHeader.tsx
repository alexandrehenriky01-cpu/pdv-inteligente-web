import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, backTo, onBack, action }: Props) {
  const backClass =
    'w-9 h-9 rounded-full bg-bg-raised flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95';

  return (
    <header className="flex items-center justify-between p-4 border-b border-bg-border">
      {backTo ? (
        <Link to={backTo} className={backClass} aria-label="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} className={backClass} aria-label="Voltar">
          <ArrowLeft className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-9" aria-hidden />
      )}
      <div className="text-center min-w-0 flex-1 px-2">
        <h1 className="font-bold text-text-primary truncate">{title}</h1>
        {subtitle && <p className="text-text-muted text-xs truncate">{subtitle}</p>}
      </div>
      <div className="w-9 flex items-center justify-end">{action}</div>
    </header>
  );
}
