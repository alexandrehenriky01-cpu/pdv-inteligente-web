import { deliveryPrintService, type ImpressaoResult } from './deliveryPrintService';
import { AUTH_TOKEN_KEY } from '../../../services/authStorage';

const IS_DEV = import.meta.env.DEV;

export interface CupomPedidoData {
  id: string;
  numeroPedido: number | null;
  numeroVenda: number;
  nomeCliente: string | null;
  telefoneCliente?: string | null;
  enderecoEntrega: string | null;
  valorTotal: number;
  statusPreparo: string;
  statusEntrega: string;
  createdAt: string;
  observacoes?: string | null;
  pagamentos?: { tipoPagamento: string; valor: number }[];
  origemVenda?: string;
  itens?: Array<{
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    observacao?: string;
  }>;
  lojaNome?: string;
  senhaPedido?: string;
}

const LARGURA = 48;
const ESC_BOLD_ON = '\x1B\x45\x01';
const ESC_BOLD_OFF = '\x1B\x45\x00';
const ESC_CUT = '\x1D\x56\x00';

export function gerarConteudoCupom(pedido: CupomPedidoData, lojaNome: string = 'Restaurante'): string {
  const linha = '-'.repeat(LARGURA);
  const linhaDupla = '='.repeat(LARGURA);
  const vazio = ' '.repeat(LARGURA);

  const lines: string[] = [];

  lines.push(linhaDupla);
  lines.push(center(`${ESC_BOLD_ON}${lojaNome.toUpperCase()}${ESC_BOLD_OFF}`, LARGURA));
  lines.push(center(new Date().toLocaleDateString('pt-BR'), LARGURA));
  lines.push(center(new Date().toLocaleTimeString('pt-BR'), LARGURA));
  lines.push(linhaDupla);

  lines.push(center('COMPROVANTE DE PEDIDO', LARGURA));
  lines.push(linha);

  lines.push(`Pedido: #${pedido.numeroPedido || pedido.numeroVenda}`);

  if (pedido.senhaPedido) {
    lines.push(`${ESC_BOLD_ON}Senha: ${pedido.senhaPedido}${ESC_BOLD_OFF}`);
  }

  lines.push(linha);
  lines.push(vazio);

  lines.push('CLIENTE:');
  lines.push(truncate(`  ${pedido.nomeCliente || 'Nao identificado'}`, LARGURA));
  if (pedido.telefoneCliente) {
    lines.push(`  Tel: ${pedido.telefoneCliente}`);
  }
  lines.push(vazio);

  lines.push('ENDERECO DE ENTREGA:');
  if (pedido.enderecoEntrega) {
    lines.push(wrapText(`  ${pedido.enderecoEntrega}`, LARGURA));
  } else {
    lines.push('  Nao informado');
  }
  lines.push(vazio);

  if (pedido.itens && pedido.itens.length > 0) {
    lines.push(linha);
    lines.push(center('ITENS DO PEDIDO', LARGURA));
    lines.push(linha);

    for (const item of pedido.itens) {
      lines.push(truncate(`  ${item.quantidade}x ${item.nome}`, LARGURA));
      if (item.observacao) {
        lines.push(truncate(`     Obs: ${item.observacao}`, LARGURA));
      }
      lines.push(right(`R$ ${item.valorTotal.toFixed(2)}`, LARGURA));
      lines.push(vazio);
    }

    lines.push(linha);
  }

  lines.push(`TOTAL: ${pedido.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  lines.push(linha);

  if (pedido.pagamentos && pedido.pagamentos.length > 0) {
    lines.push('PAGAMENTO:');
    for (const pag of pedido.pagamentos) {
      lines.push(`  ${pag.tipoPagamento.replace('_', ' ')}: ${pag.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    }
    lines.push(vazio);
  }

  const obsTexto = pedido.observacoes?.trim();
  if (obsTexto) {
    lines.push('OBSERVACOES:');
    lines.push(wrapText(`  ${obsTexto}`, LARGURA));
    lines.push(vazio);
  }

  lines.push(linhaDupla);
  lines.push(center('AGRADECEMOS A PREFERENCIA!', LARGURA));
  lines.push(center('Volte sempre!', LARGURA));
  lines.push(linhaDupla);
  lines.push(vazio);
  lines.push(vazio);
  lines.push(vazio);
  lines.push(ESC_CUT);

  return lines.join('\n');
}

export async function dispararImpressaoDireta(
  pedido: CupomPedidoData,
  lojaNome: string = 'Restaurante'
): Promise<ImpressaoResult> {
  if (IS_DEV) {
    console.log('[ImpressaoDireta] Iniciando impressao do pedido:', {
      id: pedido.id,
      numeroPedido: pedido.numeroPedido,
      nomeCliente: pedido.nomeCliente,
      valorTotal: pedido.valorTotal,
      itens: pedido.itens?.length || 0,
      endereco: pedido.enderecoEntrega,
    });
  }

  const conteudo = gerarConteudoCupom(pedido, lojaNome);

  if (IS_DEV) {
    console.log('[ImpressaoDireta] Conteudo do cupom (primeiras 500 chars):');
    console.log(conteudo.substring(0, 500));
  }

  const resultado = await deliveryPrintService.imprimirCupomDelivery(conteudo, undefined, 'texto');

  if (IS_DEV) {
    if (resultado.sucesso) {
      console.log('[ImpressaoDireta] Cupom impresso com sucesso:', resultado.impressora);
    } else {
      console.error('[ImpressaoDireta] Falha ao imprimir:', resultado.mensagem);
    }
  }

  return resultado;
}

