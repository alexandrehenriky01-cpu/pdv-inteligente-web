import { api } from '../../../services/api';
import type {
  BancoHorasView,
  FechamentoView,
  PontoAjusteView,
  PontoJustificativaView,
  PontoMarcacaoView,
  PontoPagedResponse,
  RhMetodoAutenticacao,
  RhStatusAjuste,
  RhStatusFechamento,
  RhStatusJustificativa,
  RhStatusMarcacao,
  RhTipoAjuste,
  RhTipoJustificativa,
  RhTipoMarcacao,
  TotaisCalculadosView,
} from '../types/ponto.types';

const BASE = '/api/rh-ponto';

// ============================================================================
// Totem
// ============================================================================

export interface TotemAuthRequest {
  readonly identificador: string;
  readonly metodo: RhMetodoAutenticacao;
  readonly pin?: string;
  readonly timezone: string;
  readonly timestampDispositivo?: string;
}

export interface TotemAuthResponse {
  readonly sucesso: true;
  readonly funcionario: { id: string; nome: string; matricula: string };
  readonly metodo: RhMetodoAutenticacao;
}

export async function totemAutenticar(input: TotemAuthRequest): Promise<TotemAuthResponse> {
  const { data } = await api.post<TotemAuthResponse>(`${BASE}/totem/autenticar`, input);
  return data;
}

export interface MarcacaoRequest {
  readonly funcionarioId: string;
  readonly tipoMarcacao: RhTipoMarcacao;
  readonly metodoAutenticacao: RhMetodoAutenticacao;
  readonly origem: 'TOTEM' | 'WEB';
  readonly timezone: string;
  readonly observacao?: string;
}

export interface MarcacaoResponse {
  readonly sucesso: true;
  readonly marcacao: PontoMarcacaoView;
  readonly comprovante: {
    readonly id: string;
    readonly codigo: string;
    readonly payload: {
      readonly codigo: string;
      readonly emitidoEm: string;
      readonly marcacao: { tipoMarcacao: string; timestampServidor: string };
      readonly funcionario: { nome: string; matricula: string };
      readonly hashIntegridade: string;
    };
  };
}

export async function totemMarcar(input: MarcacaoRequest): Promise<MarcacaoResponse> {
  const { data } = await api.post<MarcacaoResponse>(`${BASE}/totem/marcar`, input);
  return data;
}

/// Sprint 7.4 — Totem facial: backend infere tipo (entrada/intervalo/saída).
export interface MarcacaoFacialRequest {
  readonly funcionarioId: string;
  readonly timezone?: string;
  readonly observacao?: string;
}
export interface MarcacaoFacialResponse extends MarcacaoResponse {
  readonly tipoInferido: 'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA';
}
export async function totemMarcarFacial(input: MarcacaoFacialRequest): Promise<MarcacaoFacialResponse> {
  const { data } = await api.post<MarcacaoFacialResponse>(`${BASE}/totem/marcar-facial`, input);
  return data;
}

/// Sprint 7.6 — Config do Totem por loja (quais métodos aparecem).
export interface PontoConfigView {
  readonly id: string;
  readonly lojaId: string;
  readonly totemPinHabilitado: boolean;
  readonly totemQrHabilitado: boolean;
  readonly totemBiometriaHabilitado: boolean;
  readonly totemFacialHabilitado: boolean;
  readonly updatedAt: string;
}
export async function getPontoConfig(): Promise<PontoConfigView> {
  const { data } = await api.get<{ config: PontoConfigView }>(`${BASE}/configuracoes`);
  return data.config;
}
export async function updatePontoConfig(input: Partial<Pick<PontoConfigView,
  'totemPinHabilitado' | 'totemQrHabilitado' | 'totemBiometriaHabilitado' | 'totemFacialHabilitado'
>>): Promise<PontoConfigView> {
  const { data } = await api.put<{ config: PontoConfigView }>(`${BASE}/configuracoes`, input);
  return data.config;
}

// ============================================================================
// Marcações (admin)
// ============================================================================

