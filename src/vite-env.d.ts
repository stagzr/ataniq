/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  readonly VITE_WS_TELEMETRY_URL?: string;
  readonly VITE_WS_ALERTS_URL?: string;
  readonly VITE_WS_CONTACTS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
