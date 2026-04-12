// src/modules/producao/types/estacaoTrabalho.ts

export type ModoOperacaoEstacao =
  | 'PRODUCAO'
  | 'PESAGEM'
  | 'IMPRESSAO'
  | 'EXPEDICAO'
  | 'ADMINISTRATIVO';

export interface EstacaoTrabalho {
  id: string;
  nome: string;
  identificadorMaquina: string;
  descricao?: string | null;
  balancaId?: string | null;
  layoutEtiquetaId?: string | null;
  layoutPesagemId?: string | null;
  layoutInternaId?: string | null;
  layoutRecebimentoId?: string | null;
  layoutExpedicaoId?: string | null;

  macAddress?: string | null;
  ip?: string | null;
  nomeMaquina?: string | null;
  hostname?: string | null;
  sistemaOperacional?: string | null;

  lastSeenAt?: string | null;
  status: string;

  usarImpressoraPadrao: boolean;
  nomeImpressora?: string | null;

  modoOperacao: ModoOperacaoEstacao;
  ativo: boolean;
  observacao?: string | null;

  createdAt: string;
  updatedAt: string;

  balanca?: { id: string; nome: string } | null;
  layoutPesagem?: { id: string; nome: string } | null;
  layoutInterna?: { id: string; nome: string } | null;
  layoutRecebimento?: { id: string; nome: string } | null;
  layoutExpedicao?: { id: string; nome: string } | null;
}