export interface MarcacaoListQuery {
  readonly funcionarioId?: string;
  readonly status?: RhStatusMarcacao;
  readonly dataInicio?: string;
  readonly dataFim?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export function listMarcacoes(q: MarcacaoListQuery = {}): Promise<PontoPagedResponse<PontoMarcacaoView>> {
  return api.get<PontoPagedResponse<PontoMarcacaoView>>(`${BASE}/marcacoes`, { params: q }).then((r) => r.data);
}

// ============================================================================
// Banco horas
// ============================================================================

export function listBancoHoras(funcionarioId: string, params: Record<string, unknown> = {}): Promise<{
  sucesso: true;
  items: readonly BancoHorasView[];
  total: number;
  saldoAtual: number;
  page: number;
  pageSize: number;
}> {
  return api.get(`${BASE}/banco-horas/${funcionarioId}`, { params }).then((r) => r.data as {
    sucesso: true;
    items: readonly BancoHorasView[];
    total: number;
    saldoAtual: number;
    page: number;
    pageSize: number;
  });
}

export async function bancoHorasAjuste(input: { funcionarioId: string; minutos: number; observacao: string }): Promise<BancoHorasView> {
  const { data } = await api.post<{ lancamento: BancoHorasView }>(`${BASE}/banco-horas/ajuste`, input);
  return data.lancamento;
}

// ============================================================================
// Ajustes
// ============================================================================

export interface AjusteCreateInput {
  readonly funcionarioId: string;
  readonly marcacaoOriginalId?: string | null;
  readonly tipoAjuste: RhTipoAjuste;
  readonly motivo: string;
  readonly propostaTipoMarcacao: RhTipoMarcacao;
  readonly propostaTimestamp: string;
  readonly propostaObservacao?: string | null;
}

export function listAjustes(params: { funcionarioId?: string; status?: RhStatusAjuste; page?: number } = {}): Promise<PontoPagedResponse<PontoAjusteView>> {
  return api.get<PontoPagedResponse<PontoAjusteView>>(`${BASE}/ajustes`, { params }).then((r) => r.data);
}
export async function criarAjuste(input: AjusteCreateInput): Promise<PontoAjusteView> {
  const { data } = await api.post<{ ajuste: PontoAjusteView }>(`${BASE}/ajustes`, input);
  return data.ajuste;
}
export async function aprovarAjuste(id: string): Promise<PontoAjusteView> {
  const { data } = await api.post<{ ajuste: PontoAjusteView }>(`${BASE}/ajustes/${id}/aprovar`, {});
  return data.ajuste;
}
export async function rejeitarAjuste(id: string, motivo: string): Promise<PontoAjusteView> {
  const { data } = await api.post<{ ajuste: PontoAjusteView }>(`${BASE}/ajustes/${id}/rejeitar`, { motivo });
  return data.ajuste;
}

// ============================================================================
// Justificativas
// ============================================================================

export interface JustificativaCreateInput {
  readonly funcionarioId: string;
  readonly tipoJustificativa: RhTipoJustificativa;
  readonly dataReferencia: string;
  readonly motivo: string;
  readonly observacao?: string | null;
}

export function listJustificativas(params: { funcionarioId?: string; status?: RhStatusJustificativa; page?: number } = {}): Promise<PontoPagedResponse<PontoJustificativaView>> {
  return api.get<PontoPagedResponse<PontoJustificativaView>>(`${BASE}/justificativas`, { params }).then((r) => r.data);
}
export async function criarJustificativa(input: JustificativaCreateInput): Promise<PontoJustificativaView> {
  const { data } = await api.post<{ justificativa: PontoJustificativaView }>(`${BASE}/justificativas`, input);
  return data.justificativa;
}
export async function aprovarJustificativa(id: string): Promise<PontoJustificativaView> {
  const { data } = await api.post<{ justificativa: PontoJustificativaView }>(`${BASE}/justificativas/${id}/aprovar`, {});
  return data.justificativa;
}
export async function rejeitarJustificativa(id: string, motivo: string): Promise<PontoJustificativaView> {
  const { data } = await api.post<{ justificativa: PontoJustificativaView }>(`${BASE}/justificativas/${id}/rejeitar`, { motivo });
  return data.justificativa;
}

// ============================================================================
// Fechamentos
// ============================================================================

export function listFechamentos(params: { funcionarioId?: string; ano?: number; mes?: number; status?: RhStatusFechamento; page?: number } = {}): Promise<PontoPagedResponse<FechamentoView>> {
  return api.get<PontoPagedResponse<FechamentoView>>(`${BASE}/fechamentos`, { params }).then((r) => r.data);
}
export async function resumoFechamento(funcionarioId: string, ano: number, mes: number): Promise<TotaisCalculadosView | null> {
  const { data } = await api.get<{ totais: TotaisCalculadosView }>(`${BASE}/fechamentos/resumo/${funcionarioId}`, { params: { ano, mes } });
  return data.totais ?? null;
}
export async function criarFechamento(input: { funcionarioId: string; ano: number; mes: number }): Promise<FechamentoView> {
  const { data } = await api.post<{ fechamento: FechamentoView }>(`${BASE}/fechamentos`, input);
  return data.fechamento;
}
export async function fecharPeriodo(id: string): Promise<FechamentoView> {
  const { data } = await api.post<{ fechamento: FechamentoView }>(`${BASE}/fechamentos/${id}/fechar`, {});
  return data.fechamento;
}
export async function assinarFechamento(id: string): Promise<FechamentoView> {
  const { data } = await api.post<{ fechamento: FechamentoView }>(`${BASE}/fechamentos/${id}/assinar`, {});
  return data.fechamento;
}

// ============================================================================
// PDFs (URLs apenas; o navegador abre via window.open ou download)
// ============================================================================

export function urlComprovantePdf(codigo: string): string {
  return `${BASE}/comprovantes/${codigo}/pdf`;
}
export function urlCartaoPontoPdf(fechamentoId: string): string {
  return `${BASE}/fechamentos/${fechamentoId}/pdf`;
}

/**
 * Baixa o PDF via axios (com JWT) e abre em nova aba.
 * `window.open` direto não enviaria o Authorization header.
 */
export async function abrirCartaoPontoPdf(fechamentoId: string): Promise<void> {
  const response = await api.get<Blob>(urlCartaoPontoPdf(fechamentoId), { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // popup blocked → cria link e clica
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartao-ponto-${fechamentoId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ============================================================================
// Config (admin)
// ============================================================================

export async function definirPin(funcionarioId: string, pin: string): Promise<void> {
  await api.post(`${BASE}/config/pin`, { funcionarioId, pin });
}
export async function emitirQrToken(funcionarioId: string): Promise<string> {
  const { data } = await api.post<{ token: string }>(`${BASE}/config/qr/${funcionarioId}`, {});
  return data.token;
}
