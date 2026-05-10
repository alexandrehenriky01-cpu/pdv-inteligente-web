import { useEffect, useState, type FC } from 'react';
import { isAxiosError } from 'axios';
import { Copy, KeyRound, Plug, RefreshCw, ShieldOff, AlertTriangle, Check } from 'lucide-react';
import { api } from '../../services/api';

/**
 * RC2.0 — Seção "Ativação Local-First" da página de configurações da loja.
 *
 * Permite ao operador autorizado:
 *   - ver o status atual da instalação (installationId, último sync);
 *   - gerar um novo token de ativação para a loja;
 *   - copiar o token logo após gerar (segredo aparece UMA vez);
 *   - listar tokens existentes em formato mascarado;
 *   - revogar tokens.
 *
 * O segredo NÃO é persistido em estado após reload — é responsabilidade do
 * operador copiar e usar no instalador local imediatamente.
 */

interface Props {
  /** lojaId carregado pela tela mãe via /api/lojas/minha-loja. */
  lojaId: string | null;
}

interface ActivationStatus {
  installed: boolean;
  status?: string;
  installationId?: string;
  lojaId?: string;
  cloudApiUrl?: string;
  validation?: { valid: boolean };
  snapshot?: { snapshotApplied?: boolean; snapshotAppliedAt?: string };
}

interface TokenSummary {
  id: string;
  tokenMasked: string;
  status: string;
  usedAt: string | null;
  expiresAt: string | null;
  installationId: string | null;
  machineName: string | null;
  notes: string | null;
  createdAt: string;
  isExpired: boolean;
  isUsed: boolean;
}

