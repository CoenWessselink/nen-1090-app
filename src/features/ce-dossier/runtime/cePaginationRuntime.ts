export type CePaginationSnapshot = {
  projectId: string;
  totalRows: number;
  currentPage: number;
  pageSize: number;
  renderedRows: number;
  timestamp: number;
};

const snapshots: CePaginationSnapshot[] = [];

export const CE_DEFAULT_PAGE_SIZE = 50;
export const CE_MAX_PAGE_SIZE = 200;

export function calculateCePagination(
  totalRows: number,
  page: number,
  pageSize = CE_DEFAULT_PAGE_SIZE,
): {
  startIndex: number;
  endIndex: number;
  totalPages: number;
} {
  const safePageSize = Math.min(Math.max(pageSize, 1), CE_MAX_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = Math.min(totalRows, startIndex + safePageSize);

  return {
    startIndex,
    endIndex,
    totalPages,
  };
}

export function registerCePaginationSnapshot(
  snapshot: Omit<CePaginationSnapshot, 'timestamp'>,
): void {
  const nextSnapshot: CePaginationSnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };

  snapshots.push(nextSnapshot);

  if (snapshots.length > 200) {
    snapshots.shift();
  }

  console.info('[ce-pagination-runtime] snapshot', nextSnapshot);

  if (nextSnapshot.totalRows > 500) {
    console.info('[ce-pagination-runtime] large CE dataset paginated', {
      projectId: nextSnapshot.projectId,
      totalRows: nextSnapshot.totalRows,
      pageSize: nextSnapshot.pageSize,
    });
  }
}

export function getCePaginationSnapshots(): CePaginationSnapshot[] {
  return [...snapshots];
}
