/**
 * Aurya Food Images — Biblioteca Local Oficial.
 *
 * Resolve uma categoria/nome de item para um asset SVG empacotado em
 * `public/assets/food/*.svg`. Esses assets são servidos pelo Vite/Electron
 * a partir do origin da SPA, então passam pela diretiva CSP `img-src 'self'`
 * — funcionam offline e sem dependência de domínios externos.
 *
 * Estrutura:
 *   /assets/food/lanches.svg, pizzas.svg, bebidas.svg, sobremesas.svg,
 *   salgados.svg, massas.svg, sorvetes.svg, comida.svg, default.svg
 *
 * O frontend usa `resolveAuryaFoodImage()` em dois pontos:
 *   1. Quando recebe URL externa que quebra no <img onError> — substitui
 *      pelo asset local da categoria correspondente.
 *   2. Quando o backend não retorna nenhuma sugestão de imagem (último
 *      recurso visual antes do placeholder genérico).
 *
 * Logs estruturados emitidos:
 *   - image.fallback.selected    — asset local escolhido para uma categoria
 *   - image.local.asset.served   — asset local efetivamente servido (após onError)
 *   - image.url.invalid          — URL recebida do backend que falhou no <img>
 *   - image.asset.not_found      — categoria não mapeou para nenhum asset
 */

const KNOWN_CATEGORIES = new Set([
  'lanches',
  'pizzas',
  'bebidas',
  'sobremesas',
  'salgados',
  'massas',
  'sorvetes',
  'comida',
  'default',
]);

const CATEGORY_ALIASES: Record<string, string> = {
  // Lanches
  lanche: 'lanches',
  sanduiche: 'lanches',
  sanduiches: 'lanches',
  hamburguer: 'lanches',
  hamburgueres: 'lanches',
  burger: 'lanches',
  burgers: 'lanches',
  hotdog: 'lanches',
  hotdogs: 'lanches',
  'x-tudo': 'lanches',
  'x-burger': 'lanches',
  'x-salada': 'lanches',
  'x-bacon': 'lanches',

  // Pizzas
  pizza: 'pizzas',

  // Bebidas
  bebida: 'bebidas',
  drink: 'bebidas',
  drinks: 'bebidas',
  refrigerante: 'bebidas',
  refrigerantes: 'bebidas',
  refri: 'bebidas',
  suco: 'bebidas',
  sucos: 'bebidas',
  agua: 'bebidas',
  cerveja: 'bebidas',
  cervejas: 'bebidas',
  coca: 'bebidas',
  guarana: 'bebidas',
  fanta: 'bebidas',
  sprite: 'bebidas',

  // Sobremesas
  sobremesa: 'sobremesas',
  doce: 'sobremesas',
  doces: 'sobremesas',
  bolo: 'sobremesas',
  bolos: 'sobremesas',
  torta: 'sobremesas',
  tortas: 'sobremesas',
  acai: 'sobremesas',
  pudim: 'sobremesas',
  brownie: 'sobremesas',

  // Salgados
  salgado: 'salgados',
  coxinha: 'salgados',
  coxinhas: 'salgados',
  pastel: 'salgados',
  pasteis: 'salgados',
  esfiha: 'salgados',
  esfihas: 'salgados',
  esfirra: 'salgados',
  esfirras: 'salgados',

  // Massas
  massa: 'massas',
  macarrao: 'massas',
  espaguete: 'massas',
  lasanha: 'massas',
  nhoque: 'massas',
  pasta: 'massas',

  // Sorvetes
  sorvete: 'sorvetes',
  gelado: 'sorvetes',
  gelados: 'sorvetes',
  picole: 'sorvetes',
  picoles: 'sorvetes',
  milkshake: 'sorvetes',

  // Pratos gerais
  prato: 'comida',
  pratos: 'comida',
  'prato-feito': 'comida',
  pf: 'comida',
  marmita: 'comida',
  marmitas: 'comida',
  almoco: 'comida',
  jantar: 'comida',
  refeicao: 'comida',
};

/** Normaliza texto (lower, sem acento, sem caracteres especiais, hífen). */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Estrutura de log estruturado (console + um sink opcional para
 * telemetria server-side futura). Mantemos console.* para que o
 * Electron devtools capture sem dependência adicional.
 */
type LogEventName =
  | 'image.fallback.selected'
  | 'image.local.asset.served'
  | 'image.url.invalid'
  | 'image.asset.not_found';

function emitLog(event: LogEventName, details: Record<string, unknown>): void {
  // Mantém compat com `[IA_IMAGE]` do backend e adiciona prefixo do frontend.
  const payload = { event, ...details, at: new Date().toISOString() };
  // Único console.log para facilitar grep e captura em Electron.
  console.log('[IA_IMAGE_WEB]', JSON.stringify(payload));
}

