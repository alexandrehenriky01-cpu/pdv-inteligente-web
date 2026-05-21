import { api } from '../../../services/api';

const BASE = '/api/rh-portal';

export interface PortalFuncionario {
  readonly id: string;
  readonly nome: string;
  readonly matricula: string;
  readonly cpf: string;
  readonly cargoId: string | null;
  readonly departamentoId: string | null;
  readonly dataAdmissao: string;
}

export interface PortalMarcacao {
  readonly id: string;
  readonly tipoMarcacao: 'ENTRADA' | 'SAIDA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO';
  readonly status: string;
  readonly timestampServidor: string;
  readonly metodoAutenticacao: string;
  readonly codigoComprovante: string;
  readonly origem: string;
}

export interface PortalBancoHorasLanc {
  readonly id: string;
  readonly tipo: string;
  readonly minutos: number;
  readonly dataReferencia: string;
  readonly observacao: string | null;
}

export interface PortalFechamento {
  readonly id: string;
  readonly ano: number;
  readonly mes: number;
  readonly status: 'ABERTO' | 'FECHADO' | 'ASSINADO' | 'CANCELADO';
  readonly versao: number;
  readonly hashDocumento: string | null;
  readonly totalHorasMinutos: number;
  readonly totalExtrasMinutos: number;
  readonly totalFaltasMinutos: number;
  readonly totalAtrasosMinutos: number;
  readonly saldoBancoMinutos: number;
  readonly assinaturas: ReadonlyArray<{
    readonly id: string;
    readonly tipoAssinatura: 'FUNCIONARIO' | 'GESTOR' | 'RH';
    readonly versaoFechamento: number;
    readonly signedAt: string;
    readonly hashAssinatura: string;
  }>;
}

export interface PortalJustificativa {
  readonly id: string;
  readonly tipoJustificativa: string;
  readonly dataReferencia: string;
  readonly motivo: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface PortalConsentimento {
  readonly id: string;
  readonly tipo: string;
  readonly versaoTermo: string;
  readonly status: string;
  readonly dataAceite: string;
  readonly revokedAt: string | null;
}

export interface PortalBiometria {
  readonly id: string;
  readonly dedoLabel: string;
  readonly qualityScore: number;
  readonly providerHint: string;
  readonly enrolledAt: string;
  readonly revokedAt: string | null;
}

export interface PortalComprovanteResumo {
  readonly codigo: string;
  readonly emitidoEm: string;
  readonly hashIntegridade: string;
  readonly marcacaoId: string;
}

export async function meuPerfil(): Promise<{ sucesso: true; funcionario: PortalFuncionario }> {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario }>(`${BASE}/meu-perfil`);
  return data;
}

export async function minhasMarcacoes(params: { ano?: number; mes?: number; page?: number; pageSize?: number } = {}) {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalMarcacao[]; total: number }>(`${BASE}/minhas-marcacoes`, { params });
  return data;
}

export async function meuBancoHoras() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; saldoMinutos: number; lancamentos: PortalBancoHorasLanc[] }>(`${BASE}/meu-banco-horas`);
  return data;
}

export async function meusFechamentos() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalFechamento[] }>(`${BASE}/meus-fechamentos`);
  return data;
}

export async function minhasJustificativas() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalJustificativa[] }>(`${BASE}/minhas-justificativas`);
  return data;
}

export async function meusConsentimentos() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalConsentimento[] }>(`${BASE}/meus-consentimentos`);
  return data;
}

export async function minhaBiometria() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalBiometria[] }>(`${BASE}/minha-biometria`);
  return data;
}

export async function meusComprovantes() {
  const { data } = await api.get<{ sucesso: true; funcionario: PortalFuncionario; items: PortalComprovanteResumo[] }>(`${BASE}/meus-comprovantes`);
  return data;
}

export async function assinarMeuFechamento(fechamentoId: string) {
  const { data } = await api.post<{ sucesso: true; assinatura: PortalFechamento['assinaturas'][number]; fechamento: PortalFechamento }>(
    `${BASE}/meus-fechamentos/${encodeURIComponent(fechamentoId)}/assinar`, {}
  );
  return data;
}
