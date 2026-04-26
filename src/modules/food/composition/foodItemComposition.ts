/**
 * Regras compartilhadas de composição Food (Menu Online, PDV Food, mesa, etc.).
 */
import type { ItemAdicionarNaMesaDto } from '../../../services/api/mesaContaApi';
import type { CartItem, TotemMockProduto, TotemTipoItem } from '../../totem/types';
import { resolverSaborIdParaPizza, saborDaPizzaSuportaTamanho } from '../pizzaUtils';

export function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function precoSaborComTamanhoRef(
  sabor: NonNullable<TotemMockProduto['saboresOpcoes']>[number],
  tamanhoNomeRef: string | undefined
): number {
  const ref = tamanhoNomeRef?.trim().toLowerCase();
  const ativos = sabor.tamanhos.filter((t) => t.ativo !== false);
  if (ativos.length > 0 && ref) {
    const hit = ativos.find((t) => t.nome.trim().toLowerCase() === ref);
    if (hit) return hit.preco;
  }
  if (ativos.length > 0) return ativos[0].preco;
  return sabor.precoVenda;
}

/**
 * IDs de sabor efetivos para API (pizza multi: garante ao menos o sabor do próprio item no cardápio).
 */
export function saboresItemCardapioIdsParaApi(line: CartItem): string[] | undefined {
  const p = line.produto;
  const isPizzaMulti =
    p.tipoItem === 'PIZZA' &&
    p.permiteMultiplosSabores === true &&
    (p.saboresOpcoes?.length ?? 0) > 0;
  if (!isPizzaMulti) {
    const cur = line.saboresItemCardapioIds;
    return cur && cur.length > 0 ? [...cur] : undefined;
  }
  const raw = [...(line.saboresItemCardapioIds ?? [])].map((x) => x.trim()).filter(Boolean);
  if (raw.length > 0) return raw;
  const fallback = resolverSaborIdParaPizza(p).trim();
  return fallback ? [fallback] : undefined;
}

/** Valida composição Food antes de montar payload ou finalizar (mesa / venda). */
export function validarLinhasCarrinhoFood(carrinho: CartItem[]): string | null {
  for (const line of carrinho) {
    const p = line.produto;
    const tAtivos = (p.tamanhos ?? []).filter((t) => t.ativo !== false);
    if (tAtivos.length > 0 && !(line.itemCardapioTamanhoId?.trim())) {
      return `Selecione o tamanho para «${p.nome}».`;
    }
    if (p.tipoItem === 'PIZZA' && p.permiteMultiplosSabores === true && (p.saboresOpcoes?.length ?? 0) > 0) {
      const sab = saboresItemCardapioIdsParaApi(line) ?? [];
      const n = sab.length;
      if (n < 1) {
        return `Escolha ao menos um sabor para «${p.nome}».`;
      }
      const maxS = Math.min(20, Math.max(1, p.maxSabores ?? 1));
      if (n > maxS) {
        return `No máximo ${maxS} sabores para «${p.nome}».`;
      }
      const tid = line.itemCardapioTamanhoId?.trim();
      if (tid && n > 1) {
        for (const sid of sab.slice(1)) {
          if (!saborDaPizzaSuportaTamanho(p, sid, tid)) {
            return `Este sabor não possui o tamanho selecionado para a pizza.`;
          }
        }
      }
    }
  }
  return null;
}

export function calcularSubtotalLinhaFood(
  produto: TotemMockProduto,
  adicionais: Record<string, number>,
  quantidade: number,
  itemCardapioTamanhoId?: string | null,
  saboresItemCardapioIds?: string[]
): number {
  const tamanhosAtivos = produto.tamanhos.filter((t) => t.ativo !== false);
  const tNome =
    tamanhosAtivos.length > 0 && itemCardapioTamanhoId
      ? tamanhosAtivos.find((t) => t.id === itemCardapioTamanhoId)?.nome
      : undefined;

  let base = produto.precoBase;
  if (tamanhosAtivos.length > 0 && itemCardapioTamanhoId) {
    const tam = tamanhosAtivos.find((t) => t.id === itemCardapioTamanhoId);
    if (tam) base = tam.preco;
  }

  let sidsPizza = saboresItemCardapioIds;
  const pizzaMultiTipo =
    produto.tipoItem === 'PIZZA' &&
    produto.permiteMultiplosSabores === true &&
    (produto.saboresOpcoes?.length ?? 0) > 0;
  if (pizzaMultiTipo && (!sidsPizza || sidsPizza.length === 0)) {
    const fb = resolverSaborIdParaPizza(produto).trim();
    sidsPizza = fb ? [fb] : undefined;
  }

  const multi =
    pizzaMultiTipo && (sidsPizza?.length ?? 0) > 0;

  if (multi && sidsPizza) {
    const opcoes = produto.saboresOpcoes ?? [];
    let maxP = 0;
    for (const sid of sidsPizza) {
      const s = opcoes.find((o) => o.id === sid);
      if (!s) continue;
      maxP = Math.max(maxP, precoSaborComTamanhoRef(s, tNome));
    }
    if (maxP > 0) base = maxP;
  }

  const extras = produto.adicionais.reduce((acc, ad) => {
    const q = adicionais[ad.id] ?? 0;
    return acc + ad.preco * q;
  }, 0);
  return arredondar2((base + extras) * quantidade);
}

