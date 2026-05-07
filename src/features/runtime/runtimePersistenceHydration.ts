export type PersistenceHydrationEvent = {
  key: string;
  hydrated: boolean;
  timestamp: number;
};

const hydrationEvents: PersistenceHydrationEvent[] = [];

export function registerPersistenceHydration(
  key: string,
  hydrated: boolean,
): PersistenceHydrationEvent {
  const event: PersistenceHydrationEvent = {
    key,
    hydrated,
    timestamp: Date.now(),
  };

  hydrationEvents.push(event);

  if (hydrationEvents.length > 500) {
    hydrationEvents.shift();
  }

  console.info('[runtime-persistence] hydration event', event);

  return event;
}

export function getPersistenceHydrationEvents(): PersistenceHydrationEvent[] {
  return [...hydrationEvents];
}
