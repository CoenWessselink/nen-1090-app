export type WeldVirtualizationSnapshot = {
  datasetId: string;
  totalRows: number;
  visibleRows: number;
  scrollOffset: number;
  virtualizationEnabled: boolean;
  timestamp: number;
};

const snapshots: WeldVirtualizationSnapshot[] = [];

export const WELD_VIRTUALIZATION_THRESHOLD = 200;
export const WELD_RENDER_WINDOW = 80;

export function shouldVirtualizeWeldDataset(totalRows: number): boolean {
  return totalRows >= WELD_VIRTUALIZATION_THRESHOLD;
}

export function calculateWeldRenderWindow(
  totalRows: number,
  scrollOffset: number,
): {
  startIndex: number;
  endIndex: number;
  virtualizationEnabled: boolean;
} {
  const virtualizationEnabled = shouldVirtualizeWeldDataset(totalRows);

  if (!virtualizationEnabled) {
    return {
      startIndex: 0,
      endIndex: totalRows,
      virtualizationEnabled: false,
    };
  }

  const startIndex = Math.max(0, scrollOffset);
  const endIndex = Math.min(totalRows, startIndex + WELD_RENDER_WINDOW);

  return {
    startIndex,
    endIndex,
    virtualizationEnabled: true,
  };
}

export function registerWeldVirtualizationSnapshot(
  snapshot: Omit<WeldVirtualizationSnapshot, 'timestamp'>,
): void {
  const nextSnapshot: WeldVirtualizationSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  snapshots.push(nextSnapshot);

  if (snapshots.length > 200) {
    snapshots.shift();
  }

  console.info('[weld-virtualization-runtime] snapshot', nextSnapshot);

  if (nextSnapshot.virtualizationEnabled) {
    console.info('[weld-virtualization-runtime] virtualization active', {
      datasetId: nextSnapshot.datasetId,
      totalRows: nextSnapshot.totalRows,
      visibleRows: nextSnapshot.visibleRows,
    });
  }
}

export function getWeldVirtualizationSnapshots(): WeldVirtualizationSnapshot[] {
  return [...snapshots];
}
