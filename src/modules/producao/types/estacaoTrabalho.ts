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
  
  // Hardware/Rede
  macAddress?: string | null;
  ip?: string | null;
  hostname?: string | null;
  sistemaOperacional?: string | null;
  
  // Monitoramento
  lastSeenAt?: string | null;
  status: string;
  
  // Impressão
  usarImpressoraPadrao: boolean;
  nomeImpressora?: string | null;
  
  modoOperacao: ModoOperacaoEstacao;
  ativo: boolean;
  observacao?: string | null;
  
  createdAt: string;
  updatedAt: string;

  // Relacionamentos (Opcionais na listagem)
  balanca?: { id: string; nome: string } | null;
  layoutEtiqueta?: { id: string; nome: string } | null;
}