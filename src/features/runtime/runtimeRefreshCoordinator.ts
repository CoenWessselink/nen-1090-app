export type RuntimeRefreshEvent = {
  scope: string;
  source: string;
  timestamp: number;
};

const refreshEvents: RuntimeRefreshEvent[] = [];

export function registerRuntimeRefresh(
  scope: string,
  source: string,
): RuntimeRefreshEvent {
  const event: RuntimeRefreshEvent = {
    scope,
    source,
    timestamp: Date.now(),
  };

  refreshEvents.push(event);

  if (refreshEvents.length > 300) {
    refreshEvents.shift();
  }

  console.info('[runtime-refresh] refresh registered', event);

  return event;
}

export function getRuntimeRefreshEvents(): RuntimeRefreshEvent[] {
  return [...refreshEvents];
}
