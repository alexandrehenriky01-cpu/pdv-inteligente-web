import type { TotemMockProduto } from '../totem/types';

/** Mesma “família” de pizza (mesmo conjunto de sabores no cardápio) — ex.: Calabresa e Mussarela compartilham lista. */
export function mesmaFamiliaPizzaMulti(a: TotemMockProduto, b: TotemMockProduto): boolean {
  if (a.tipoItem !== 'PIZZA' || b.tipoItem !== 'PIZZA') return false;
  if (a.permiteMultiplosSabores !== true || b.permiteMultiplosSabores !== true) return false;
  const idsA = (a.saboresOpcoes ?? [])
    .map((s) => s.id)
    .sort()
    .join('|');
  const idsB = (b.saboresOpcoes ?? [])
    .map((s) => s.id)
    .sort()
    .join('|');
  return idsA.length > 0 && idsA === idsB;
}

/** Alinha o sabor “da pizza” ao id de `ItemCardapio` presente em `saboresOpcoes`. */
export function resolverSaborIdParaPizza(produto: TotemMockProduto): string {
  const opcoes = produto.saboresOpcoes ?? [];
  const idDireto = produto.id.trim();
  if (opcoes.some((s) => s.id === idDireto)) return idDireto;
  const idCardapio = (produto.itemCardapioId ?? '').trim();
  if (idCardapio && opcoes.some((s) => s.id === idCardapio)) return idCardapio;
  const byNome = opcoes.find((s) => s.nome.trim().toLowerCase() === produto.nome.trim().toLowerCase())?.id;
  if (byNome) return byNome;
  return idDireto || idCardapio;
}

/**
 * Durante a montagem sequencial (pizza base + sabores no cardápio), o segundo clique costuma ser
 * um item “sabor” com `saboresOpcoes` vazio ou diferente da base — `mesmaFamiliaPizzaMulti` falha.
 * Este helper resolve o `itemCardapioId` do sabor **em relação à lista `saboresOpcoes` da base**.
 */
export function saborCandidatoParaPizzaMultiBase(
  base: TotemMockProduto,
  candidato: TotemMockProduto
): string | null {
  if (base.tipoItem !== 'PIZZA' || base.permiteMultiplosSabores !== true) return null;
  const opcoes = base.saboresOpcoes ?? [];
  if (opcoes.length === 0) return null;

  const candNome = candidato.nome.trim().toLowerCase();
  const candidatosId = new Set<string>();
  for (const x of [candidato.id, candidato.itemCardapioId, resolverSaborIdParaPizza(candidato)]) {
    const t = String(x ?? '').trim();
    if (t) candidatosId.add(t);
  }
  for (const cid of candidatosId) {
    if (opcoes.some((s) => s.id === cid)) return cid;
  }
  const hitNome = opcoes.find((s) => s.nome.trim().toLowerCase() === candNome);
  if (hitNome) return hitNome.id;

  if (mesmaFamiliaPizzaMulti(base, candidato)) {
    const r = resolverSaborIdParaPizza(candidato);
    if (opcoes.some((s) => s.id === r)) return r;
  }
  return null;
}

function normTxt(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  return null;
}

/**
 * Valida se o sabor escolhido suporta o tamanho já travado na pizza multi-sabor.
 * Regra: quando há tabela de tamanhos no sabor, o `tamanhoId` deve existir e estar ativo.
 */
