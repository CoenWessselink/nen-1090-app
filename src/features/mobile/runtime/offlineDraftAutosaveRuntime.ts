export type OfflineAutosaveSnapshot = {
  draftId: string;
  projectId: string;
  weldId: string;
  autosaveTriggered: boolean;
  restoreAvailable: boolean;
  timestamp: number;
};

const snapshots: OfflineAutosaveSnapshot[] = [];

const STORAGE_PREFIX = 'weldinspect-autosave';

export function buildOfflineAutosaveKey(
  projectId: string,
  weldId: string,
): string {
  return `${STORAGE_PREFIX}:${projectId}:${weldId}`;
}

export function saveOfflineAutosaveDraft(
  projectId: string,
  weldId: string,
  payload: unknown,
): void {
  const key = buildOfflineAutosaveKey(projectId, weldId);

  window.localStorage.setItem(
    key,
    JSON.stringify({
      payload,
      updatedAt: Date.now(),
    }),
  );

  registerOfflineAutosaveSnapshot({
    draftId: key,
    projectId,
    weldId,
    autosaveTriggered: true,
    restoreAvailable: true,
  });

  console.info('[offline-autosave-runtime] draft autosaved', {
    projectId,
    weldId,
  });
}

export function restoreOfflineAutosaveDraft(
  projectId: string,
  weldId: string,
): unknown | null {
  const key = buildOfflineAutosaveKey(projectId, weldId);

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    registerOfflineAutosaveSnapshot({
      draftId: key,
      projectId,
      weldId,
      autosaveTriggered: false,
      restoreAvailable: true,
    });

    console.info('[offline-autosave-runtime] draft restored', {
      projectId,
      weldId,
    });

    return parsed?.payload ?? null;
  } catch {
    return null;
  }
}

export function clearOfflineAutosaveDraft(
  projectId: string,
  weldId: string,
): void {
  const key = buildOfflineAutosaveKey(projectId, weldId);
  window.localStorage.removeItem(key);

  console.info('[offline-autosave-runtime] draft cleared', {
    projectId,
    weldId,
  });
}

export function registerOfflineAutosaveSnapshot(
  snapshot: Omit<OfflineAutosaveSnapshot, 'timestamp'>,
): void {
  const nextSnapshot: OfflineAutosaveSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  snapshots.push(nextSnapshot);

  if (snapshots.length > 300) {
    snapshots.shift();
  }

  console.info('[offline-autosave-runtime] snapshot', nextSnapshot);
}

export function getOfflineAutosaveSnapshots(): OfflineAutosaveSnapshot[] {
  return [...snapshots];
}
