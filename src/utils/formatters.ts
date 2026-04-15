/**
 * Normalização global de cadastros: strings enviadas à API em MAIÚSCULAS,
 * com exceções para e-mail, senha, textos longos/JSON e chaves explícitas.
 */
const CHAVES_IGNORAR_MAIUSCULAS = new Set([
  'email',
  'senha',
  'password',
  'observacoes',
  'obsGerais',
  'ingredientes',
  'alergenicos',
  'informacaoNutricional',
]);

const SUFIXOS_IGNORAR = ['email', 'senha', 'password'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Preserva capitalização de CUID/UUID do Prisma e referências de layout / embalagem (IDs).
 * - `id` na raiz ou aninhado
 * - qualquer chave camelCase terminada em `Id` (ex.: categoriaId, lojaId, layoutEtiquetaId)
 * - chaves cujo nome contém "layout" (ex.: layoutEtiquetaInterna com UUID)
 * - chaves cujo nome contém "embalagem" (ex.: embalagemPrimaria, embalagemSecundaria com UUID da BOM)
 */
function chaveIgnoraMaiusculas(key: string): boolean {
  const k = key.toLowerCase();
  if (key === 'id' || key.endsWith('Id')) return true;
  if (k.includes('layout')) return true;
  if (k.includes('embalagem')) return true;
  if (CHAVES_IGNORAR_MAIUSCULAS.has(k)) return true;
  return SUFIXOS_IGNORAR.some((s) => k.endsWith(s));
}

function stringIgnoraMaiusculas(key: string, val: string): boolean {
  if (chaveIgnoraMaiusculas(key)) return true;
  const t = val.trim();
  if (EMAIL_RE.test(t)) return true;
  if (t.length > 500) return true;
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) return true;
  return false;
}

function transformarValor(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return stringIgnoraMaiusculas(key, value) ? value : value.toUpperCase();
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => transformarValor(String(index), item));
  }
  if (typeof value === 'object') {
    return transformarParaMaiusculas(value);
  }
  return value;
}

/**
 * Percorre objetos e arrays recursivamente. Números, booleanos e null permanecem.
 */
// ==========================================
// FUNÇÕES DE ARREDONDAMENTO E FORMATAÇÃO
// ==========================================

export function arredondar2(valor: number): number {
  const fator = 100;
  return Math.round(valor * fator) / fator;
}

export function arredondar3(valor: number): number {
  const fator = 1000;
  return Math.round(valor * fator) / fator;
}

export function formatarMoeda(valor: number, locale: string = 'pt-BR', moeda: string = 'BRL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moeda,
  }).format(valor);
}

export function formatarData(data: Date | string, locale: string = 'pt-BR'): string {
  const dateObj = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

export function formatarDataHora(data: Date | string, locale: string = 'pt-BR'): string {
  const dateObj = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export function formatarCPFCNPJ(cpfCnpj: string): string {
  const digits = cpfCnpj.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cpfCnpj;
}

export function formatarCEP(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

export function formatarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
}

const UUID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function novoIdCarrinho(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Array.from({ length: 9 }, () => 
    UUID_CHARS.charAt(Math.floor(Math.random() * UUID_CHARS.length))
  ).join('');
  return `${timestamp}-${randomPart}`;
}

export function gerarIdUnico(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function slugificar(texto: string): string {
  const semAcentos = removerAcentos(texto);
  return semAcentos
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

export function truncarTexto(texto: string, limite: number, sufixo: string = '...'): string {
  if (texto.length <= limite) {
    return texto;
  }
  return texto.substring(0, limite - sufixo.length) + sufixo;
}

export function calcularPercentual(valor: number, total: number): number {
  if (total === 0) return 0;
  return arredondar2((valor / total) * 100);
}

export function aplicarDesconto(valor: number, percentual: number): number {
  return arredondar2(valor * (1 - percentual / 100));
}

export function calcularTroco(valorTotal: number, valorPago: number): number {
  const troco = valorPago - valorTotal;
  return troco > 0 ? arredondar2(troco) : 0;
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  funcao: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => funcao(...args), delay);
  };
}

export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  funcao: T,
  delay: number
): (...args: Parameters<T>) => void {
  let ultimoChamada = 0;
  
  return (...args: Parameters<T>) => {
    const agora = Date.now();
    if (agora - ultimoChamada >= delay) {
      ultimoChamada = agora;
      funcao(...args);
    }
  };
}

export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validarUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function parseJson<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

export function deepClone<T>(objeto: T): T {
  return JSON.parse(JSON.stringify(objeto));
}

export function mesclarObjetos<T extends Record<string, unknown>>(objetos: Partial<T>[]): Partial<T> {
  return Object.assign({}, ...objetos);
}

// ==========================================
// FUNÇÃO DE NORMALIZAÇÃO (EXISTENTE)
// ==========================================

export function transformarParaMaiusculas<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item, index) => transformarValor(String(index), item)) as T;
  }
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = transformarValor(k, v);
  }
  return out as T;
}
