/**
 * Tipagens do módulo RH Core. Espelha exatamente o que o backend devolve
 * (apenas campos serializáveis — datas vêm como string ISO).
 */

export type RhFuncionarioStatus = 'ATIVO' | 'INATIVO' | 'AFASTADO' | 'DEMITIDO';
export type RhTipoContrato = 'CLT' | 'PJ' | 'ESTAGIO' | 'TEMPORARIO' | 'AUTONOMO';
export type RhTipoJornada = 'FIXA' | 'ESCALA' | 'FLEXIVEL';
export type RhDiaSemana = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO' | 'DOMINGO';
export type RhTipoDocumento = 'RG' | 'CPF' | 'CTPS' | 'PIS' | 'CONTRATO' | 'ASO' | 'OUTRO';
export type RhConsentimentoTipo = 'BIOMETRIA' | 'DOCUMENTOS' | 'HOLERITE_DIGITAL' | 'ASSINATURA_DIGITAL';
export type RhConsentimentoStatus = 'ATIVO' | 'REVOGADO' | 'EXPIRADO';

export interface RhDepartamentoView {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly ativo: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface RhCargoView {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly cbo: string | null;
  readonly departamentoId: string | null;
  readonly departamento?: { readonly id: string; readonly codigo: string; readonly nome: string } | null;
  readonly ativo: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface RhJornadaDiaView {
  readonly id: string;
  readonly diaSemana: RhDiaSemana;
  readonly horaInicio: string;
  readonly horaFim: string;
  readonly intervaloMin: number;
}

export interface RhJornadaView {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly tipoJornada: RhTipoJornada;
  readonly horasSemanais: string | number;
  readonly intervaloMinutos: number;
  readonly ativo: boolean;
  readonly diasJornada: readonly RhJornadaDiaView[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface RhEscalaView {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly descricao: string | null;
  readonly dataInicio: string;
  readonly dataFim: string | null;
  readonly ativo: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface RhFuncionarioListItem {
  readonly id: string;
  readonly matricula: string;
  readonly nome: string;
  readonly cpf: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly status: RhFuncionarioStatus;
  readonly tipoContrato: RhTipoContrato;
  readonly dataAdmissao: string;
  readonly dataDemissao: string | null;
  readonly salarioBase: string | number | null;
  readonly departamento: { readonly id: string; readonly nome: string } | null;
  readonly cargo: { readonly id: string; readonly nome: string } | null;
  readonly jornada: { readonly id: string; readonly nome: string } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type RhFuncionarioDetail = RhFuncionarioListItem;

export interface RhDocumentoView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly tipoDocumento: RhTipoDocumento;
  readonly numero: string | null;
  readonly emissor: string | null;
  readonly dataEmissao: string | null;
  readonly dataValidade: string | null;
  readonly nomeArquivo: string | null;
  readonly hashConteudo: string | null;
  readonly arquivoMime: string | null;
  readonly observacoes: string | null;
  readonly uploadedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RhConsentimentoView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly tipo: RhConsentimentoTipo;
  readonly versaoTermo: string;
  readonly hashTermo: string;
  readonly dataAceite: string;
  readonly status: RhConsentimentoStatus;
  readonly origem: string | null;
  readonly revokedAt: string | null;
  readonly motivoRevogacao: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RhPagedResponse<T> {
  readonly sucesso: true;
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
