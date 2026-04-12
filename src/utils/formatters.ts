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