/**
 * Produto precisa do modal de composição antes de ir ao carrinho/mesa
 * (tamanhos, pizza multi-sabor ou adicionais).
 */
export function itemFoodExigeModalComposicao(produto: TotemMockProduto): boolean {
  const tAtivos = (produto.tamanhos ?? []).filter((t) => t.ativo !== false);
  if (tAtivos.length > 0) return true;
  if (
    produto.tipoItem === 'PIZZA' &&
    produto.permiteMultiplosSabores === true &&
    (produto.saboresOpcoes?.length ?? 0) > 0
  ) {
    return true;
  }
  if ((produto.adicionais?.length ?? 0) > 0) return true;
  return false;
}

export interface RotuloLinhaFoodInput {
  tipoItem: TotemTipoItem;
  permiteMultiplosSabores?: boolean;
  nomeCardapio: string;
  tamanhoNome?: string | null;
  /** Nomes dos sabores (ordem já definida pelo snapshot ou seleção). */
  nomesSabores?: string[];
  nomeExibicaoSnapshot?: string | null;
}

/**
 * Rótulos alinhados às regras de exibição Food (pizza 1 vs 2+ sabores, comida, bebida).
 */
export function rotuloLinhaFood(input: RotuloLinhaFoodInput): { titulo: string; subtitulo?: string } {
  if (input.nomeExibicaoSnapshot?.trim()) {
    const titulo = input.nomeExibicaoSnapshot.trim();
    const sab = input.nomesSabores?.filter((s) => s.trim().length > 0) ?? [];
    if (
      input.tipoItem === 'PIZZA' &&
      input.permiteMultiplosSabores &&
      sab.length > 1
    ) {
      return { titulo, subtitulo: `Sabores: ${sab.map((s) => s.toUpperCase()).join(' / ')}` };
    }
    return { titulo };
  }

  const t = (input.tamanhoNome ?? '').trim();
  const nome = input.nomeCardapio.trim();

  if (input.tipoItem === 'BEBIDA') {
    return { titulo: nome.toUpperCase() };
  }

  if (
    input.tipoItem === 'PIZZA' &&
    input.permiteMultiplosSabores &&
    (input.nomesSabores?.length ?? 0) > 0
  ) {
    const sab = input.nomesSabores!.filter((s) => s.trim().length > 0);
    if (sab.length >= 2) {
      const titulo = t ? `Pizza ${t}` : nome;
      return { titulo, subtitulo: `Sabores: ${sab.map((s) => s.toUpperCase()).join(' / ')}` };
    }
    if (sab.length === 1) {
      const titulo = t ? `${sab[0].toUpperCase()} (${t})` : sab[0].toUpperCase();
      return { titulo };
    }
  }

  if (input.tipoItem === 'PIZZA' && t) {
    return { titulo: `${nome} (${t})` };
  }

  return { titulo: nome };
}

/** Snapshot de sabores como gravado no backend: `{ nome, preco, itemCardapioId }[]`. */
export function nomesSaboresFromSnapshotJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const row of raw) {
    if (row && typeof row === 'object' && 'nome' in row) {
      const n = String((row as { nome: unknown }).nome ?? '').trim();
      if (n) out.push(n);
    }
  }
  return out;
}

export function saboresIdsFromSnapshotJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const row of raw) {
    if (row && typeof row === 'object' && 'itemCardapioId' in row) {
      const id = String((row as { itemCardapioId: unknown }).itemCardapioId ?? '').trim();
      if (id) out.push(id);
    }
  }
  return out;
}

export type AdicionalVendaFoodDto =
  | { adicionalCardapioId: string; quantidade: number }
  | { itemCardapioAdicionalId: string; quantidade: number };

export type TipoItemCardapioMesa = 'COMIDA' | 'BEBIDA' | 'PIZZA';

