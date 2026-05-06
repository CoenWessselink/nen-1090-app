export type RuntimeTabEvent = {
  tabId: string;
  eventType: string;
  timestamp: number;
};

const runtimeTabEvents: RuntimeTabEvent[] = [];
const tabId = `tab-${Math.random().toString(36).slice(2)}`;

const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('weldinspect-runtime-sync')
  : null;

export function broadcastRuntimeTabEvent(eventType: string): RuntimeTabEvent {
  const event: RuntimeTabEvent = {
    tabId,
    eventType,
    timestamp: Date.now(),
  };

  runtimeTabEvents.push(event);

  if (runtimeTabEvents.length > 250) {
    runtimeTabEvents.shift();
  }

  if (channel) {
    channel.postMessage(event);
  }

  console.info('[runtime-multitab] broadcast', event);

  return event;
}

if (channel) {
  channel.onmessage = (message) => {
    runtimeTabEvents.push(message.data as RuntimeTabEvent);

    console.info('[runtime-multitab] received', message.data);
  };
}

export function getRuntimeTabEvents(): RuntimeTabEvent[] {
  return [...runtimeTabEvents];
}
