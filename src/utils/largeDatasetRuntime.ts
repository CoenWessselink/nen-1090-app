export type LargeDatasetRuntimeSnapshot = {
  dataset: string;
  totalRows: number;
  renderedRows: number;
  virtualizationEnabled: boolean;
  createdAt: number;
};

const snapshots: LargeDatasetRuntimeSnapshot[] = [];

export const LARGE_DATASET_THRESHOLD = 250;
export const SAFE_RENDER_WINDOW = 120;

export function shouldEnableDatasetVirtualization(totalRows: number): boolean {
  return totalRows >= LARGE_DATASET_THRESHOLD;
}

export function calculateDatasetRenderWindow(
  totalRows: number,
  scrollIndex: number,
): {
  startIndex: number;
  endIndex: number;
  virtualizationEnabled: boolean;
} {
  const virtualizationEnabled = shouldEnableDatasetVirtualization(totalRows);

  if (!virtualizationEnabled) {
    return {
      startIndex: 0,
      endIndex: totalRows,
      virtualizationEnabled: false,
    };
  }

  const startIndex = Math.max(0, scrollIndex);
  const endIndex = Math.min(totalRows, startIndex + SAFE_RENDER_WINDOW);

  return {
    startIndex,
    endIndex,
    virtualizationEnabled: true,
  };
}

export function registerLargeDatasetRuntimeSnapshot(
  snapshot: Omit<LargeDatasetRuntimeSnapshot, 'createdAt'>,
): void {
  const nextSnapshot: LargeDatasetRuntimeSnapshot = {
    ...snapshot,
    createdAt: Date.now(),
  };

  snapshots.push(nextSnapshot);

  if (snapshots.length > 200) {
    snapshots.shift();
  }

  console.info('[large-dataset-runtime] snapshot', nextSnapshot);

  if (nextSnapshot.virtualizationEnabled) {
    console.info('[large-dataset-runtime] virtualization enabled', {
      dataset: nextSnapshot.dataset,
      totalRows: nextSnapshot.totalRows,
      renderedRows: nextSnapshot.renderedRows,
    });
  }
}

export function getLargeDatasetRuntimeSnapshots(): LargeDatasetRuntimeSnapshot[] {
  return [...snapshots];
}
