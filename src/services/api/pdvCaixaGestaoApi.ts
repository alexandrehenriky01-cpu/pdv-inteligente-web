import { api } from '../api';

/**
 * Chamadas PDV/caixa e estações para a gestão de turnos.
 * Importa `api` de `../api` (arquivo) para não colidir com a pasta `services/api/`.
 */

export async function getPdvCaixaSessoesHoje<T>(): Promise<T> {
  const { data } = await api.get<T>('/api/pdv/caixa/sessoes', { params: { hoje: 1 } });
  return data;
}

export async function getEstacoesTrabalhoLista(): Promise<unknown> {
  const { data } = await api.get<unknown>('/api/estacoes-trabalho');
  return data;
}

export async function postPdvCaixaAbrirManual(payload: {
  estacaoTrabalhoId: string;
  saldoAbertura: number;
  observacao?: string;
}): Promise<{ id: string; terminal?: string | null }> {
  const { data } = await api.post<{ id: string; terminal?: string | null }>(
    '/api/pdv/caixa/abrir-manual',
    payload
  );
  return data;
}

export async function getPdvCaixaResumoSessao<T>(sessaoId: string): Promise<T> {
  const id = sessaoId.trim();
  const { data } = await api.get<T>(`/api/pdv/caixa/sessoes/${encodeURIComponent(id)}/resumo`);
  return data;
}
