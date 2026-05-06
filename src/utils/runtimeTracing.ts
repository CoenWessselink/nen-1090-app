export function runtimeTrace(event: string, details?: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  console.info(`[runtime-trace] ${event}`, details || {});
}
