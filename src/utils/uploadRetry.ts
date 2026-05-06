export type UploadRetryOptions = {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withUploadRetry<T>(
  operation: () => Promise<T>,
  options: UploadRetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) => {
      const message = String((error as { message?: string })?.message || '').toLowerCase();

      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('failed to fetch') ||
        message.includes('503') ||
        message.includes('502')
      );
    });

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      console.info('[upload-retry] attempt', attempt);
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt >= retries) {
        console.error('[upload-retry] giving up', {
          attempt,
          error,
        });
        break;
      }

      console.warn('[upload-retry] retry scheduled', {
        attempt,
        delayMs,
      });

      await wait(delayMs * attempt);
    }
  }

  throw lastError;
}
