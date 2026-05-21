import { type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Layout } from '../../../components/Layout';

export interface RhPageShellProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon: ReactNode;
  readonly actions?: ReactNode;
  readonly onRefresh?: () => void;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly children: ReactNode;
}

/**
 * Container visual padrão Aurya dark. Header + opcional botão de refresh
 * + slot de actions + bloco de erro + conteúdo. Usado por todas as páginas
 * do módulo RH para consistência.
 *
 * Wrappa em <Layout> (sidebar lateral padrão Aurya). Padrão alinhado ao
 * resto do sistema — módulos como compras/financeiro/cadastros usam
 * <Layout> direto em cada page. Telas full-screen (TotemRh) NÃO devem
 * usar RhPageShell — renderizam sem Layout para preservar modo kiosk.
 */
export function RhPageShell(props: RhPageShellProps): JSX.Element {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl p-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <span className="text-violet-300">{props.icon}</span>
              {props.title}
            </h1>
            {props.subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-slate-400">{props.subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {props.actions}
            {props.onRefresh ? (
              <button
                type="button"
                onClick={props.onRefresh}
                disabled={props.loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${props.loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            ) : null}
          </div>
        </header>

        {props.error ? (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
            {props.error}
          </div>
        ) : null}

        <div className="space-y-4">{props.children}</div>
      </div>
    </Layout>
  );
}
