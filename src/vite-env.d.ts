/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATADOG_APPLICATION_ID?: string;
  readonly VITE_DATADOG_CLIENT_TOKEN?: string;
  readonly VITE_DATADOG_SITE?: string;
  readonly VITE_DATADOG_SERVICE?: string;
  /**
   * URL pública/base usada para gerar links de rastreamento de entregadores
   * (QR Code do romaneio + WhatsApp). Quando ausente, cai em
   * `window.location.origin`. Em dev local, configure como
   * `http://IP_DA_MAQUINA:5173` para que o celular acesse o servidor de dev.
   */
  readonly VITE_DELIVERY_TRACKING_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
