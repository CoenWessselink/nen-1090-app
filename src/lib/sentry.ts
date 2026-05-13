import { env } from '@/lib/env';

let initPromise: Promise<void> | null = null;

export function initSentry(): Promise<void> {
  if (!env.sentryDsn) {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: env.sentryDsn,
        environment: env.deploymentEnvironment,
        release: env.appRelease,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      });
    });
  }

  return initPromise;
}

export async function captureClientException(error: unknown, extras?: Record<string, unknown>): Promise<void> {
  if (!env.sentryDsn) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.captureException(error, { extra: extras });
  } catch {
    /* ignore secondary telemetry failures */
  }
}
