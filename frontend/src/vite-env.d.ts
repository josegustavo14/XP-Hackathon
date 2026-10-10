/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_LOCAL_BASE_URL?: string;
  readonly VITE_API_REMOTE_BASE_URL?: string;
  readonly VITE_API_ACCESS_TOKEN?: string;
  /** @deprecated Use VITE_API_MODE. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