function center(text: string, width: number): string {
  if (!text) return ' '.repeat(width);
  const str = text.substring(0, width);
  const padding = Math.max(0, width - str.length);
  const left = Math.floor(padding / 2);
  return ' '.repeat(left) + str + ' '.repeat(padding - left);
}

function right(text: string, width: number): string {
  if (!text) return ' '.repeat(width);
  const str = text.substring(0, width);
  const padding = Math.max(0, width - str.length);
  return ' '.repeat(padding) + str;
}

function truncate(text: string, width: number): string {
  if (!text) return ' '.repeat(width);
  return text.substring(0, width);
}

function wrapText(text: string, width: number): string {
  if (!text) return ' '.repeat(width);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= width) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join('\n' + ' '.repeat(width));
}

export interface RomaneioData {
  uuid: string;
  lojaNome: string;
  lojaEndereco?: string;
  lojaTelefone?: string;
  nomeMotoboy?: string;
  horaSaida: string;
  dataRota: string;
  totalPedidos: number;
  totalReceber: number;
  paradas: Array<{
    numero?: number;
    pedidoId: string;
    numeroPedido: number | null;
    clienteNome: string;
    clienteTelefone?: string;
    endereco: string;
    valorReceber: number;
  }>;
}

function gerarLayoutRomaneio(data: RomaneioData, qrBase64?: string): string {
  const linha = '-'.repeat(LARGURA);
  const linhaDupla = '='.repeat(LARGURA);
  const vazio = ' '.repeat(LARGURA);

  const lines: string[] = [];

  lines.push(linhaDupla);
  lines.push(center(`${ESC_BOLD_ON}ROMANEIO DE CARGA${ESC_BOLD_OFF}`, LARGURA));
  lines.push(center(`#${data.uuid}`, LARGURA));
  lines.push(center(data.lojaNome.toUpperCase(), LARGURA));
  lines.push(center(data.dataRota, LARGURA));
  lines.push(linhaDupla);

  if (data.nomeMotoboy || data.horaSaida) {
    lines.push(vazio);
    lines.push(`${ESC_BOLD_ON}MOTOBOY:${ESC_BOLD_OFF}`);
    lines.push(`  ${data.nomeMotoboy || 'Nao informado'}`);
    if (data.horaSaida) {
      lines.push(`  Saida: ${data.horaSaida}`);
    }
    lines.push(vazio);
  }

  lines.push(linha);
  lines.push(center('RESUMO DA ROTA', LARGURA));
  lines.push(linha);
  lines.push(`${'Pedidos:'.padEnd(20)}${String(data.totalPedidos).padStart(4)}`);
  lines.push(`${'Total a Receber:'.padEnd(20)}${formatCurrency(data.totalReceber).padStart(18)}`);
  lines.push(linha);
  lines.push(vazio);

  lines.push(center(`${ESC_BOLD_ON}LISTA DE PARADAS${ESC_BOLD_OFF}`, LARGURA));
  lines.push(linha);

  for (const [idx, parada] of data.paradas.entries()) {
    lines.push(center(`>>> PARADA ${(parada.numero || idx + 1)} <<<`, LARGURA));
    lines.push(`${ESC_BOLD_ON}Pedido: #${parada.numeroPedido || '---'}${ESC_BOLD_OFF}`);
    lines.push(`Cliente: ${truncate(parada.clienteNome, LARGURA - 9).trim()}`);
    if (parada.clienteTelefone) {
      lines.push(`Tel: ${parada.clienteTelefone}`);
    }
    lines.push('End:');
    lines.push(wrapText(`  ${parada.endereco}`, LARGURA));
    lines.push(`${ESC_BOLD_ON}VALOR: ${formatCurrency(parada.valorReceber)}${ESC_BOLD_OFF}`);
    lines.push(vazio);
    lines.push(linha);
  }

  lines.push(`${ESC_BOLD_ON}TOTAL DA ROTA: ${formatCurrency(data.totalReceber)}${ESC_BOLD_OFF}`);
  lines.push(linhaDupla);
  lines.push(center('AGRADECEMOS A PREFERENCIA!', LARGURA));
  lines.push(linhaDupla);
  lines.push(vazio);

  if (qrBase64) {
    lines.push(center('ESCANEIE PARA INICIAR A ROTA NO APP', LARGURA));
    lines.push(vazio);
    lines.push(`[IMG:${qrBase64}]`);
  }

  lines.push(vazio);
  lines.push(vazio);
  lines.push(vazio);
  lines.push(ESC_CUT);

  return lines.join('\n');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function criarRomaneio(
  pedidoIds: string[],
  nomeMotoboy?: string
): Promise<{
  sucesso: boolean;
  uuid?: string;
  texto?: string;
  qrBase64?: string;
  romaneioData?: RomaneioData;
  error?: string;
}> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/entregas/romaneios', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pedidoIds, nomeMotoboy }),
    });

    const data = await response.json();

    if (!response.ok || !data.sucesso) {
      return { sucesso: false, error: data.error || 'Falha ao criar romaneio' };
    }

    return {
      sucesso: true,
      uuid: data.uuid,
      texto: data.texto,
      qrBase64: data.qrBase64,
      romaneioData: data.romaneioData,
    };
  } catch (e) {
    console.error('[criarRomaneio] Erro:', e);
    return { sucesso: false, error: 'Erro ao comunicar com o servidor' };
  }
}
