import { api } from '../../../services/api';

const BASE = '/api/rh-operacional';

export type RhDivergenciaTipo =
  | 'MARCACAO_FORA_JORNADA'
  | 'EXCESSO_HORAS_EXTRAS'
  | 'FALHA_BIOMETRIA_EXCESSIVA'
  | 'FALLBACK_PIN_EXCESSIVO'
  | 'AUSENCIA_MARCACAO'
  | 'FECHAMENTO_PENDENTE'
  | 'FUNCIONARIO_SEM_CONSENTIMENTO'
  | 'LEITOR_OFFLINE';

export type RhDivergenciaStatus = 'ABERTA' | 'EM_REVISAO' | 'RESOLVIDA' | 'IGNORADA';
export type RhDivergenciaSeveridade = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DivergenciaView {
  readonly id: string;
  readonly tipo: RhDivergenciaTipo;
  readonly severidade: RhDivergenciaSeveridade;
  readonly status: RhDivergenciaStatus;
  readonly funcionarioId: string | null;
  readonly dataReferencia: string;
  readonly detalhe: string;
  readonly metadadoJson: string | null;
  readonly resolvidoEm: string | null;
  readonly resolvidoPorUserId: string | null;
  readonly resolucaoNota: string | null;
  readonly createdAt: string;
}

export interface DashboardIndicadoresView {
  readonly funcionariosAtivos: number;
  readonly presentesHoje: number;
  readonly justificativasPendentes: number;
  readonly ajustesPendentes: number;
  readonly fechamentosAtrasados: number;
  readonly assinaturasPendentes: number;
  readonly saldoBancoMinutosTotal: number;
  readonly funcionariosSemConsentimento: number;
  readonly biometriaAtivos: number;
  readonly divergencias: {
    readonly abertas: number;
    readonly emRevisao: number;
    readonly resolvidasHoje: number;
    readonly porSeveridade: Record<RhDivergenciaSeveridade, number>;
    readonly porTipo: ReadonlyArray<{ tipo: RhDivergenciaTipo; count: number }>;
  };
}

export interface AssinaturaView {
  readonly id: string;
  readonly tipoAssinatura: 'FUNCIONARIO' | 'GESTOR' | 'RH';
  readonly versaoFechamento: number;
  readonly hashDocumento: string;
  readonly hashAssinatura: string;
  readonly signedAt: string;
  readonly signedByUsuarioId: string;
}

export interface IntegridadeFechamentoView {
  readonly ok: boolean;
  readonly documentoOk: boolean;
  readonly assinaturas: ReadonlyArray<{ id: string; tipo: 'FUNCIONARIO' | 'GESTOR' | 'RH'; ok: boolean }>;
}

export async function getDashboard() {
  const { data } = await api.get<{ sucesso: true; indicadores: DashboardIndicadoresView }>(`${BASE}/dashboard`);
  return data.indicadores;
}

export async function listDivergencias(params: {
  status?: RhDivergenciaStatus;
  severidade?: RhDivergenciaSeveridade;
  tipo?: RhDivergenciaTipo;
  funcionarioId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { data } = await api.get<{ sucesso: true; items: DivergenciaView[]; total: number; page: number; pageSize: number }>(
    `${BASE}/divergencias`, { params }
  );
  return data;
}

export async function detectarDivergencias(input: { desde?: string; ate?: string } = {}) {
  const { data } = await api.post<{ sucesso: true; criadas: number; detalhes: Record<string, number> }>(
    `${BASE}/divergencias/detectar`, input
  );
  return data;
}

export async function resolverDivergencia(id: string, input: { status: 'RESOLVIDA' | 'IGNORADA'; nota: string }) {
  const { data } = await api.post<{ sucesso: true; divergencia: DivergenciaView }>(
    `${BASE}/divergencias/${encodeURIComponent(id)}/resolver`, input
  );
  return data.divergencia;
}

export async function assinarFechamentoOperacional(input: { fechamentoId: string; tipoAssinatura: 'FUNCIONARIO' | 'GESTOR' | 'RH' }) {
  const { data } = await api.post<{ sucesso: true; assinatura: AssinaturaView; fechamento: { id: string; status: string; versao: number } }>(
    `${BASE}/fechamentos/assinar`, input
  );
  return data;
}

export async function reabrirFechamento(fechamentoId: string, motivo: string) {
  const { data } = await api.post<{ sucesso: true; fechamento: { id: string; status: string; versao: number } }>(
    `${BASE}/fechamentos/${encodeURIComponent(fechamentoId)}/reabrir`, { fechamentoId, motivo }
  );
  return data.fechamento;
}

export async function listAssinaturas(fechamentoId: string) {
  const { data } = await api.get<{ sucesso: true; items: AssinaturaView[] }>(
    `${BASE}/fechamentos/${encodeURIComponent(fechamentoId)}/assinaturas`
  );
  return data.items;
}

export async function verificarIntegridade(fechamentoId: string) {
  const { data } = await api.get<{ sucesso: true } & IntegridadeFechamentoView>(
    `${BASE}/fechamentos/${encodeURIComponent(fechamentoId)}/integridade`
  );
  return data;
}
