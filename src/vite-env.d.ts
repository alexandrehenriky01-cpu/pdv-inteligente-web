/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATADOG_APPLICATION_ID?: string;
  readonly VITE_DATADOG_CLIENT_TOKEN?: string;
  readonly VITE_DATADOG_SITE?: string;
  readonly VITE_DATADOG_SERVICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
