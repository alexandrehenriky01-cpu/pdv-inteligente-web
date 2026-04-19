import { HARDWARE_AGENT_WS_URL, getHardwareAgent, type HardwareAgentParsedMessage } from '../../../services/hardwareAgent';

export interface ParadaRotaRequest {
  pedidoId?: string;
  numeroPedido?: number | null;
  clienteNome: string;
  clienteTelefone?: string;
  endereco: string;
  valorReceber: number;
  observacoes?: string;
  linkMaps?: string;
}

export interface RomaneioRequest {
  uuid?: string;
  lojaNome?: string;
  lojaEndereco?: string;
  lojaTelefone?: string;
  nomeMotoboy?: string;
  horaSaida?: string;
  dataRota?: string;
  paradas: ParadaRotaRequest[];
}

export interface RomaneioMetadata {
  totalPedidos: number;
  totalReceber: number;
  nomeMotoboy?: string;
  horaSaida?: string;
  linkMapsRota?: string;
}

export interface RomaneioResponse {
  sucesso: boolean;
  texto?: string;
  qrBase64?: string;
  metadata?: RomaneioMetadata;
  error?: string;
}

export interface ImpressaoResult {
  sucesso: boolean;
  mensagem?: string;
  impressora?: string;
}

type ImpressaoCallback = (result: ImpressaoResult) => void;

class RouteManifestPrintService {
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

  async imprimirRomaneio(
    textoRomaneio: string,
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
        mensagem: 'Agente de Hardware offline. Verifique se o AuryaHardwareAgent esta rodando neste PC (ws://localhost:8080).',
      };
    }

    return new Promise((resolve) => {
      this.pendingCallbacks.set('current', resolve);

      const payload = {
        acao: 'IMPRIMIR_CUPOM',
        formato,
        payload: textoRomaneio,
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

export const routeManifestPrintService = new RouteManifestPrintService();