/**
 * Resolve a categoria (string livre digitada pelo operador) para uma
 * chave canônica da biblioteca. Não loga aqui — quem chama loga.
 */
export function resolveAuryaCategoryKey(rawCategoria: string | null | undefined, rawNome?: string | null): string {
  const categoria = normalize(String(rawCategoria ?? ''));
  const nome = normalize(String(rawNome ?? ''));
  const bag = `${categoria} ${nome}`.trim();

  // Match exato pelo nome canônico.
  if (KNOWN_CATEGORIES.has(categoria)) return categoria;

  // Alias direto.
  if (CATEGORY_ALIASES[categoria]) return CATEGORY_ALIASES[categoria];

  // Heurística por substring no bag (categoria + nome).
  const heuristics: Array<{ test: RegExp; key: string }> = [
    { test: /pizza/i, key: 'pizzas' },
    { test: /lanche|burger|hambur|sandu|x-tudo|x tudo|hot ?dog|cachorro quente/i, key: 'lanches' },
    { test: /bebida|refri|coca|guaran|suco|fanta|sprite|pepsi|agua|cerveja|chopp/i, key: 'bebidas' },
    { test: /sorvete|gelado|picole|milkshake/i, key: 'sorvetes' },
    { test: /sobremesa|doce|bolo|torta|acai|pudim|brownie/i, key: 'sobremesas' },
    { test: /salgado|coxinha|pastel|esfih|esfirra|kibe/i, key: 'salgados' },
    { test: /massa|macarr|espaguet|lasanha|nhoque|pasta\b/i, key: 'massas' },
    { test: /marmita|prato feito|pf\b|almoco|jantar|refeicao/i, key: 'comida' },
  ];
  for (const { test, key } of heuristics) {
    if (test.test(bag)) return key;
  }

  return 'default';
}

/**
 * URL pública para o asset local. Resolvida contra `document.baseURI` no
 * runtime para suportar:
 *   - Vite dev (`/assets/food/<key>.svg`),
 *   - Bundle Electron (`file:///.../dist/assets/food/<key>.svg`, base `./`),
 *   - Deploys com subpath (BASE_URL diferente de `/`).
 *
 * Mantém um fallback estático puro (`/assets/food/<key>.svg`) caso `document`
 * não exista (SSR/tests).
 */
function buildAssetUrl(key: string): string {
  const relative = `assets/food/${key}.svg`;
  if (typeof document !== 'undefined' && document.baseURI) {
    try {
      return new URL(relative, document.baseURI).href;
    } catch {
      /* cai no fallback abaixo */
    }
  }
  const baseRaw = (import.meta.env.BASE_URL || '/').toString();
  const base = baseRaw.endsWith('/') ? baseRaw : `${baseRaw}/`;
  return `${base}${relative}`;
}

/**
 * Devolve a URL local Aurya para a categoria/nome. Sempre devolve algo
 * (cai em `default.svg`). Emite `image.fallback.selected`.
 */
export function resolveAuryaFoodImage(
  categoria: string | null | undefined,
  nome?: string | null,
  reason: 'no-image' | 'render-error' | 'invalid-url' | 'explicit' = 'no-image'
): string {
  const key = resolveAuryaCategoryKey(categoria, nome);
  const url = buildAssetUrl(key);
  emitLog('image.fallback.selected', { category: key, reason, categoria, nome });
  return url;
}

/** Loga que um asset local foi efetivamente servido (após onError). */
export function logLocalAssetServed(url: string, key: string, reason: string): void {
  emitLog('image.local.asset.served', { url, category: key, reason });
}

/** Loga que uma URL recebida não pôde ser exibida pelo <img>. */
export function logInvalidImageUrl(url: string, source: 'render-error' | 'invalid-string' | 'csp-blocked'): void {
  emitLog('image.url.invalid', { url, source });
}

/** Loga que a categoria não casou com nenhum asset (caímos em default). */
export function logAssetNotFound(categoria: string | null | undefined, nome?: string | null): void {
  emitLog('image.asset.not_found', { categoria, nome });
}

/**
 * Heurística simples para classificar uma URL como "externa" (não-CSP-safe
 * em modo Electron). Usada pelo `<ImagePreview>` para registrar logs
 * pré-render antes mesmo do `onError`.
 */
export function isLikelyExternalImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith('data:') || u.startsWith('blob:')) return false;
  if (u.startsWith('/assets/') || u.startsWith('assets/')) return false;
  if (u.startsWith('/uploads/')) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host === 'res.cloudinary.com' || host.endsWith('.cloudinary.com')) return false;
    if (host.endsWith('.auryasolucoes.com.br') || host === 'auryasolucoes.com.br') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Conjunto de chaves conhecidas — útil para o backend (via API) escolher
 * uma chave em vez de devolver uma URL. Reexportado pra testes.
 */
export const AURYA_FOOD_CATEGORY_KEYS = Array.from(KNOWN_CATEGORIES);
