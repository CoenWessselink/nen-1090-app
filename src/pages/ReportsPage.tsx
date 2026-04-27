import { useEffect, useState } from 'react';
import { apiRequest } from '@/services/apiClient';
import type { ReportItem, ReportsResponse } from '@/types/reports';

function isReportItem(value: unknown): value is ReportItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string';
}

function normalizeReportsResponse(payload: unknown): ReportItem[] {
  if (!payload || typeof payload !== 'object' || !('items' in payload)) {
    return [];
  }

  const rawItems = (payload as ReportsResponse).items;
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.filter(isReportItem);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const response = await apiRequest<ReportsResponse>('/api/v1/reports');
        const nextReports = normalizeReportsResponse(response);
        if (!cancelled) {
          setReports(nextReports);
        }
      } catch {
        if (!cancelled) {
          setReports([]);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Rapportage</h1>
      {reports.length === 0 ? (
        <p>Geen rapporten</p>
      ) : (
        reports.map((report) => <div key={report.id}>{report.title}</div>)
      )}
    </div>
  );
}
