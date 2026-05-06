export type OfflineInspectionDraft = {
  id: string;
  projectId: string;
  weldId: string;
  payload: unknown;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
};

const STORAGE_KEY = 'weldinspect-offline-inspection-drafts';
const MAX_DRAFTS = 500;

function loadDrafts(): OfflineInspectionDraft[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDrafts(drafts: OfflineInspectionDraft[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
}

export function saveOfflineInspectionDraft(
  draft: Omit<OfflineInspectionDraft, 'createdAt' | 'updatedAt' | 'syncStatus'>,
): OfflineInspectionDraft {
  const drafts = loadDrafts();

  const existingIndex = drafts.findIndex((item) => item.id === draft.id);

  const nextDraft: OfflineInspectionDraft = {
    ...draft,
    createdAt: existingIndex >= 0 ? drafts[existingIndex].createdAt : Date.now(),
    updatedAt: Date.now(),
    syncStatus: 'pending',
  };

  if (existingIndex >= 0) {
    drafts[existingIndex] = nextDraft;
  } else {
    drafts.unshift(nextDraft);
  }

  persistDrafts(drafts);

  console.info('[offline-inspection-runtime] draft saved', {
    id: nextDraft.id,
    weldId: nextDraft.weldId,
    projectId: nextDraft.projectId,
  });

  return nextDraft;
}

export function getOfflineInspectionDrafts(): OfflineInspectionDraft[] {
  return loadDrafts();
}

export function removeOfflineInspectionDraft(id: string): void {
  const drafts = loadDrafts().filter((draft) => draft.id !== id);
  persistDrafts(drafts);

  console.info('[offline-inspection-runtime] draft removed', {
    id,
  });
}

export function markOfflineDraftSyncState(
  id: string,
  syncStatus: OfflineInspectionDraft['syncStatus'],
): void {
  const drafts = loadDrafts();
  const index = drafts.findIndex((draft) => draft.id === id);

  if (index < 0) {
    return;
  }

  drafts[index] = {
    ...drafts[index],
    syncStatus,
    updatedAt: Date.now(),
  };

  persistDrafts(drafts);

  console.info('[offline-inspection-runtime] draft sync state changed', {
    id,
    syncStatus,
  });
}

export function registerReconnectSyncAttempt(): void {
  console.info('[offline-inspection-runtime] reconnect sync attempt', {
    timestamp: Date.now(),
    queuedDrafts: loadDrafts().length,
    online: navigator.onLine,
  });
}

window.addEventListener('online', () => {
  registerReconnectSyncAttempt();
});
