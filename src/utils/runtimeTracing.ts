type RuntimeTraceEntry = {
  event: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

const TRACE_BUFFER_LIMIT = 100;

function getTraceBuffer(): RuntimeTraceEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const runtimeWindow = window as typeof window & {
    __WELDINSPECT_RUNTIME_TRACE__?: RuntimeTraceEntry[];
  };

  if (!runtimeWindow.__WELDINSPECT_RUNTIME_TRACE__) {
    runtimeWindow.__WELDINSPECT_RUNTIME_TRACE__ = [];
  }

  return runtimeWindow.__WELDINSPECT_RUNTIME_TRACE__;
}

export function runtimeTrace(event: string, details?: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const entry: RuntimeTraceEntry = {
    event,
    timestamp: new Date().toISOString(),
    details,
  };

  const buffer = getTraceBuffer();

  buffer.push(entry);

  if (buffer.length > TRACE_BUFFER_LIMIT) {
    buffer.splice(0, buffer.length - TRACE_BUFFER_LIMIT);
  }

  if (import.meta.env.DEV) {
    console.info(`[runtime-trace] ${event}`, entry);
  }
}

export function getRuntimeTraceBuffer(): RuntimeTraceEntry[] {
  return [...getTraceBuffer()];
}
