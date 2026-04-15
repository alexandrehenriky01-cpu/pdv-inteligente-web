/**
 * Coreografia CNC (Confirmação Não Concluída): autorização no PinPad → persistir venda →
 * só então FINALIZAR_SITEF + confirmação no ERP. Falha ao salvar venda → desfazer no hardware + cancelar TEF.
 */
import { AxiosError } from 'axios';
import { api } from './api';
import { getHardwareAgent } from './hardwareAgent';

export function obterEstacaoTefId(): string {
  return (
    localStorage.getItem('estacao_trabalho_id')?.trim() ||
    localStorage.getItem('@PDV_WorkstationId')?.trim() ||
    ''
  );
}

export function hardwareAgentFinalizarSitaf(confirmar: boolean): void {
  getHardwareAgent().send({ acao: 'FINALIZAR_SITEF', confirmar });
}

/** Aguarda o JSON `FINALIZADO_SITEF` do agente (2PC — após venda persistida como PENDENTE_TEF). */
export async function aguardarRespostaFinalizarSitaf(confirmar: boolean): Promise<{
  tipo: 'RESPOSTA_TEF';
  status: 'FINALIZADO_SITEF';
  confirmou: boolean;
  codigoRetorno: number;
}> {
  const agent = getHardwareAgent();
  if (!agent.isConnected) {
    throw new Error('Hardware local offline para finalizar SiTef.');
  }

  return await new Promise((resolve, reject) => {
    const timeoutMs = 120_000;
    let unsub: (() => void) | null = null;
    const t = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timeout aguardando FINALIZADO_SITEF do agente local.'));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(t);
      unsub?.();
      unsub = null;
    };

    unsub = agent.subscribe((msg) => {
      if (msg.tipo !== 'RESPOSTA_TEF') return;
      if (String(msg.status ?? '') !== 'FINALIZADO_SITEF') return;
      const confirmou = Boolean(msg.confirmou);
      const cr = msg.codigoRetorno;
      const codigoRetorno = typeof cr === 'number' ? cr : Number(cr);
      if (!Number.isFinite(codigoRetorno)) {
        cleanup();
        reject(new Error('Resposta FINALIZADO_SITEF sem codigoRetorno numérico.'));
        return;
      }
      cleanup();
      resolve({
        tipo: 'RESPOSTA_TEF',
        status: 'FINALIZADO_SITEF',
        confirmou,
        codigoRetorno,
      });
    });

    const enviado = agent.send({ acao: 'FINALIZAR_SITEF', confirmar });
    if (!enviado) {
      cleanup();
      reject(new Error('Não foi possível enviar FINALIZAR_SITEF ao agente.'));
    }
  });
}

/**
 * Fase 2 do 2PC: uma finalização SiTef por transação (sequencial), depois um único commit no ERP.
 */
export async function tefCommitVendaDoisFases(params: {
  vendaId: string;
  transacaoTefIds: string[];
  contextoFood?: { modo: 'MESA' | 'DELIVERY' | 'FOOD'; mesa?: number };
}): Promise<void> {
  const ids = [...new Set(params.transacaoTefIds.filter((id) => id && id.trim().length > 0))];
  if (ids.length === 0) return;

  const confirmacoesHardware: Array<{
    transacaoTefId: string;
    agente: {
      tipo: 'RESPOSTA_TEF';
      status: 'FINALIZADO_SITEF';
      confirmou: boolean;
      codigoRetorno: number;
    };
  }> = [];

  for (const transacaoTefId of ids) {
    const agente = await aguardarRespostaFinalizarSitaf(true);
    confirmacoesHardware.push({ transacaoTefId, agente });
  }

  const res = await api.post<{ sucesso?: boolean; erro?: string }>(
    `/api/vendas/${encodeURIComponent(params.vendaId)}/confirmar-tef`,
    {
      confirmacoesHardware,
      ...(params.contextoFood ? { contextoFood: params.contextoFood } : {}),
    }
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Falha HTTP ao confirmar venda TEF (${res.status}).`);
  }
  const d = res.data;
  if (d && d.sucesso === false) {
    throw new Error(d.erro || 'Falha ao confirmar venda TEF no ERP.');
  }
}

export async function tefConfirmarNoErpAposSitaf(transacaoTefId: string): Promise<void> {
  const res = await api.post<{ sucesso?: boolean; erro?: string }>('/api/tef/confirmar', {
    transacaoTefId,
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Falha HTTP ao confirmar TEF (${res.status}).`);
  }
  const d = res.data;
  if (d && d.sucesso === false) {
    throw new Error(d.erro || 'Falha ao confirmar TEF no ERP.');
  }
}

export async function tefCancelarNoErp(transacaoTefId: string, motivo: string): Promise<void> {
  await api.post('/api/tef/cancelar', { transacaoTefId, motivo }).catch(() => undefined);
}

/**
 * Após HTTP 200 da venda com TEF: finaliza SiTef com await e commit atômico no ERP (2PC).
 * `vendaId` obrigatório quando a API retornou `requerConfirmacaoTef`.
 */
export async function tefPosVendaSucessoCnc(
  transacaoTefIds: string[],
  opcoes?: { vendaId: string; contextoFood?: { modo: 'MESA' | 'DELIVERY' | 'FOOD'; mesa?: number } }
): Promise<void> {
  const ids = [...new Set(transacaoTefIds.filter((id) => id && id.trim().length > 0))];
  if (ids.length === 0) return;

  if (opcoes?.vendaId && opcoes.vendaId.trim().length > 0) {
    await tefCommitVendaDoisFases({
      vendaId: opcoes.vendaId.trim(),
      transacaoTefIds: ids,
      contextoFood: opcoes.contextoFood,
    });
    return;
  }

  for (const id of ids) {
    hardwareAgentFinalizarSitaf(true);
    await tefConfirmarNoErpAposSitaf(id);
  }
}

