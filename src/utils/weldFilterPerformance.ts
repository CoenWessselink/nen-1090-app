export type WeldFilterMetrics = {
  totalRows: number;
  filteredRows: number;
  durationMs: number;
};

const filterHistory: WeldFilterMetrics[] = [];

export function registerWeldFilterMetrics(metrics: WeldFilterMetrics): void {
  filterHistory.push(metrics);

  if (filterHistory.length > 200) {
    filterHistory.shift();
  }

  console.info('[weld-filter] metrics registered', metrics);

  if (metrics.durationMs > 250) {
    console.warn('[weld-filter] slow filter detected', {
      durationMs: metrics.durationMs,
      totalRows: metrics.totalRows,
    });
  }
}

export function optimizeWeldSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getWeldFilterHistory(): WeldFilterMetrics[] {
  return [...filterHistory];
}
