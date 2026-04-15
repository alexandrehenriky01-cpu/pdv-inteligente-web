import { Component, ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = {
  children: ReactNode;
  /** Mensagem principal quando ocorrer erro de renderização no relatório. */
  titulo?: string;
};

type State = {
  hasError: boolean;
};

/**
 * Isola falhas de renderização em relatórios (DRE, fechamento, etc.) para evitar white screen em todo o app.
 */
export class RelatorioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RelatorioErrorBoundary]', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 p-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
        >
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-400" aria-hidden />
          <p className="text-base font-bold text-white">
            {this.props.titulo ?? 'Não foi possível carregar o relatório.'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Atualize a página ou tente novamente em instantes. O menu do sistema permanece disponível.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
