import { deliveryPrintService, type ImpressaoResult } from './deliveryPrintService';
import { AUTH_TOKEN_KEY } from '../../../services/authStorage';
import { resolveApiBaseUrl } from '../../../services/apiBaseUrl';

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

/**
 * Lê o corpo da resposta sem assumir JSON válido (evita `Unexpected end of JSON input`).
 */
async function safeReadResponseJson(
  response: Response
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: 'Não foi possível ler a resposta do servidor.' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    if (response.status === 502 || response.status === 504) {
      return {
        ok: false,
        error: `Resposta vazia do proxy ou gateway (HTTP ${response.status}).`,
      };
    }
    return {
      ok: false,
      error: `Resposta vazia (HTTP ${response.status}). O servidor não devolveu corpo.`,
    };
  }

  const ct = (response.headers.get('content-type') ?? '').toLowerCase();
  const probablyJson =
    ct.includes('application/json') ||
    ct.includes('+json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (!probablyJson) {
    return {
      ok: false,
      error: `Resposta não é JSON (HTTP ${response.status}; content-type: ${ct || 'ausente'}).`,
    };
  }

  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Corpo da resposta não é JSON válido.' };
  }
}

/** Aceita payload plano ou `{ romaneio: { token, ... } }` da API. */
function flattenRomaneioCriarBody(data: Record<string, unknown>): Record<string, unknown> {
  const nested = data.romaneio;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...data, ...(nested as Record<string, unknown>) };
  }
  return data;
}

export async function criarRomaneio(
  pedidoIds: string[],
  nomeMotoboy?: string
): Promise<{
  sucesso: boolean;
  /** Token público completo (`rom_…`) para link/QR. */
  token?: string;
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

    // URL absoluta para o host da API (resolveApiBaseUrl) — em produção
    // o frontend está em app.aurya... e a API em domínio separado, então
    // um fetch com path relativo bateria no host errado e retornaria 405.
    const apiBase = resolveApiBaseUrl().replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/entregas/romaneios`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pedidoIds, nomeMotoboy }),
    });

    const parsed = await safeReadResponseJson(response);
    if (!parsed.ok) {
      return { sucesso: false, error: parsed.error };
    }

    const data = flattenRomaneioCriarBody(parsed.data);
    const indicadorSucesso = data.sucesso === true || data.ok === true;
    if (!response.ok || !indicadorSucesso) {
      const msg =
        (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        'Falha ao criar romaneio';
      return { sucesso: false, error: msg };
    }

    return {
      sucesso: true,
      token: typeof data.token === 'string' ? data.token : undefined,
      uuid: typeof data.uuid === 'string' ? data.uuid : undefined,
      texto: typeof data.texto === 'string' ? data.texto : undefined,
      qrBase64: typeof data.qrBase64 === 'string' ? data.qrBase64 : undefined,
      romaneioData: data.romaneioData as RomaneioData | undefined,
    };
  } catch (e) {
    console.error('[criarRomaneio] Erro:', e);
    return { sucesso: false, error: 'Erro ao comunicar com o servidor' };
  }
}
