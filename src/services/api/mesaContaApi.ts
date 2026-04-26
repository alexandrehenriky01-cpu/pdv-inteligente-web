import { api } from '../api';

/** Payload alinhado a `ItemAdicionarMesaBody` no backend. */
export interface ItemAdicionarNaMesaDto {
  produtoId?: string;
  itemCardapioId?: string;
  quantidade: number;
  observacao?: string;
  adicionais?: Array<{
    adicionalCardapioId?: string;
    itemCardapioAdicionalId?: string;
    quantidade: number;
  }>;
  valorUnitario?: number;
  valorTotal?: number;
  itemCardapioTamanhoId?: string;
  partidoAoMeio?: boolean;
  sabores?: Array<{ itemCardapioId: string }>;
  /** Ignorado pelo backend; útil para ticket / debug no garçom. */
  nome?: string;
}

export interface AdicionarItensMesaResponse {
  message?: string;
  ticketHtml?: string;
}

export async function adicionarItensNaMesa(
  numeroMesa: number,
  itens: ItemAdicionarNaMesaDto[]
): Promise<AdicionarItensMesaResponse> {
  const { data } = await api.post<AdicionarItensMesaResponse>(
    `/api/pdv/mesas/${numeroMesa}/adicionar`,
    { itens }
  );
  return data;
}

export async function atualizarQuantidadeItemNaMesa(
  numeroMesa: number,
  itemMesaId: string,
  quantidade: number
): Promise<void> {
  await api.patch(`/api/pdv/mesas/${numeroMesa}/itens/${itemMesaId}`, { quantidade });
}
