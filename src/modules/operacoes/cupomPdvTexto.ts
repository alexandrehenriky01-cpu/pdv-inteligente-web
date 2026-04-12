export interface CupomItemLinha {
  nome: string;
  quantidade: number;
  precoVenda: number;
  subtotal: number;
}

export interface CupomPdvContexto {
  nomeLoja: string;
  terminal: string;
  operador: string;
  vendaId: string;
  modeloNota: string;
  formaPagamento: string;
  itens: CupomItemLinha[];
  subtotal: number;
  desconto: number;
  total: number;
  dataHora?: Date;
  comprovantesTef?: string[];
}

/**
 * Cupom simples em texto puro para ESC/POS (largura ~48 colunas).
 */
export function montarCupomTextoPlano(ctx: CupomPdvContexto): string {
  const w = 48;
  const line = (c: string) => c.padEnd(w).slice(0, w);
  const sep = ''.padEnd(w, '-');
  const dt = (ctx.dataHora ?? new Date()).toLocaleString('pt-BR');

  const linhas: string[] = [
    line(''),
    line(ctx.nomeLoja.toUpperCase()),
    line('PDV — Aurya ERP'),
    sep,
    line(`Terminal: ${ctx.terminal}`),
    line(`Operador: ${ctx.operador}`),
    line(`Venda: ${ctx.vendaId.slice(0, 8)}...`),
    line(`Doc: modelo ${ctx.modeloNota}`),
    line(dt),
    sep,
    line('ITENS'),
    sep,
  ];

  for (const it of ctx.itens) {
    const nome = it.nome.length > 28 ? `${it.nome.slice(0, 25)}...` : it.nome;
    linhas.push(line(`${it.quantidade}x ${nome}`));
    linhas.push(line(`  ${Number(it.precoVenda).toFixed(2)} un = R$ ${it.subtotal.toFixed(2)}`));
  }

  linhas.push(sep);
  linhas.push(line(`Subtotal: R$ ${ctx.subtotal.toFixed(2)}`));
  if (ctx.desconto > 0) linhas.push(line(`Desconto: R$ ${ctx.desconto.toFixed(2)}`));
  linhas.push(line(`TOTAL: R$ ${ctx.total.toFixed(2)}`));
  linhas.push(sep);
  linhas.push(line(`Pagamento: ${ctx.formaPagamento}`));
  linhas.push(sep);
  linhas.push(line('Obrigado pela preferencia!'));
  linhas.push(line(''));

  if (ctx.comprovantesTef?.length) {
    linhas.push(sep);
    linhas.push(line('--- TEF / PINPAD ---'));
    for (const bloco of ctx.comprovantesTef) {
      for (const l of bloco.split('\n')) linhas.push(line(l));
      linhas.push(sep);
    }
  }

  return linhas.join('\n');
}