/** Metadados do cardápio vindos do GET `/api/pdv/mesas` (não depender só do stub do totem). */
export interface CardapioMesaMetaVenda {
  tipoItem: TipoItemCardapioMesa;
  permiteMultiplosSabores: boolean;
  maxSabores?: number | null;
  exigeTamanho: boolean;
}

/** Dados persistidos na mesa para montar linha de venda sem reconstruir pizza pelo nome. */
export interface ItemMesaApiParaVendaInput {
  produtoId: string;
  itemCardapioId: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  observacao?: string | null;
  itemCardapioTamanhoId?: string | null;
  saboresSnapshot?: unknown;
  adicionaisSnapshot?: unknown;
  cardapio?: CardapioMesaMetaVenda | null;
}

const MSG_ITEM_MESA_INCOMPLETO = 'Item da mesa está incompleto. Remova e lance novamente.';

/** Converte `adicionaisSnapshot` da mesa/venda para o DTO aceito em POST `/api/vendas`. */
export function adicionaisVendaFoodDtoFromSnapshot(raw: unknown): AdicionalVendaFoodDto[] {
  if (!Array.isArray(raw)) return [];
  const out: AdicionalVendaFoodDto[] = [];
  for (const el of raw) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    const q = Number(o.quantidade);
    if (!Number.isFinite(q) || q <= 0) continue;
    const cat =
      typeof o.itemCardapioAdicionalId === 'string' ? o.itemCardapioAdicionalId.trim() : '';
    const leg = typeof o.adicionalCardapioId === 'string' ? o.adicionalCardapioId.trim() : '';
    if (cat) out.push({ itemCardapioAdicionalId: cat, quantidade: q });
    else if (leg) out.push({ adicionalCardapioId: leg, quantidade: q });
  }
  return out;
}

/** Valida composição mínima antes de finalizar pagamento da mesa (evita POST com linha incompleta). */
export function itemMesaLinhaIncompletaParaVenda(input: ItemMesaApiParaVendaInput): string | null {
  if (!input.itemCardapioId?.trim()) {
    return MSG_ITEM_MESA_INCOMPLETO;
  }
  const c = input.cardapio;
  if (!c) return null;
  if (c.exigeTamanho && !input.itemCardapioTamanhoId?.trim()) {
    return MSG_ITEM_MESA_INCOMPLETO;
  }
  if (c.tipoItem === 'PIZZA' && c.permiteMultiplosSabores) {
    const sab = saboresIdsFromSnapshotJson(input.saboresSnapshot);
    const maxS = Math.min(20, Math.max(1, c.maxSabores ?? 1));
    if (sab.length < 1) return MSG_ITEM_MESA_INCOMPLETO;
    if (sab.length > maxS) return MSG_ITEM_MESA_INCOMPLETO;
  }
  return null;
}

/**
 * Monta linha de venda a partir do item persistido na mesa (tamanho, sabores e adicionais congelados).
 * Formato alinhado a `montarLinhaVendaApiFromCartItem`.
 */
export function mapItemMesaParaLinhaVendaApi(input: ItemMesaApiParaVendaInput): ItemVendaLinhaFoodDto {
  const itemCardapioId = input.itemCardapioId.trim();
  const produtoId = input.produtoId.trim();
  if (!itemCardapioId) {
    throw new Error('Item da mesa sem identificação de cardápio.');
  }
  if (!produtoId) {
    throw new Error('Item da mesa sem produto vinculado.');
  }
  const q = input.quantidade;
  if (q <= 0) {
    throw new Error('Quantidade inválida para item da mesa.');
  }
  const vuIn = input.valorUnitario;
  const valorUnitario =
    Number.isFinite(vuIn) && vuIn > 0 ? arredondar2(vuIn) : arredondar2(input.valorTotal / q);
  const tid = input.itemCardapioTamanhoId?.trim();
  const adicionais = adicionaisVendaFoodDtoFromSnapshot(input.adicionaisSnapshot);
  const saboresIds = saboresIdsFromSnapshotJson(input.saboresSnapshot);
  const c = input.cardapio;
  const enviarSabores =
    saboresIds.length > 0 &&
    (c == null || (c.tipoItem === 'PIZZA' && c.permiteMultiplosSabores));
  const obs = String(input.observacao ?? '').trim();
  const incluirObs = obs !== '' && (c == null || c.tipoItem !== 'BEBIDA');
  return {
    produtoId,
    quantidade: q,
    valorUnitario,
    itemCardapioId,
    ...(tid ? { itemCardapioTamanhoId: tid } : {}),
    ...(enviarSabores ? { sabores: saboresIds.map((id) => ({ itemCardapioId: id })) } : {}),
    ...(incluirObs ? { observacoes: obs } : {}),
    ...(adicionais.length > 0 ? { adicionais } : {}),
  };
}

