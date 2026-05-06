const PDF_MEMORY_WARNING_THRESHOLD = 150 * 1024 * 1024;

export function logPdfRenderStart(context: string): void {
  console.info('[pdf-render] started', {
    context,
    timestamp: Date.now(),
  });

  monitorPdfMemory(context);
}

export function logPdfRenderCompleted(context: string): void {
  console.info('[pdf-render] completed', {
    context,
    timestamp: Date.now(),
  });
}

export function logPdfRenderFailed(context: string, error: unknown): void {
  console.error('[pdf-render] failed', {
    context,
    error,
    timestamp: Date.now(),
  });
}

export function monitorPdfMemory(context: string): void {
  const performanceMemory = (performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
    };
  }).memory;

  if (!performanceMemory?.usedJSHeapSize) {
    return;
  }

  const used = performanceMemory.usedJSHeapSize;

  console.info('[pdf-render] memory usage', {
    context,
    usedMB: Math.round(used / 1024 / 1024),
  });

  if (used > PDF_MEMORY_WARNING_THRESHOLD) {
    console.warn('[pdf-render] high memory usage detected', {
      context,
      usedMB: Math.round(used / 1024 / 1024),
      thresholdMB: Math.round(PDF_MEMORY_WARNING_THRESHOLD / 1024 / 1024),
    });
  }
}
