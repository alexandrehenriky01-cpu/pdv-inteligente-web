import { api } from '../../../services/api';

export type RomaneioCaixaStatus = 'ABERTO' | 'EM_ROTA' | 'FINALIZADO';

export interface EntregadorCaixa {
  id: string;
  nome: string;
}

export interface RomaneioCaixaResumo {
  id: string;
  uuid: string;
  status: RomaneioCaixaStatus;
  entregador: EntregadorCaixa | null;
  totalPedidos: number;
  totalValor: number;
  totalEntregues: number;
  totalPendentes: number;
  dataSaida: string | null;
  dataFechamento: string | null;
  createdAt: string;
}

export async function listarEntregadores(): Promise<EntregadorCaixa[]> {
  const { data } = await api.get<{ ok: boolean; entregadores: EntregadorCaixa[] }>(
    '/api/entregas/romaneios/caixa/entregadores'
  );
  return data.entregadores ?? [];
}

export async function listarRomaneiosCaixa(
  status?: RomaneioCaixaStatus
): Promise<RomaneioCaixaResumo[]> {
  const { data } = await api.get<{ ok: boolean; romaneios: RomaneioCaixaResumo[] }>(
    '/api/entregas/romaneios/caixa',
    { params: status ? { status } : {} }
  );
  return data.romaneios ?? [];
}

export async function registrarSaidaRomaneio(
  romaneioId: string,
  entregadorId: string
): Promise<void> {
  await api.post(`/api/entregas/romaneios/${romaneioId}/sair`, { entregadorId });
}

export async function finalizarRomaneio(romaneioId: string): Promise<void> {
  await api.post(`/api/entregas/romaneios/${romaneioId}/finalizar`);
}
