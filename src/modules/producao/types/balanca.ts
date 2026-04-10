// ===============================
// ENUMS E TIPOS LITERAIS
// ===============================

export const TIPOS_CONEXAO_BALANCA = [
  'SERIAL',
  'USB',
  'TCP_IP',
  'HID',
  'TECLADO',
] as const;
export type TipoConexaoBalanca = typeof TIPOS_CONEXAO_BALANCA[number];

export const PROTOCOLOS_BALANCA = [
  'TOLEDO',
  'FILIZOLA',
  'URANO',
  'GERTEC',
  'ELGIN',
  'CUSTOM',
] as const;
export type ProtocoloBalanca = typeof PROTOCOLOS_BALANCA[number];

export const UNIDADES_PESO_BALANCA = ['KG', 'G'] as const;
export type UnidadePesoBalanca = typeof UNIDADES_PESO_BALANCA[number];

export const PARIDADES_BALANCA = ['NONE', 'EVEN', 'ODD'] as const;
export type ParidadeBalanca = typeof PARIDADES_BALANCA[number];

// ✅ AQUI ESTÁ O STATUS QUE FALTAVA PARA A TELA:
export const STATUS_BALANCA = ['ativo', 'inativo'] as const;
export type StatusBalanca = typeof STATUS_BALANCA[number];


// ===============================
// MODEL PRINCIPAL
// ===============================
export interface Balanca {
  id: string;
  lojaId: string;
  nome: string;
  
  // ✅ AQUI ESTÃO OS "| null" PARA ALINHAR COM O PRISMA
  descricao?: string | null;
  modelo?: string | null;
  fabricante?: string | null;
  numeroSerie?: string | null;
  
  tipoConexao: TipoConexaoBalanca;

  // SERIAL / USB
  portaCom?: string | null;
  baudRate?: number | null;
  dataBits?: number | null;
  stopBits?: number | null;
  parity?: ParidadeBalanca | null;

  // TCP/IP
  ip?: string | null;
  portaTcp?: number | null;

  protocolo: ProtocoloBalanca;
  unidadePeso: UnidadePesoBalanca;
  
  timeoutLeitura?: number | null;
  tolerancia?: number | null;

  ativo: boolean;
  observacao?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// ===============================
// DTOs (APLICANDO DRY COM OMIT - CORRIGIDO TS2430)
// ===============================

// Herda tudo de Balanca, exceto os campos gerados pelo banco e o 'ativo'
export interface CriarBalancaDTO extends Omit<Balanca, 'id' | 'lojaId' | 'createdAt' | 'updatedAt' | 'ativo'> {
  // Recriamos o 'ativo' aqui como opcional para a criação
  ativo?: boolean;
}

// O Partial faz com que todos os campos do Criar fiquem opcionais para o Update
export interface AtualizarBalancaDTO extends Partial<CriarBalancaDTO> {}

// ===============================
// FILTROS
// ===============================
export interface FiltroBalanca {
  busca?: string;
  status?: StatusBalanca;
  tipoConexao?: TipoConexaoBalanca;
}