/** Falha ao salvar venda após autorização: reverte cobrança no cartão (mesma sessão) e cancela TEF no ERP. */
export async function tefFalhaSalvarVendaCnc(transacaoTefIds: string[]): Promise<void> {
  const ids = [...new Set(transacaoTefIds.filter((id) => id && id.trim().length > 0))];
  if (ids.length === 0) return;
  hardwareAgentFinalizarSitaf(false);
  for (const id of ids) {
    await tefCancelarNoErp(id, 'CNC: falha ao persistir venda — desfazer autorização TEF.');
  }
}

/** Cancela transação ainda não vendida (ex.: troca de forma de pagamento no PDV). */
export async function tefCancelarAutorizacaoPendente(transacaoTefId: string): Promise<void> {
  hardwareAgentFinalizarSitaf(false);
  await tefCancelarNoErp(transacaoTefId, 'Cancelamento antes da finalização da venda.');
}

export async function aguardarAutorizacaoTefHardware(params: {
  valor: number;
  tipoCartao: 'CREDITO' | 'DEBITO';
  terminal: string;
  onStatus?: (msg: string) => void;
}): Promise<{ transacaoTefId: string }> {
  const { valor, tipoCartao, terminal, onStatus } = params;
  if (valor <= 0) {
    throw new Error('Valor inválido para TEF.');
  }

  const agent = getHardwareAgent();
  agent.connect();
  await new Promise((r) => setTimeout(r, 400));
  if (!agent.isConnected) {
    throw new Error(
      'Hardware local offline. Inicie o AuryaHardwareAgent neste PC e verifique ws://localhost:8080.'
    );
  }

  return new Promise((resolve, reject) => {
    let finalizado = false;
    let unsub: (() => void) | null = null;

    const cleanup = () => {
      unsub?.();
      unsub = null;
    };

    unsub = agent.subscribe(async (msg) => {
      if (finalizado) return;
      if (msg.tipo !== 'RESPOSTA_TEF') return;
      const status = String(msg.status ?? '');

      if (status === 'AGUARDANDO_SENHA') {
        onStatus?.('Aguardando senha ou cartão no PinPad...');
        return;
      }
      if (status === 'PROCESSANDO') {
        onStatus?.(
          msg.mensagem != null && String(msg.mensagem).trim() !== ''
            ? String(msg.mensagem)
            : 'Processando na adquirente…'
        );
        return;
      }

      if (status === 'APROVADO') {
        finalizado = true;
        cleanup();
        const nsu = msg.nsu != null ? String(msg.nsu) : '';
        const codigoAutorizacao =
          msg.codigoAutorizacao != null ? String(msg.codigoAutorizacao) : undefined;
        const bandeiraCartao = msg.bandeira != null ? String(msg.bandeira) : undefined;
        const comprovanteLinhas = [
          '--- COMPROVANTE TEF (HARDWARE LOCAL) ---',
          nsu ? `NSU: ${nsu}` : '',
          codigoAutorizacao ? `AUTORIZACAO: ${codigoAutorizacao}` : '',
          bandeiraCartao ? `BANDEIRA: ${bandeiraCartao}` : '',
          `VALOR: R$ ${valor.toFixed(2)}`,
          `TIPO: ${tipoCartao}`,
          msg.mensagem != null ? String(msg.mensagem) : '',
        ]
          .filter(Boolean)
          .join('\n');

        try {
          const idEstacaoTef = obterEstacaoTefId();
          const res = await api.post<{
            sucesso: boolean;
            dados?: { transacaoTefId: string };
            erro?: string;
          }>('/api/tef/registrar-hardware', {
            valor,
            tipoCartao,
            terminal,
            nsu: nsu || `HW-${Date.now()}`,
            codigoAutorizacao,
            bandeiraCartao,
            comprovanteImpressao: comprovanteLinhas,
            ...(idEstacaoTef ? { estacaoTrabalhoId: idEstacaoTef } : {}),
          });
          if (res.status !== 200) {
            throw new Error(`HTTP ${res.status}: falha ao registrar TEF.`);
          }
          const { data } = res;
          if (!data.sucesso || !data.dados?.transacaoTefId) {
            throw new Error(data.erro || 'Falha ao registrar TEF no servidor.');
          }
          resolve({ transacaoTefId: data.dados.transacaoTefId });
        } catch (err) {
          hardwareAgentFinalizarSitaf(false);
          const ax = err as AxiosError<{ erro?: string; error?: string }>;
          reject(
            new Error(
              ax.response?.data?.erro ||
                ax.response?.data?.error ||
                (err instanceof Error ? err.message : 'Falha ao registrar TEF.')
            )
          );
        }
        return;
      }

      if (status === 'ERRO' || status === 'NEGADO' || status === 'CANCELADO') {
        finalizado = true;
        cleanup();
        reject(new Error(String(msg.mensagem ?? msg.erro ?? `Status: ${status}`)));
      }
    });

    onStatus?.('Enviando comando ao PinPad...');
    const enviado = agent.send({
      acao: 'INICIAR_TEF',
      valor,
      tipo: tipoCartao,
      parcelas: 1,
    });
    if (!enviado) {
      finalizado = true;
      cleanup();
      reject(new Error('Não foi possível enviar o comando TEF ao agente local.'));
    }
  });
}