export function saborDaPizzaSuportaTamanho(
  base: TotemMockProduto,
  saborId: string,
  tamanhoId: string
): boolean {
  const sid = String(saborId ?? '').trim();
  const tid = String(tamanhoId ?? '').trim();
  if (!sid || !tid) {
    console.log('[PIZZA SIZE DEBUG]', {
      baseId: base.id,
      baseNome: base.nome,
      tamanhoId: tid,
      saborId: sid,
      saborNome: null,
      tamanhosDoSabor: [],
      resultado: true,
    });
    return true;
  }

  const baseIds = new Set<string>(
    [base.id, base.itemCardapioId].map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
  );
  if (baseIds.has(sid)) {
    console.log('[PIZZA SIZE DEBUG]', {
      baseId: base.id,
      baseNome: base.nome,
      tamanhoId: tid,
      saborId: sid,
      saborNome: base.nome,
      tamanhosDoSabor: [],
      resultado: true,
    });
    return true;
  }

  const sabor = (base.saboresOpcoes ?? []).find((s) => String(s.id).trim() === sid);
  if (!sabor) {
    console.log('[PIZZA SIZE DEBUG]', {
      baseId: base.id,
      baseNome: base.nome,
      tamanhoId: tid,
      saborId: sid,
      saborNome: null,
      tamanhosDoSabor: [],
      resultado: true,
    });
    return true;
  }

  const tamanhosRaw = (sabor.tamanhos ?? []).map((row) => row as unknown as Record<string, unknown>);
  if (tamanhosRaw.length === 0) {
    console.log('[PIZZA SIZE DEBUG]', {
      baseId: base.id,
      baseNome: base.nome,
      tamanhoId: tid,
      saborId: sid,
      saborNome: sabor.nome,
      tamanhosDoSabor: [],
      resultado: true,
    });
    return true;
  }

  const extrairIds = (row: Record<string, unknown>): string[] =>
    [
      row.id,
      row.itemCardapioTamanhoId,
      row.tamanhoId,
      row.cardapioTamanhoId,
      row.itemCardapioId,
      row.itemId,
    ]
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  const extrairNomes = (row: Record<string, unknown>): string[] =>
    [row.nome, row.descricao, row.label, row.tamanhoNome, row.nomeTamanho]
      .map((x) => normTxt(x))
      .filter((x) => x.length > 0);

  const tamanhosAtivos = tamanhosRaw.filter((row) => {
    if (!('ativo' in row)) return true;
    return row.ativo !== false;
  });
  const universo = tamanhosAtivos.length > 0 ? tamanhosAtivos : tamanhosRaw;
  const tamanhoIdsSabor = new Set<string>();
  const tamanhoNomesSabor = new Set<string>();
  for (const row of universo) {
    for (const id of extrairIds(row)) {
      tamanhoIdsSabor.add(id);
    }
    for (const nome of extrairNomes(row)) {
      tamanhoNomesSabor.add(nome);
    }
  }

  const tamanhoBaseObj = (base.tamanhos ?? []).find((t) => String(t.id).trim() === tid);
  const tamanhoBaseNome = normTxt(tamanhoBaseObj?.nome ?? '');

  let nomeCompativel = false;
  if (tamanhoBaseNome && tamanhoNomesSabor.size > 0) {
    nomeCompativel = tamanhoNomesSabor.has(tamanhoBaseNome);
  }

  if (tamanhoIdsSabor.size === 0 && tamanhoNomesSabor.size === 0) {
    console.log('[PIZZA SIZE DEBUG]', {
      baseId: base.id,
      baseNome: base.nome,
      tamanhoId: tid,
      saborId: sid,
      saborNome: sabor.nome,
      tamanhosDoSabor: [],
      resultado: true,
    });
    console.log('[PIZZA SIZE DEBUG FULL]', {
      base,
      sabor,
      saborId: sid,
      tamanhoId: tid,
      tamanhosBase: base?.tamanhos,
      tamanhosSabor: sabor?.tamanhos,
      tamanhosSaborKeys: Object.keys(asObj(sabor) ?? {}),
    });
    return true;
  }

  const resultado = tamanhoIdsSabor.has(tid) || nomeCompativel;
  console.log('[PIZZA SIZE DEBUG]', {
    baseId: base.id,
    baseNome: base.nome,
    tamanhoId: tid,
    saborId: sid,
    saborNome: sabor.nome,
    tamanhosDoSabor: [...tamanhoIdsSabor, ...tamanhoNomesSabor],
    resultado,
  });
  console.log('[PIZZA SIZE DEBUG FULL]', {
    base,
    sabor,
    saborId: sid,
    tamanhoId: tid,
    tamanhosBase: base?.tamanhos,
    tamanhosSabor: sabor?.tamanhos,
    tamanhosSaborKeys: Object.keys(asObj(sabor) ?? {}),
  });
  return resultado;
}
