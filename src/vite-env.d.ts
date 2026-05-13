/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true" at build time, localhost/127.0.0.1 still require login (e.g. Playwright CI). */
  readonly VITE_STRICT_AUTH_LOCAL?: string;
  /** Sentry DSN; when unset, Sentry is disabled (no bundle/runtime cost beyond the lazy chunk guard). */
  readonly VITE_SENTRY_DSN?: string;
  /** Logical deploy name (e.g. production, staging). Defaults to import.meta.env.MODE. */
  readonly VITE_DEPLOYMENT_ENV?: string;
  /** Release / version label for Sentry and support (e.g. git tag or semver). */
  readonly VITE_APP_VERSION?: string;
  /** Short commit SHA for release correlation (CI injects this). */
  readonly VITE_COMMIT_SHA?: string;
}