interface NewTokenResult {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * RC2.2.1 — mensagens amigáveis para 401/403/404 da API de tokens.
 * Nunca devolve a string técnica "Request failed with status code …".
 */
function describeAxiosError(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401) {
      return 'Sessão expirada — entre novamente para gerenciar tokens Local-First.';
    }
    if (status === 403) {
      return 'Seu usuário não tem permissão para gerenciar tokens Local-First desta loja. Solicite a um administrador da loja.';
    }
    if (status === 404) {
      return 'Loja não encontrada — confirme se a configuração está atualizada.';
    }
    const data = err.response?.data;
    if (data && typeof data === 'object') {
      const candidate =
        ('error' in data && typeof (data as { error?: string }).error === 'string')
          ? (data as { error: string }).error
          : ('erro' in data && typeof (data as { erro?: string }).erro === 'string')
            ? (data as { erro: string }).erro
            : null;
      if (candidate) return candidate;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/** RC2.2.1 — flag separado para 403, permite renderizar empty state ao invés de erro genérico. */
function isForbiddenAxiosError(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 403;
}

const LocalFirstActivationSection: FC<Props> = ({ lojaId }) => {
  const [activation, setActivation] = useState<ActivationStatus | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newToken, setNewToken] = useState<NewTokenResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** RC2.2.1 — separa 403 de erros de rede para renderizar bloco de "sem permissão". */
  const [forbidden, setForbidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [machineName, setMachineName] = useState<string>('');

  async function fetchActivation(): Promise<void> {
    setActivationLoading(true);
    try {
      const r = await api.get<ActivationStatus>('/api/activation/status');
      setActivation(r.data);
    } catch (err) {
      // /api/activation/status pode 404 em modo cloud puro; não é erro fatal.
      setActivation({ installed: false });
    } finally {
      setActivationLoading(false);
    }
  }

  async function fetchTokens(): Promise<void> {
    if (!lojaId) return;
    setTokensLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const r = await api.get<{ data: TokenSummary[] }>(
        `/api/lojas/${lojaId}/activation-tokens`
      );
      setTokens(r.data?.data ?? []);
    } catch (err) {
      if (isForbiddenAxiosError(err)) {
        // RC2.2.1 — apresenta empty state amigável em vez de erro técnico.
        setForbidden(true);
        setTokens([]);
      } else {
        setError(describeAxiosError(err));
      }
    } finally {
      setTokensLoading(false);
    }
  }

  useEffect(() => {
    void fetchActivation();
  }, []);

  useEffect(() => {
    if (lojaId) void fetchTokens();
  }, [lojaId]);

  async function handleGenerate(): Promise<void> {
    if (!lojaId) {
      setError('Loja ainda não carregada — aguarde alguns segundos.');
      return;
    }
    setGenerating(true);
    setError(null);
    setCopied(false);
    setNewToken(null);
    try {
      const r = await api.post<{ data: NewTokenResult }>(
        `/api/lojas/${lojaId}/activation-token`,
        {
          expiresInDays,
          machineName: machineName.trim() || null,
        }
      );
      setNewToken(r.data?.data ?? null);
      setForbidden(false);
      await fetchTokens();
    } catch (err) {
      if (isForbiddenAxiosError(err)) {
        setForbidden(true);
        setError(describeAxiosError(err));
      } else {
        setError(describeAxiosError(err));
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(tokenId: string): Promise<void> {
    if (!lojaId) return;
    if (!window.confirm('Revogar este token? Instalações que ainda não foram ativadas com ele perderão acesso.')) return;
    setError(null);
    try {
      await api.post(`/api/lojas/${lojaId}/activation-token/${tokenId}/revoke`, {});
      await fetchTokens();
    } catch (err) {
      setError(describeAxiosError(err));
    }
  }

  async function handleCopy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Não foi possível copiar para o clipboard. Selecione e copie manualmente.');
    }
  }

  const installed = !!activation?.installed;
  const status = activation?.status ?? '—';
  const installationId = activation?.installationId ?? null;
  const snapshotAppliedAt = activation?.snapshot?.snapshotAppliedAt ?? null;
  const valid = activation?.validation?.valid ?? false;

  /**
   * RC2.2.1b — habilitação explícita do botão "Gerar token".
   *
   * Independente do status da instalação (installationId, snapshot,
   * tokens existentes, etc.). Critérios:
   *   - lojaId carregada (parent já bateu em /api/lojas/minha-loja)
   *   - validade entre 1 e 365 dias
   *   - não estiver gerando agora
   *   - permissão não foi negada na última verificação (forbidden)
   *
   * `forbidden` SÓ é true quando a última GET tokens devolveu 403; é
   * resetado para `false` no início de toda fetchTokens — então um
   * relogin com permissão válida limpa o estado automaticamente assim
   * que a próxima carga acontece (inclusive via botão "tentar novamente"
   * abaixo).
   */
  const expiresInDaysValid = Number.isFinite(expiresInDays) && expiresInDays >= 1 && expiresInDays <= 365;
  const disabledReason: string | null = (() => {
    if (generating) return 'Gerando token...';
    if (!lojaId) return 'Loja ainda não carregada — aguarde alguns segundos.';
    if (forbidden) return 'Sem permissão para gerar tokens nesta loja. Use "tentar novamente" se você acabou de fazer login.';
    if (!expiresInDaysValid) return 'Validade deve ser um número entre 1 e 365 dias.';
    return null;
  })();
  const canGenerate = disabledReason === null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plug className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-lg text-white">Status da instalação Local-First</h3>
          <button
            type="button"
            onClick={() => void fetchActivation()}
            disabled={activationLoading}
            className="ml-auto text-xs flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${activationLoading ? 'animate-spin' : ''}`} />
            atualizar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-500">Status</span>
            <span className={`font-semibold ${installed && valid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {installed ? status : 'Não instalada'}
              {installed && valid ? ' • válida' : installed ? ' • atenção' : ''}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-500">Installation ID</span>
            <span className="font-mono text-xs text-slate-300 break-all">
              {installationId ?? '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-500">Snapshot aplicado em</span>
            <span className="text-slate-300">
              {snapshotAppliedAt ? new Date(snapshotAppliedAt).toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-500">Cloud API</span>
            <span className="font-mono text-xs text-slate-300 break-all">
              {activation?.cloudApiUrl ?? '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-lg text-white">Gerar token de ativação</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          O token é o segredo que o instalador local usa para registrar uma nova instalação nesta loja.
          Por motivos de segurança ele aparece <strong className="text-white">apenas uma vez</strong> —
          copie e guarde no momento da geração.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <label className="flex flex-col text-xs text-slate-400">
            Expira em (dias)
            <input
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
              className="mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm outline-none focus:border-violet-400/50"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-400 md:col-span-2">
            Nome da máquina/PDV (opcional)
            <input
              type="text"
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              placeholder="ex.: Caixa 01 — Cozinha"
              maxLength={120}
              className="mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm outline-none focus:border-violet-400/50"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!canGenerate}
          title={disabledReason ?? ''}
          aria-disabled={!canGenerate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          {generating ? 'Gerando...' : 'Gerar token de ativação'}
        </button>
        {disabledReason && (
          <p className="mt-2 text-xs text-amber-300/80">{disabledReason}</p>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {newToken && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2 text-emerald-300 text-sm font-semibold">
              <Check className="w-4 h-4" />
              Token gerado — copie agora, não será exibido novamente.
            </div>
            <div className="flex items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={newToken.token}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopy(newToken.token)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Expira em {newToken.expiresAt ? new Date(newToken.expiresAt).toLocaleString() : '—'}.
              Use no instalador local em "Token de ativação" para vincular a nova máquina à loja.
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-lg text-white">Tokens existentes</h3>
          <button
            type="button"
            onClick={() => void fetchTokens()}
            disabled={tokensLoading}
            className="ml-auto text-xs flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tokensLoading ? 'animate-spin' : ''}`} />
            atualizar
          </button>
        </div>
        {forbidden && !tokensLoading && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>
                Seu usuário não tem permissão para gerenciar tokens Local-First desta loja.
                Solicite a um administrador da loja ou ao SUPER_ADMIN.
              </p>
              <button
                type="button"
                onClick={() => void fetchTokens()}
                disabled={tokensLoading}
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-200 hover:text-amber-100 underline disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${tokensLoading ? 'animate-spin' : ''}`} />
                tentar novamente (após relogin/permissão concedida)
              </button>
            </div>
          </div>
        )}
        {!forbidden && tokens.length === 0 && !tokensLoading && (
          <p className="text-sm text-slate-500 italic">Nenhum token gerado ainda para esta loja.</p>
        )}
        {tokens.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Token</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Criado em</th>
                  <th className="py-2 pr-3">Expira em</th>
                  <th className="py-2 pr-3">Máquina</th>
                  <th className="py-2 pr-3">Usado em</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const isActive = t.status === 'ATIVO' && !t.isExpired;
                  return (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-300">{t.tokenMasked}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            t.status === 'ATIVO' && !t.isExpired
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : t.status === 'REVOGADO'
                                ? 'bg-rose-500/15 text-rose-300'
                                : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {t.isExpired ? 'EXPIRADO' : t.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-400 text-xs">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-slate-400 text-xs">
                        {t.expiresAt ? new Date(t.expiresAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-400 text-xs">{t.machineName ?? '—'}</td>
                      <td className="py-2 pr-3 text-slate-400 text-xs">
                        {t.usedAt ? new Date(t.usedAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(t.id)}
                            className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                            revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalFirstActivationSection;