export interface ItemVendaLinhaFoodDto {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
  itemCardapioId: string;
  itemCardapioTamanhoId?: string;
  partidoAoMeio?: boolean;
  sabores?: Array<{ itemCardapioId: string }>;
  observacoes?: string;
  adicionais?: AdicionalVendaFoodDto[];
}

const MSG_TAMANHO_ANTES_MESA = 'Selecione o tamanho da pizza antes de adicionar à mesa.';

/**
 * Monta o DTO de `POST /api/pdv/mesas/:n/adicionar` a partir da linha do compositor (mesmo contrato do modal Food).
 * Garante `itemCardapioTamanhoId` explícito (não depender só do retorno espelhado de `montarLinhaVendaApiFromCartItem`).
 */
export function itemAdicionarNaMesaDtoFromFoodLine(
  line: CartItem,
  nomeExibicao?: string
): ItemAdicionarNaMesaDto {
  const tAtivos = (line.produto.tamanhos ?? []).filter((t) => t.ativo !== false);
  const tid = line.itemCardapioTamanhoId?.trim() || undefined;
  if (tAtivos.length > 0 && !tid) {
    throw new Error(MSG_TAMANHO_ANTES_MESA);
  }
  const v = montarLinhaVendaApiFromCartItem(line);
  return {
    produtoId: v.produtoId,
    itemCardapioId: v.itemCardapioId,
    nome: nomeExibicao ?? line.produto.nome,
    quantidade: v.quantidade,
    observacao: v.observacoes,
    valorUnitario: v.valorUnitario,
    valorTotal: arredondar2(v.valorUnitario * v.quantidade),
    itemCardapioTamanhoId: tid,
    partidoAoMeio: v.partidoAoMeio,
    sabores: v.sabores,
    adicionais: v.adicionais,
  };
}

export function montarLinhaVendaApiFromCartItem(line: CartItem): ItemVendaLinhaFoodDto {
  const itemCardapioId = line.produto.itemCardapioId?.trim();
  if (!itemCardapioId) {
    throw new Error(`Item «${line.produto.nome}» sem vínculo de cardápio.`);
  }
  const produtoId = (line.produto.produtoId ?? line.produto.id).trim();
  if (!produtoId) {
    throw new Error(`Produto «${line.produto.nome}» sem identificador.`);
  }
  const q = line.quantidade;
  if (q <= 0) {
    throw new Error(`Quantidade inválida para «${line.produto.nome}».`);
  }
  const valorUnitario = arredondar2(line.subtotal / q);
  const adicionais: AdicionalVendaFoodDto[] = [];
  for (const [id, quantidade] of Object.entries(line.adicionais)) {
    if (quantidade <= 0) continue;
    const meta = line.produto.adicionais.find((a) => a.id === id);
    if (meta?.origem === 'CATALOGO') {
      adicionais.push({ itemCardapioAdicionalId: id, quantidade });
    } else {
      adicionais.push({ adicionalCardapioId: id, quantidade });
    }
  }

  const precisaTam = (line.produto.tamanhos ?? []).filter((t) => t.ativo !== false).length > 0;
  const tid = line.itemCardapioTamanhoId?.trim();
  if (precisaTam && !tid) {
    throw new Error(`Selecione o tamanho para «${line.produto.nome}».`);
  }

  const saboresApi = saboresItemCardapioIdsParaApi(line);
  const pizzaMulti =
    line.produto.tipoItem === 'PIZZA' &&
    line.produto.permiteMultiplosSabores === true &&
    (saboresApi?.length ?? 0) > 0;

  return {
    produtoId,
    quantidade: q,
    valorUnitario,
    itemCardapioId,
    ...(tid ? { itemCardapioTamanhoId: tid } : {}),
    ...(line.produto.tipoItem === 'COMIDA' && line.partidoAoMeio === true ? { partidoAoMeio: true } : {}),
    ...(pizzaMulti && saboresApi
      ? {
          sabores: saboresApi.map((id) => ({ itemCardapioId: id })),
        }
      : {}),
    ...(line.observacao.trim() !== '' && line.produto.tipoItem !== 'BEBIDA'
      ? { observacoes: line.observacao.trim() }
      : {}),
    ...(adicionais.length > 0 ? { adicionais } : {}),
  };
}
