import type { AxiosInstance } from 'axios';

const LS_NOME_ESTACAO = '@PDV:NomeEstacaoExibicao';
const LS_CAIXA_FISCAL = '@PDV:CaixaFiscalId';
const LS_SESSAO_CAIXA = '@PDV:SessaoCaixaId';
const LS_TERMINAL_FISCAL = '@PDV_Terminal_Name';

/**
 * Chaves usadas pelo PDV e pelo Self-Checkout para amarrar balança, TEF e caixa por estação.
 */
export function getEstacaoTrabalhoIdPdv(): string | undefined {
  const id =
    localStorage.getItem('estacao_trabalho_id')?.trim() ||
    localStorage.getItem('@PDV_WorkstationId')?.trim() ||
    '';
  return id.length > 0 ? id : undefined;
}

export function persistirEstacaoTrabalhoId(id: string): void {
  const t = id.trim();
  if (!t) return;
  localStorage.setItem('estacao_trabalho_id', t);
  localStorage.setItem('@PDV_WorkstationId', t);
}

/** Nome amigável da estação (ex.: "TOTEM 1") — exibido no PDV; não substitui o terminal fiscal da sessão. */
export function getNomeEstacaoExibicaoPdv(): string | undefined {
  const n = localStorage.getItem(LS_NOME_ESTACAO)?.trim();
  return n && n.length > 0 ? n : undefined;
}

export function persistirNomeEstacaoExibicao(nome: string): void {
  const t = nome.trim();
  if (!t) {
    localStorage.removeItem(LS_NOME_ESTACAO);
    return;
  }
  localStorage.setItem(LS_NOME_ESTACAO, t);
}

/** ID do registro `Caixa` (fiscal) vinculado à estação, quando existir. */
export function getCaixaFiscalIdPdv(): string | undefined {
  const id = localStorage.getItem(LS_CAIXA_FISCAL)?.trim();
  return id && id.length > 0 ? id : undefined;
}

export function persistirCaixaFiscalId(id: string | null | undefined): void {
  const t = typeof id === 'string' ? id.trim() : '';
  if (!t) {
    localStorage.removeItem(LS_CAIXA_FISCAL);
    return;
  }
  localStorage.setItem(LS_CAIXA_FISCAL, t);
}

/** Terminal fiscal gravado na `SessaoCaixa` (ex.: nome do caixa "150") — deve bater com a estação no backend. */
export function getTerminalFiscalPdv(): string | undefined {
  const t = localStorage.getItem(LS_TERMINAL_FISCAL)?.trim();
  return t && t.length > 0 ? t : undefined;
}

export function persistirTerminalFiscalPdv(terminal: string): void {
  const t = terminal.trim();
  if (!t) return;
  localStorage.setItem(LS_TERMINAL_FISCAL, t);
}

export function persistirSessaoCaixaIdPdv(sessaoId: string | null | undefined): void {
  const t = typeof sessaoId === 'string' ? sessaoId.trim() : '';
  if (!t) {
    localStorage.removeItem(LS_SESSAO_CAIXA);
    return;
  }
  localStorage.setItem(LS_SESSAO_CAIXA, t);
}

export function getSessaoCaixaIdPdv(): string | undefined {
  const id = localStorage.getItem(LS_SESSAO_CAIXA)?.trim();
  return id && id.length > 0 ? id : undefined;
}

/**
 * Grava o contexto completo após abertura de turno (retaguarda ou PDV) para o terminal atual.
 */
export function persistirContextoPosAberturaCaixa(opts: {
  estacaoTrabalhoId: string;
  nomeEstacao?: string | null;
  caixaFiscalId?: string | null;
  terminalResolvido: string;
  sessaoCaixaId?: string | null;
}): void {
  persistirEstacaoTrabalhoId(opts.estacaoTrabalhoId);
  if (opts.nomeEstacao != null && String(opts.nomeEstacao).trim()) {
    persistirNomeEstacaoExibicao(String(opts.nomeEstacao).trim());
  }
  persistirCaixaFiscalId(opts.caixaFiscalId);
  persistirTerminalFiscalPdv(opts.terminalResolvido);
  if (opts.sessaoCaixaId != null) {
    persistirSessaoCaixaIdPdv(opts.sessaoCaixaId);
  }
}

/** Sempre lê o ID no momento da chamada (evita URL sem query por closure/stale state). */
export function montarUrlVerificarCaixa(): string | null {
  const id = getEstacaoTrabalhoIdPdv();
  if (!id) return null;
  return `/api/pdv/caixa/verificar?estacaoTrabalhoId=${encodeURIComponent(id)}`;
}

/** Query string com ID lido direto do localStorage (hardware / agente no totem). */
export function montarUrlContextoTerminal(): string | null {
  const id = getEstacaoTrabalhoIdPdv();
  if (!id) return null;
  return `/api/self-checkout/contexto-terminal?estacaoTrabalhoId=${encodeURIComponent(id)}`;
}

export type DescobertaEstacaoResultado =
  | 'ja_configurado'
  | 'descoberto'
  | 'nao_cadastrado'
  | 'erro_rede';

/**
 * Zero-touch: backend identifica o terminal pelo IP da requisição (JWT = loja).
 */
export async function descobrirEstacaoPorIp(
  api: AxiosInstance
): Promise<DescobertaEstacaoResultado> {
  if (getEstacaoTrabalhoIdPdv()) return 'ja_configurado';
  try {
    const { data } = await api.get<{
      success?: boolean;
      data?: {
        id?: string;
        nome?: string;
        caixaId?: string | null;
        caixa?: { id?: string } | null;
      };
    }>('/api/estacoes-trabalho/meu-terminal');
    const row = data?.data;
    const id = row?.id;
    if (data?.success && typeof id === 'string' && id.trim()) {
      persistirEstacaoTrabalhoId(id);
      const nome = typeof row?.nome === 'string' ? row.nome.trim() : '';
      if (nome) persistirNomeEstacaoExibicao(nome);
      const cx =
        (typeof row?.caixaId === 'string' && row.caixaId.trim()) ||
        (row?.caixa && typeof row.caixa.id === 'string' ? row.caixa.id.trim() : '');
      if (cx) persistirCaixaFiscalId(cx);
      return 'descoberto';
    }
    return 'erro_rede';
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) return 'nao_cadastrado';
    return 'erro_rede';
  }
}
