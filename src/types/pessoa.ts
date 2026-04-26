
import { type Dispatch, type SetStateAction } from 'react';
export type TipoPessoa = 'FISICA' | 'JURIDICA' | 'CLIENTE' | 'FORNECEDOR' | 'AMBOS' | 'FUNCIONARIO';
export type RegimeTributario = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | '';

// 🚀 NOVO: Enum exato mapeado do backend
export type IndicadorIE = 'CONTRIBUINTE' | 'NAO_CONTRIBUINTE' | 'ISENTO';

export interface IPessoa {
  id?: string;
  codigo?: string; // 🚀 ADICIONADO: Agora o TypeScript reconhece o código!
  tipo: TipoPessoa;
  cpfCnpj: string;
  cnpjCpf?: string;
  razaoSocial: string;
  nomeFantasia: string;
  
  // 🚀 NOVO: Adicionado ao contrato para o payload não falhar
  indicadorIE: IndicadorIE;
  
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regimeTributario: RegimeTributario;
  cnae: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  contatoPrincipal: string;
  limiteCredito: string | number;
  prazoPadrao: string | number;
  observacoes: string;
  obsGerais?: string;
  /** SIF / SISP / SIE / SIM — fornecedores */
  registroSanitario?: string;
  /** Federal | Estadual | Municipal */
  tipoInspecao?: string;
  contaClienteId?: string;
  contaFornecedorId?: string;
  contaCliente?: { id?: string; nomeConta: string; codigoEstrutural: string };
  contaFornecedor?: { id?: string; nomeConta: string; codigoEstrutural: string };
  /** Vínculo à conta analítica genérica CONSUMIDOR FINAL (sem conta nominal). */
  consumidorFinal?: boolean;
}

export interface IIASugestoes {
  tipo: string;
  categoria: string;
  risco: string;
  prazo: string;
  insights: string[];
}

export interface ICnpjResponse {
  razao_social?: string;
  nome?: string;
  nome_fantasia?: string;
  fantasia?: string;
  cnae_fiscal?: string;
  atividade_principal?: Array<{ code: string; text: string }>;
  natureza_juridica?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  ddd_telefone_1?: string;
  telefone?: string;
  email?: string;
  descricao_situacao_cadastral?: string;
  situacao?: string;
  cnae_fiscal_descricao?: string;
}

export interface IViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface IApiError {
  erro?: string;
  error?: string;
  mensagem?: string;
  message?: string;
}

export interface IFormPessoaProps {
  formData: IPessoa;
  setFormData: Dispatch<SetStateAction<IPessoa>>;
  inputClass: string;
  labelClass: string;
}