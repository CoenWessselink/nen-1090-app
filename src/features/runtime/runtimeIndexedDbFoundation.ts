export type IndexedRuntimeRecord = {
  key: string;
  payload: unknown;
  updatedAt: number;
};

const DB_NAME = 'weldinspect-runtime';
const STORE_NAME = 'runtime-store';
const DB_VERSION = 1;

export async function openRuntimeIndexedDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveIndexedRuntimeRecord(
  record: IndexedRuntimeRecord,
): Promise<void> {
  const db = await openRuntimeIndexedDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      ...record,
      updatedAt: Date.now(),
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  console.info('[runtime-indexeddb] record saved', {
    key: record.key,
  });
}
