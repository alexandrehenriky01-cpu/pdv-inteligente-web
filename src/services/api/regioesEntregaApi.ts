import { api } from '../api';

export interface RegiaoEntrega {
  id: string;
  nome: string;
  bairros: string[];
  cidades: string[];
  /** Reais (já convertido de centavos pelo backend). */
  taxaEntrega: number;
  pedidoMinimo: number | null;
  tempoEstimadoMinutos: number | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegiaoEntregaInput {
  nome: string;
  bairros: string[];
  cidades?: string[];
  /** Reais — backend converte para centavos. */
  taxaEntrega: number;
  pedidoMinimo?: number | null;
  tempoEstimadoMinutos?: number | null;
  ativo?: boolean;
}

// ─────────────────────── Admin (JWT) ───────────────────────

export async function listarRegioes(): Promise<RegiaoEntrega[]> {
  const { data } = await api.get<{ regioes: RegiaoEntrega[] }>('/api/regioes-entrega');
  return data.regioes ?? [];
}

export async function criarRegiao(input: RegiaoEntregaInput): Promise<RegiaoEntrega> {
  const { data } = await api.post<{ regiao: RegiaoEntrega }>('/api/regioes-entrega', input);
  return data.regiao;
}

export async function atualizarRegiao(
  id: string,
  input: Partial<RegiaoEntregaInput>
): Promise<RegiaoEntrega> {
  const { data } = await api.put<{ regiao: RegiaoEntrega }>(`/api/regioes-entrega/${id}`, input);
  return data.regiao;
}

export async function excluirRegiao(id: string): Promise<void> {
  await api.delete(`/api/regioes-entrega/${id}`);
}

/** Atualiza a política `bloquearForaDaArea` da loja do usuário autenticado. */
export async function atualizarBloqueioForaDaArea(bloquear: boolean): Promise<boolean> {
  const { data } = await api.patch<{ sucesso: boolean; bloquearForaDaArea: boolean }>(
    '/api/lojas/bloqueio-fora-da-area',
    { bloquearForaDaArea: bloquear }
  );
  return data.bloquearForaDaArea;
}

// ─────────────────────── Público (sem JWT) ───────────────────────

export interface ResolverRegiaoMatched {
  regiao: {
    id: string;
    nome: string;
    /** Reais. */
    taxaEntrega: number;
    pedidoMinimo: number | null;
    tempoEstimadoMinutos: number | null;
  };
  lojaTemRegioes: boolean;
  bloqueante: boolean;
}

export interface ResolverRegiaoFallback {
  regiao: null;
  taxaFallback: number;
  lojaTemRegioes: boolean;
  bloqueante: false;
  mensagem?: string;
}

export interface ResolverRegiaoBloqueado {
  regiao: null;
  lojaTemRegioes: true;
  bloqueante: true;
  mensagem: string;
}

export type ResolverRegiaoResposta =
  | ResolverRegiaoMatched
  | ResolverRegiaoFallback
  | ResolverRegiaoBloqueado;

export async function resolverRegiaoPorEndereco(params: {
  lojaPublicKey: string;
  bairro: string;
  cidade: string;
}): Promise<ResolverRegiaoResposta> {
  const { lojaPublicKey, bairro, cidade } = params;
  const { data } = await api.get<ResolverRegiaoResposta>(
    `/api/public/delivery/regiao/${encodeURIComponent(lojaPublicKey)}`,
    { params: { bairro, cidade } }
  );
  return data;
}
