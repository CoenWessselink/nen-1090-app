export type SyncRecoveryEvent = {
  category: string;
  recovered: boolean;
  timestamp: number;
};

const syncRecoveryEvents: SyncRecoveryEvent[] = [];

export function registerSyncRecoveryEvent(
  category: string,
  recovered: boolean,
): SyncRecoveryEvent {
  const event: SyncRecoveryEvent = {
    category,
    recovered,
    timestamp: Date.now(),
  };

  syncRecoveryEvents.push(event);

  if (syncRecoveryEvents.length > 500) {
    syncRecoveryEvents.shift();
  }

  console.info('[runtime-sync-recovery] event', event);

  return event;
}

export function getSyncRecoveryEvents(): SyncRecoveryEvent[] {
  return [...syncRecoveryEvents];
}
