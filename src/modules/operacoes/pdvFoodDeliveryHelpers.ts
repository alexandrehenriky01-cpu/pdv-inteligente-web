/**
 * Helpers do fluxo ENTREGA no PDV Food — alinhados ao checkout do Menu Online (delivery).
 */
import { arredondar2 } from '../food/composition/foodItemComposition';
import type { ClienteEntregaPdv, EnderecoEntregaPdv, FormaPagamentoFood } from './pdvFoodTypes';

export interface PagamentoParcialLike {
  tipoPagamento: string;
  transacaoTefId?: string;
}

export const CLIENTE_ENTREGA_PDV_INICIAL: ClienteEntregaPdv = {
  nomeCompleto: '',
  whatsapp: '',
  endereco: {
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    complemento: '',
  },
  observacaoPedido: '',
};

/** Ex.: 01310100 → 01310-100 (valida regex da API). */
export function formatarCepParaApi(digits: string): string | undefined {
  const d = digits.replace(/\D/g, '').slice(0, 8);
  if (d.length !== 8) return undefined;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Texto único de endereço no padrão do Menu Online (cupom / legado). */
export function montarEnderecoEntregaTextoMenuOnline(e: EnderecoEntregaPdv): string {
  const cepFmt = formatarCepParaApi(e.cep) ?? e.cep.replace(/\D/g, '');
  const comp = e.complemento.trim();
  const cid = e.cidade.trim();
  return `CEP ${cepFmt} — ${e.rua.trim()}, ${e.numero.trim()} — ${e.bairro.trim()}${cid ? ` — ${cid}` : ''}${comp ? ` — ${comp}` : ''}`;
}

/** Observações da venda: cliente, WhatsApp e obs. do pedido (igual Menu Online). */
export function montarObservacoesVendaEntregaPdv(p: {
  nome: string;
  whatsapp: string;
  observacaoPedido: string;
}): string {
  const base = `Cliente: ${p.nome.trim()}\nWhatsApp: ${p.whatsapp.trim()}`;
  const extra = p.observacaoPedido.trim();
  return extra ? `${base}\nObs. pedido: ${extra}` : base;
}

/** Corpo `enderecoEntrega` do RealizarVendaSchema (logradouro, UF, etc.). */
export function enderecoEntregaPdvParaApi(e: EnderecoEntregaPdv): {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
} {
  const cepFmt = formatarCepParaApi(e.cep);
  if (!cepFmt) {
    throw new Error('CEP inválido.');
  }
  const uf = e.uf.trim().toUpperCase().slice(0, 2);
  if (uf.length !== 2) {
    throw new Error('UF inválida.');
  }
  return {
    logradouro: e.rua.trim(),
    numero: e.numero.trim(),
    ...(e.complemento.trim() !== '' ? { complemento: e.complemento.trim() } : {}),
    bairro: e.bairro.trim(),
    cidade: e.cidade.trim(),
    uf,
    cep: cepFmt,
  };
}

export function taxaLojaCentavosParaReais(centavos: number | null | undefined): number {
  const n = Number(centavos ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return arredondar2(n / 100);
}

const ROTULO_FORMA_PREVISTA: Record<FormaPagamentoFood, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  CREDIARIO: 'Crediário',
  CHEQUE: 'Cheque',
  BOLETO: 'Boleto',
};

export function rotuloFormaPagamentoFood(f: FormaPagamentoFood): string {
  return ROTULO_FORMA_PREVISTA[f];
}

export function resumoPagamentosPdvFood(pag: PagamentoParcialLike[]): string {
  return pag
    .map((p) => {
      if (p.transacaoTefId) {
        return p.tipoPagamento === 'CARTAO_CREDITO' ? 'Crédito TEF' : 'Débito TEF';
      }
      const m: Record<string, string> = {
        DINHEIRO: 'Dinheiro',
        PIX: 'PIX',
        CARTAO_CREDITO: 'Crédito (POS)',
        CARTAO_DEBITO: 'Débito (POS)',
        CREDIARIO: 'Crediário',
        CHEQUE: 'Cheque',
        BOLETO: 'Boleto',
      };
      return m[p.tipoPagamento] ?? p.tipoPagamento;
    })
    .join(' + ');
}
