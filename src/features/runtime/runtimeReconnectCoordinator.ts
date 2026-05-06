export type RuntimeReconnectEvent = {
  online: boolean;
  reconnectAttempt: number;
  timestamp: number;
};

const reconnectEvents: RuntimeReconnectEvent[] = [];

let reconnectAttempt = 0;

export function registerReconnectEvent(online: boolean): RuntimeReconnectEvent {
  if (online) {
    reconnectAttempt += 1;
  }

  const event: RuntimeReconnectEvent = {
    online,
    reconnectAttempt,
    timestamp: Date.now(),
  };

  reconnectEvents.push(event);

  if (reconnectEvents.length > 250) {
    reconnectEvents.shift();
  }

  console.info('[runtime-reconnect] event', event);

  return event;
}

export function getReconnectEvents(): RuntimeReconnectEvent[] {
  return [...reconnectEvents];
}

window.addEventListener('online', () => {
  registerReconnectEvent(true);
});

window.addEventListener('offline', () => {
  registerReconnectEvent(false);
});
