
import { type CSSProperties } from 'react';
const MM_WIDTH = '80mm';
const PX_FALLBACK = 300;

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function labelTipoPagamento(tipo: string): string {
  const u = tipo.toUpperCase();
  const map: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão crédito',
    CARTAO_DEBITO: 'Cartão débito',
    CREDIARIO: 'Crediário',
  };
  return map[u] ?? tipo;
}

export interface CupomItemLinha {
  quantidade: number;
  nome: string;
  adicionais: string[];
  observacoes?: string;
}

export interface CupomClienteBloco {
  nome?: string;
  whatsapp?: string;
  endereco?: string;
  obsPedido?: string;
}

export interface CupomImpressaoFoodProps {
  lojaNome: string;
  /** Texto já formatado (ex.: 13/04/2026 14:32) */
  dataHoraTexto: string;
  senha: string;
  origemLabel: string;
  /** Somente delivery / quando houver dados */
  cliente?: CupomClienteBloco | null;
  itens: CupomItemLinha[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
  pagamentos: Array<{ tipo: string; valor: number }>;
}

const rootStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: PX_FALLBACK,
  margin: '0 auto',
  padding: '8px 6px 12px',
  background: '#fff',
  color: '#000',
  fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace',
  fontSize: 12,
  lineHeight: 1.35,
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

const hrStyle: CSSProperties = {
  border: 'none',
  borderTop: '1px dashed #000',
  margin: '8px 0',
};

export function CupomImpressaoFood({
  lojaNome,
  dataHoraTexto,
  senha,
  origemLabel,
  cliente,
  itens,
  subtotal,
  taxaEntrega,
  total,
  pagamentos,
}: CupomImpressaoFoodProps) {
  const formasTexto =
    pagamentos.length === 0
      ? '—'
      : pagamentos
          .map((p) => `${labelTipoPagamento(p.tipo)} ${brl(p.valor)}`)
          .join(' · ');

  const showCliente =
    cliente &&
    (Boolean(cliente.nome?.trim()) ||
      Boolean(cliente.whatsapp?.trim()) ||
      Boolean(cliente.endereco?.trim()) ||
      Boolean(cliente.obsPedido?.trim()));

  return (
    <>
      <style>{`
        @page {
          size: ${MM_WIDTH} auto;
          margin: 2mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cupom-food-print-root {
            max-width: ${MM_WIDTH} !important;
            width: ${MM_WIDTH} !important;
          }
        }
      `}</style>
      <div className="cupom-food-print-root" style={rootStyle}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{lojaNome}</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{dataHoraTexto}</div>
        </div>

        <hr style={hrStyle} />

        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Senha</div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: 2,
              marginTop: 4,
            }}
          >
            {senha}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {origemLabel}
          </div>
        </div>

        <hr style={hrStyle} />

        {showCliente ? (
          <>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11 }}>Cliente / entrega</div>
            {cliente!.nome?.trim() ? (
              <div>
                <span style={{ fontWeight: 600 }}>Nome: </span>
                {cliente!.nome.trim()}
              </div>
            ) : null}
            {cliente!.whatsapp?.trim() ? (
              <div>
                <span style={{ fontWeight: 600 }}>WhatsApp: </span>
                {cliente!.whatsapp.trim()}
              </div>
            ) : null}
            {cliente!.endereco?.trim() ? (
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                <span style={{ fontWeight: 600 }}>Endereço: </span>
                {cliente!.endereco.trim()}
              </div>
            ) : null}
            {cliente!.obsPedido?.trim() ? (
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                <span style={{ fontWeight: 600 }}>Obs.: </span>
                {cliente!.obsPedido.trim()}
              </div>
            ) : null}
            <hr style={hrStyle} />
          </>
        ) : null}

        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>Itens</div>
        {itens.map((it, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{it.quantidade}×</span> {it.nome}
            </div>
            {it.adicionais.map((a, i) => (
              <div key={i} style={{ paddingLeft: 10, fontSize: 11 }}>
                {a}
              </div>
            ))}
            {it.observacoes?.trim() ? (
              <div style={{ paddingLeft: 10, fontSize: 11, fontStyle: 'italic' }}>
                Obs. item: {it.observacoes.trim()}
              </div>
            ) : null}
          </div>
        ))}

        <hr style={hrStyle} />

        <div style={{ fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{brl(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>Taxa de entrega</span>
            <span>{brl(taxaEntrega)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <span>TOTAL</span>
            <span>{brl(total)}</span>
          </div>
        </div>

        <hr style={hrStyle} />

        <div style={{ fontSize: 11 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Forma de pagamento</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{formasTexto}</div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10 }}>— Obrigado —</div>
      </div>
    </>
  );
}
