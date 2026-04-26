/**
 * Cliente WebSocket para o AuryaHardwareAgent (C#) em ws://localhost:8080.
 * Comandos: IMPRIMIR_CUPOM, INICIAR_TEF, PING.
 */

export const HARDWARE_AGENT_WS_URL =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_HARDWARE_AGENT_WS ??
  'ws://localhost:8080';

export type HardwareAgentParsedMessage = Record<string, unknown>;

type Listener = (msg: HardwareAgentParsedMessage) => void;

class HardwareAgentClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly connectionListeners = new Set<(connected: boolean) => void>();
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private pendingOpenResolve: ((connected: boolean) => void) | null = null;
  private waitingOpen = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onConnectionChange(fn: (connected: boolean) => void): () => void {
    this.connectionListeners.add(fn);
    fn(this.isConnected);
    return () => this.connectionListeners.delete(fn);
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getUrl(): string {
    return HARDWARE_AGENT_WS_URL;
  }

  private emitConnection(connected: boolean) {
    this.connectionListeners.forEach((fn) => {
      try {
        fn(connected);
      } catch {
        /* ignore */
      }
    });
  }

  private notify(msg: HardwareAgentParsedMessage) {
    this.listeners.forEach((fn) => {
      try {
        fn(msg);
      } catch (e) {
        console.error('[HardwareAgent] listener error', e);
      }
    });
  }

  connect(): void {
    this.intentionalClose = false;
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.waitingOpen = true;
      return;
    }

    try {
      this.ws = new WebSocket(HARDWARE_AGENT_WS_URL);
    } catch (e) {
      console.error('[HardwareAgent] WebSocket create failed', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.emitConnection(true);
      if (this.waitingOpen && this.pendingOpenResolve) {
        this.pendingOpenResolve(true);
        this.pendingOpenResolve = null;
        this.waitingOpen = false;
      }
    };

    this.ws.onclose = () => {
      this.emitConnection(false);
      this.ws = null;
      if (this.waitingOpen && this.pendingOpenResolve) {
        this.pendingOpenResolve(false);
        this.pendingOpenResolve = null;
        this.waitingOpen = false;
      }
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      /* onclose trata reconexão */
    };

    this.ws.onmessage = (ev) => {
      const raw = typeof ev.data === 'string' ? ev.data : '';
      const trimmed = raw.trim();
      if (!trimmed) return;

      let parsed: HardwareAgentParsedMessage;
      try {
        parsed = JSON.parse(trimmed) as HardwareAgentParsedMessage;
      } catch {
        return;
      }

      this.notify(parsed);
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.emitConnection(false);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;
    const delay = Math.min(30_000, 1000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  waitForOpen(timeoutMs = 3000): Promise<boolean> {
    if (this.isConnected) return Promise.resolve(true);
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return new Promise((resolve) => {
        this.pendingOpenResolve = resolve;
        this.waitingOpen = true;
        setTimeout(() => {
          if (this.pendingOpenResolve) {
            this.pendingOpenResolve(this.isConnected);
            this.pendingOpenResolve = null;
            this.waitingOpen = false;
          }
        }, timeoutMs);
      });
    }
    this.connect();
    return new Promise((resolve) => {
      this.pendingOpenResolve = resolve;
      this.waitingOpen = true;
      setTimeout(() => {
        if (this.pendingOpenResolve) {
          this.pendingOpenResolve(this.isConnected);
          this.pendingOpenResolve = null;
          this.waitingOpen = false;
        }
      }, timeoutMs);
    });
  }

  send(payload: object): boolean {
    if (!this.isConnected) {
      console.warn('[HardwareAgent] offline — não enviou:', payload);
      return false;
    }
    try {
      this.ws!.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('[HardwareAgent] send failed', e);
      return false;
    }
  }

  ping(): boolean {
    return this.send({ acao: 'PING' });
  }
}

let singleton: HardwareAgentClient | null = null;

export function getHardwareAgent(): HardwareAgentClient {
  if (!singleton) singleton = new HardwareAgentClient();
  return singleton;
}
