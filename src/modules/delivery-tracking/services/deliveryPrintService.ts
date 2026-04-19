import { HARDWARE_AGENT_WS_URL, getHardwareAgent, type HardwareAgentParsedMessage } from '../../../services/hardwareAgent';

export interface ImpressaoPayload {
  texto: string;
  formato?: 'texto' | 'base64' | 'hex';
  impressora?: string;
  codepage?: string;
}

export interface ImpressaoResult {
  sucesso: boolean;
  mensagem?: string;
  impressora?: string;
}

type ImpressaoCallback = (result: ImpressaoResult) => void;

class DeliveryPrintService {
  private pendingCallbacks = new Map<string, ImpressaoCallback>();
  private agent = getHardwareAgent();
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.agent.subscribe((msg: HardwareAgentParsedMessage) => {
      const tipo = String(msg.tipo || '');
      if (tipo === 'RESPOSTA_IMPRESSAO') {
        const callback = this.pendingCallbacks.get('current');
        if (callback) {
          callback({
            sucesso: Boolean(msg.sucesso),
            mensagem: String(msg.mensagem || ''),
            impressora: String(msg.impressora || ''),
          });
          this.pendingCallbacks.delete('current');
        }
      }
    });
  }

  async imprimirCupomDelivery(
    textoCupom: string,
    impressora?: string,
    formato: 'texto' | 'base64' | 'hex' = 'texto'
  ): Promise<ImpressaoResult> {
    this.init();

    if (!this.agent.isConnected) {
      this.agent.connect();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!this.agent.isConnected) {
      return {
        sucesso: false,
        mensagem: 'Agente de Hardware offline. Verifique se o AuryaHardwareAgent está rodando neste PC (ws://localhost:8080).',
      };
    }

    return new Promise((resolve) => {
      this.pendingCallbacks.set('current', resolve);

      const payload = {
        acao: 'IMPRIMIR_CUPOM',
        formato,
        payload: textoCupom,
        impressora: impressora || '',
        codepage: formato === 'texto' ? '860' : '',
      };

      const sent = this.agent.send(payload);
      if (!sent) {
        this.pendingCallbacks.delete('current');
        resolve({
          sucesso: false,
          mensagem: 'Falha ao enviar comando para o Agente de Hardware.',
        });
        return;
      }

      setTimeout(() => {
        if (this.pendingCallbacks.has('current')) {
          this.pendingCallbacks.delete('current');
          resolve({
            sucesso: false,
            mensagem: 'Tempo limite aguardando resposta do Agente de Hardware.',
          });
        }
      }, 10000);
    });
  }

  isAgentConnected(): boolean {
    return this.agent.isConnected;
  }

  connectAgent(): void {
    this.init();
    this.agent.connect();
  }

  disconnectAgent(): void {
    this.agent.disconnect();
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.init();
    return this.agent.onConnectionChange(callback);
  }
}

export const deliveryPrintService = new DeliveryPrintService();
