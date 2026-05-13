/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true" at build time, localhost/127.0.0.1 still require login (e.g. Playwright CI). */
  readonly VITE_STRICT_AUTH_LOCAL?: string;
}
