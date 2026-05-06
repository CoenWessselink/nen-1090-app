export type OfflineUploadQueueItem = {
  id: string;
  projectId: string;
  weldId?: string;
  filename: string;
  size: number;
  createdAt: number;
  retryCount: number;
  status: 'queued' | 'uploading' | 'failed' | 'completed';
};

const STORAGE_KEY = 'offline-upload-queue-runtime';

function loadQueue(): OfflineUploadQueueItem[] {
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

function persistQueue(queue: OfflineUploadQueueItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function queueOfflineUpload(
  item: Omit<OfflineUploadQueueItem, 'createdAt' | 'retryCount' | 'status'>,
): OfflineUploadQueueItem {
  const queue = loadQueue();

  const nextItem: OfflineUploadQueueItem = {
    ...item,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'queued',
  };

  queue.unshift(nextItem);
  persistQueue(queue);

  console.info('[offline-upload-runtime] queued', {
    id: nextItem.id,
    filename: nextItem.filename,
  });

  return nextItem;
}

export function getOfflineUploadQueue(): OfflineUploadQueueItem[] {
  return loadQueue();
}

export function updateOfflineUploadStatus(
  id: string,
  status: OfflineUploadQueueItem['status'],
): void {
  const queue = loadQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index < 0) {
    return;
  }

  queue[index] = {
    ...queue[index],
    status,
    retryCount:
      status === 'failed'
        ? queue[index].retryCount + 1
        : queue[index].retryCount,
  };

  persistQueue(queue);

  console.info('[offline-upload-runtime] status changed', {
    id,
    status,
  });
}

export function triggerOfflineUploadReconnectFlush(): void {
  console.info('[offline-upload-runtime] reconnect flush', {
    queueSize: loadQueue().length,
    online: navigator.onLine,
  });
}

window.addEventListener('online', () => {
  triggerOfflineUploadReconnectFlush();
});
