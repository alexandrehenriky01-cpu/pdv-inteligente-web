import { api } from '../../../services/api';
import type {
  RhCargoView,
  RhConsentimentoTipo,
  RhConsentimentoView,
  RhDepartamentoView,
  RhDocumentoView,
  RhEscalaView,
  RhFuncionarioDetail,
  RhFuncionarioListItem,
  RhFuncionarioStatus,
  RhJornadaView,
  RhPagedResponse,
  RhTipoContrato,
  RhTipoDocumento,
  RhTipoJornada,
} from '../types/rh.types';

const BASE = '/api/rh';

async function getList<T>(path: string, params?: Record<string, unknown>): Promise<RhPagedResponse<T>> {
  const response = await api.get<RhPagedResponse<T>>(`${BASE}${path}`, { params });
  return response.data;
}

// ============================================================================
// Departamentos
// ============================================================================

export interface DepartamentoFormInput {
  readonly codigo: string;
  readonly nome: string;
  readonly descricao?: string | null;
  readonly ativo?: boolean;
}

export function listDepartamentos(query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhDepartamentoView>> {
  return getList<RhDepartamentoView>('/departamentos', query);
}
export async function createDepartamento(input: DepartamentoFormInput): Promise<RhDepartamentoView> {
  const { data } = await api.post<{ departamento: RhDepartamentoView }>(`${BASE}/departamentos`, input);
  return data.departamento;
}
export async function updateDepartamento(id: string, input: Partial<DepartamentoFormInput>): Promise<RhDepartamentoView> {
  const { data } = await api.put<{ departamento: RhDepartamentoView }>(`${BASE}/departamentos/${id}`, input);
  return data.departamento;
}
export async function deleteDepartamento(id: string): Promise<void> {
  await api.delete(`${BASE}/departamentos/${id}`);
}

// ============================================================================
// Cargos
// ============================================================================

export interface CargoFormInput {
  readonly codigo: string;
  readonly nome: string;
  readonly descricao?: string | null;
  readonly cbo?: string | null;
  readonly departamentoId?: string | null;
  readonly ativo?: boolean;
}

export function listCargos(query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhCargoView>> {
  return getList<RhCargoView>('/cargos', query);
}
export async function createCargo(input: CargoFormInput): Promise<RhCargoView> {
  const { data } = await api.post<{ cargo: RhCargoView }>(`${BASE}/cargos`, input);
  return data.cargo;
}
export async function updateCargo(id: string, input: Partial<CargoFormInput>): Promise<RhCargoView> {
  const { data } = await api.put<{ cargo: RhCargoView }>(`${BASE}/cargos/${id}`, input);
  return data.cargo;
}
export async function deleteCargo(id: string): Promise<void> {
  await api.delete(`${BASE}/cargos/${id}`);
}

// ============================================================================
// Jornadas
// ============================================================================

export interface JornadaFormInput {
  readonly codigo: string;
  readonly nome: string;
  readonly tipoJornada: RhTipoJornada;
  readonly horasSemanais: number;
  readonly intervaloMinutos?: number;
  readonly descricao?: string | null;
  readonly diasJornada?: ReadonlyArray<{
    readonly diaSemana: RhJornadaView['diasJornada'][number]['diaSemana'];
    readonly horaInicio: string;
    readonly horaFim: string;
    readonly intervaloMin: number;
  }>;
  readonly ativo?: boolean;
}

export function listJornadas(query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhJornadaView>> {
  return getList<RhJornadaView>('/jornadas', query);
}
export async function createJornada(input: JornadaFormInput): Promise<RhJornadaView> {
  const { data } = await api.post<{ jornada: RhJornadaView }>(`${BASE}/jornadas`, input);
  return data.jornada;
}
export async function updateJornada(id: string, input: Partial<JornadaFormInput>): Promise<RhJornadaView> {
  const { data } = await api.put<{ jornada: RhJornadaView }>(`${BASE}/jornadas/${id}`, input);
  return data.jornada;
}
export async function deleteJornada(id: string): Promise<void> {
  await api.delete(`${BASE}/jornadas/${id}`);
}

// ============================================================================
// Escalas
// ============================================================================

export interface EscalaFormInput {
  readonly codigo: string;
  readonly nome: string;
  readonly descricao?: string | null;
  readonly dataInicio: string;
  readonly dataFim?: string | null;
  readonly ativo?: boolean;
}

export function listEscalas(query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhEscalaView>> {
  return getList<RhEscalaView>('/escalas', query);
}
export async function createEscala(input: EscalaFormInput): Promise<RhEscalaView> {
  const { data } = await api.post<{ escala: RhEscalaView }>(`${BASE}/escalas`, input);
  return data.escala;
}
export async function updateEscala(id: string, input: Partial<EscalaFormInput>): Promise<RhEscalaView> {
  const { data } = await api.put<{ escala: RhEscalaView }>(`${BASE}/escalas/${id}`, input);
  return data.escala;
}
export async function deleteEscala(id: string): Promise<void> {
  await api.delete(`${BASE}/escalas/${id}`);
}

// ============================================================================
// Funcionários
// ============================================================================

export interface FuncionarioFormInput {
  readonly matricula: string;
  readonly nome: string;
  readonly cpf: string;
  readonly rg?: string | null;
  readonly email?: string | null;
  readonly telefone?: string | null;
  readonly dataNascimento?: string | null;
  readonly dataAdmissao: string;
  readonly dataDemissao?: string | null;
  readonly tipoContrato: RhTipoContrato;
  readonly salarioBase?: number | null;
  readonly departamentoId?: string | null;
  readonly cargoId?: string | null;
  readonly jornadaId?: string | null;
  readonly observacoes?: string | null;
  readonly status?: RhFuncionarioStatus;
}

export interface FuncionarioListQuery {
  readonly search?: string;
  readonly status?: RhFuncionarioStatus;
  readonly departamentoId?: string;
  readonly cargoId?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly orderBy?: 'nome' | 'matricula' | 'dataAdmissao' | 'createdAt';
  readonly orderDir?: 'asc' | 'desc';
  readonly includeDeleted?: boolean;
}

export function listFuncionarios(query: FuncionarioListQuery = {}): Promise<RhPagedResponse<RhFuncionarioListItem>> {
  return getList<RhFuncionarioListItem>('/funcionarios', query as Record<string, unknown>);
}
export async function getFuncionario(id: string): Promise<RhFuncionarioDetail> {
  const { data } = await api.get<{ funcionario: RhFuncionarioDetail }>(`${BASE}/funcionarios/${id}`);
  return data.funcionario;
}
export async function createFuncionario(input: FuncionarioFormInput): Promise<RhFuncionarioDetail> {
  const { data } = await api.post<{ funcionario: RhFuncionarioDetail }>(`${BASE}/funcionarios`, input);
  return data.funcionario;
}
export async function updateFuncionario(id: string, input: Partial<FuncionarioFormInput>): Promise<RhFuncionarioDetail> {
  const { data } = await api.put<{ funcionario: RhFuncionarioDetail }>(`${BASE}/funcionarios/${id}`, input);
  return data.funcionario;
}
export async function deleteFuncionario(id: string): Promise<void> {
  await api.delete(`${BASE}/funcionarios/${id}`);
}
export async function demitirFuncionario(id: string, dataDemissao?: string): Promise<RhFuncionarioDetail> {
  const { data } = await api.post<{ funcionario: RhFuncionarioDetail }>(`${BASE}/funcionarios/${id}/demitir`, { dataDemissao });
  return data.funcionario;
}
export async function reativarFuncionario(id: string): Promise<RhFuncionarioDetail> {
  const { data } = await api.post<{ funcionario: RhFuncionarioDetail }>(`${BASE}/funcionarios/${id}/reativar`, {});
  return data.funcionario;
}

// ============================================================================
// Documentos
// ============================================================================

export const DOCUMENTO_MIMES_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
] as const;
export type DocumentoMime = (typeof DOCUMENTO_MIMES_ACEITOS)[number];
export const DOCUMENTO_MAX_BYTES = 2 * 1024 * 1024;

export interface DocumentoFormInput {
  readonly funcionarioId: string;
  readonly tipoDocumento: RhTipoDocumento;
  readonly numero?: string | null;
  readonly emissor?: string | null;
  readonly dataEmissao?: string | null;
  readonly dataValidade?: string | null;
  readonly nomeArquivo?: string | null;
  readonly hashConteudo?: string | null;
  readonly storageRef?: string | null;
  readonly observacoes?: string | null;
  /// Conteúdo do arquivo em base64 puro (sem prefixo data:). Opcional.
  readonly arquivoBase64?: string | null;
  readonly arquivoMime?: DocumentoMime | null;
}

export function listDocumentos(funcionarioId: string, query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhDocumentoView>> {
  return getList<RhDocumentoView>(`/funcionarios/${funcionarioId}/documentos`, query);
}
export async function createDocumento(input: DocumentoFormInput): Promise<RhDocumentoView> {
  const { data } = await api.post<{ documento: RhDocumentoView }>(`${BASE}/documentos`, input);
  return data.documento;
}
export async function deleteDocumento(id: string): Promise<void> {
  await api.delete(`${BASE}/documentos/${id}`);
}
/// Baixa o arquivo binário do documento. Retorna o Blob para download/preview.
export async function downloadDocumento(id: string): Promise<{ blob: Blob; filename: string }> {
  const resp = await api.get<Blob>(`${BASE}/documentos/${id}/arquivo`, { responseType: 'blob' });
  const cd = resp.headers['content-disposition'] as string | undefined;
  const match = cd ? /filename="([^"]+)"/u.exec(cd) : null;
  const filename = match ? decodeURIComponent(match[1]) : `documento-${id}`;
  return { blob: resp.data, filename };
}
/// Lê um File e devolve seu conteúdo em base64 puro (sem prefixo data:).
export function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('Falha ao ler arquivo.'));
    reader.onload = (): void => {
      const result = String(reader.result ?? '');
      const idx = result.indexOf(',');
      const base64 = idx >= 0 ? result.slice(idx + 1) : result;
      resolve({ base64, mime: file.type || 'application/octet-stream' });
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Consentimentos
// ============================================================================

export interface ConsentimentoFormInput {
  readonly funcionarioId: string;
  readonly tipo: RhConsentimentoTipo;
  readonly versaoTermo: string;
  readonly hashTermo: string;
  readonly dataAceite: string;
  readonly origem?: string | null;
}

export function listConsentimentos(funcionarioId: string, query: Record<string, unknown> = {}): Promise<RhPagedResponse<RhConsentimentoView>> {
  return getList<RhConsentimentoView>(`/funcionarios/${funcionarioId}/consentimentos`, query);
}
export async function recordConsentimento(input: ConsentimentoFormInput): Promise<RhConsentimentoView> {
  const { data } = await api.post<{ consentimento: RhConsentimentoView }>(`${BASE}/consentimentos`, input);
  return data.consentimento;
}
export async function revogarConsentimento(id: string, motivoRevogacao: string): Promise<RhConsentimentoView> {
  const { data } = await api.post<{ consentimento: RhConsentimentoView }>(`${BASE}/consentimentos/${id}/revogar`, { motivoRevogacao });
  return data.consentimento;
}
