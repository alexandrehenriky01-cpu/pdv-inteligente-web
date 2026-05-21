export type RhTipoMarcacao = 'ENTRADA' | 'SAIDA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO';
export type RhStatusMarcacao = 'VALIDA' | 'AJUSTADA' | 'PENDENTE' | 'REJEITADA';
export type RhTipoAjuste = 'ESQUECIMENTO' | 'CORRECAO' | 'ABONO' | 'SISTEMA' | 'OUTRO';
export type RhStatusAjuste = 'PENDENTE' | 'APROVADO' | 'REJEITADO';
export type RhTipoJustificativa = 'ATRASO' | 'FALTA' | 'SAIDA_ANTECIPADA' | 'ESQUECIMENTO' | 'OUTRO';
export type RhStatusJustificativa = 'PENDENTE' | 'APROVADA' | 'REJEITADA';
export type RhStatusFechamento = 'ABERTO' | 'FECHADO' | 'ASSINADO' | 'CANCELADO';
export type RhOrigemPonto = 'TOTEM' | 'WEB' | 'MOBILE_FUTURO';
export type RhMetodoAutenticacao = 'PIN' | 'QR' | 'MATRICULA' | 'BIOMETRIA';
export type RhTipoLancamentoBancoHoras = 'CREDITO' | 'DEBITO' | 'AJUSTE' | 'FECHAMENTO';

export interface PontoMarcacaoView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly tipoMarcacao: RhTipoMarcacao;
  readonly status: RhStatusMarcacao;
  readonly timestampServidor: string;
  readonly timestampDispositivo: string | null;
  readonly timezone: string;
  readonly origem: RhOrigemPonto;
  readonly metodoAutenticacao: RhMetodoAutenticacao;
  readonly codigoComprovante: string;
  readonly hashIntegridadePrefix: string;
  readonly observacao: string | null;
}

export interface PontoAjusteView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly marcacaoOriginalId: string | null;
  readonly tipoAjuste: RhTipoAjuste;
  readonly status: RhStatusAjuste;
  readonly motivo: string;
  readonly propostaTipoMarcacao: RhTipoMarcacao;
  readonly propostaTimestamp: string;
  readonly solicitadoEm: string;
  readonly aprovadoEm: string | null;
  readonly rejeitadoEm: string | null;
}

export interface PontoJustificativaView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly tipoJustificativa: RhTipoJustificativa;
  readonly status: RhStatusJustificativa;
  readonly dataReferencia: string;
  readonly motivo: string;
  readonly observacao: string | null;
}

export interface BancoHorasView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly tipo: RhTipoLancamentoBancoHoras;
  readonly minutos: number;
  readonly saldoAposMinutos: number;
  readonly dataReferencia: string;
  readonly origem: string;
  readonly observacao: string | null;
  readonly createdAt: string;
}

export interface FechamentoView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly ano: number;
  readonly mes: number;
  readonly status: RhStatusFechamento;
  readonly totalHorasMinutos: number;
  readonly totalExtrasMinutos: number;
  readonly totalFaltasMinutos: number;
  readonly totalAtrasosMinutos: number;
  readonly saldoBancoMinutos: number;
  readonly fechadoEm: string | null;
  readonly assinadoEm: string | null;
  readonly hashAssinatura: string | null;
}

export interface DiaCalculadoView {
  readonly data: string;
  readonly diaSemana: string;
  readonly trabalhouMinutos: number;
  readonly intervaloMinutos: number;
  readonly esperadoMinutos: number;
  readonly extrasMinutos: number;
  readonly faltaMinutos: number;
  readonly atrasoMinutos: number;
  readonly sequenciaValida: boolean;
  readonly observacao: string | null;
}

export interface TotaisCalculadosView {
  readonly totalTrabalhadoMinutos: number;
  readonly totalEsperadoMinutos: number;
  readonly totalExtrasMinutos: number;
  readonly totalFaltasMinutos: number;
  readonly totalAtrasosMinutos: number;
  readonly saldoBancoMinutos: number;
  readonly dias: readonly DiaCalculadoView[];
}

export interface PontoPagedResponse<T> {
  readonly sucesso: true;
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
