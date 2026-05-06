export type RuntimeSample = {
  timestamp: number;
  durationMs: number;
  memoryMb?: number;
};

const runtimeSamples: RuntimeSample[] = [];

export function registerExportRuntimeSample(durationMs: number): void {
  const performanceMemory = (performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
    };
  }).memory;

  const sample: RuntimeSample = {
    timestamp: Date.now(),
    durationMs,
    memoryMb: performanceMemory?.usedJSHeapSize
      ? Math.round(performanceMemory.usedJSHeapSize / 1024 / 1024)
      : undefined,
  };

  runtimeSamples.push(sample);

  if (runtimeSamples.length > 100) {
    runtimeSamples.shift();
  }

  console.info('[export-runtime] sample registered', sample);

  if ((sample.memoryMb || 0) > 500) {
    console.warn('[export-runtime] high browser memory usage', {
      memoryMb: sample.memoryMb,
    });
  }

  if (sample.durationMs > 30000) {
    console.warn('[export-runtime] long export duration detected', {
      durationMs: sample.durationMs,
    });
  }
}

export function getExportRuntimeSamples(): RuntimeSample[] {
  return [...runtimeSamples];
}
