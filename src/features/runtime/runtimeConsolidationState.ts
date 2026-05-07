export type RuntimeConsolidationEvent = {
  category: string;
  status: string;
  timestamp: number;
};

const runtimeConsolidationEvents: RuntimeConsolidationEvent[] = [];

export function registerRuntimeConsolidationEvent(
  category: string,
  status: string,
): RuntimeConsolidationEvent {
  const event: RuntimeConsolidationEvent = {
    category,
    status,
    timestamp: Date.now(),
  };

  runtimeConsolidationEvents.push(event);

  if (runtimeConsolidationEvents.length > 500) {
    runtimeConsolidationEvents.shift();
  }

  console.info('[runtime-consolidation] event', event);

  return event;
}

export function getRuntimeConsolidationEvents(): RuntimeConsolidationEvent[] {
  return [...runtimeConsolidationEvents];
}
