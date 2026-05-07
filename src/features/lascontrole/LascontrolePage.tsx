import { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { useProjectWelds } from '@/hooks/useProjects';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import {
  calculateWeldRenderWindow,
  registerWeldVirtualizationSnapshot,
} from '@/features/welds/runtime/weldVirtualizationRuntime';
import type { Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type LegacyWeldStatus = 'conform' | 'defect' | 'gerepareerd';

const VIRTUAL_SCROLL_STEP = 40;

function normalizeStatus(value: unknown): LegacyWeldStatus {
  const raw = String(value || '').toLowerCase().replace(/_/g, '-').trim();
  if (['defect', 'rejected', 'afgekeurd', 'niet-conform', 'niet conform', 'not-conform', 'not conform', 'non-conform', 'non conform', 'non-compliant', 'not-compliant', 'repair-required', 'repair required'].includes(raw)) return 'defect';
  if (['gerepareerd', 'repaired', 'in-controle', 'in controle', 'in-control', 'in control', 'pending', 'open'].includes(raw)) return 'gerepareerd';
  return 'conform';
}

function toStatusLabel(status: LegacyWeldStatus) {
  if (status === 'gerepareerd') return 'In controle';
  if (status === 'defect') return 'Niet conform';
  return 'Conform';
}

function statusColor(status: LegacyWeldStatus) {
  if (status === 'defect') return { border: '#fca5a5', bg: '#fef2f2', text: '#991b1b', accent: '#ef4444' };
  if (status === 'gerepareerd') return { border: '#fde68a', bg: '#fffbeb', text: '#92400e', accent: '#f59e0b' };
  return { border: '#86efac', bg: '#f0fdf4', text: '#166534', accent: '#16a34a' };
}

function surfaceStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 10px 28px rgba(15,23,42,.05)',
    ...extra,
  };
}

function buttonStyle(status?: LegacyWeldStatus, activeStatus?: LegacyWeldStatus): React.CSSProperties {
  const active = Boolean(status && activeStatus === status);
  const color = status ? statusColor(status) : { border: '#cbd5e1', bg: '#ffffff', text: '#0f172a', accent: '#3b82f6' };
  return {
    borderRadius: 12,
    border: `1px solid ${active ? color.accent : color.border}`,
    background: active ? color.bg : '#ffffff',
    color: active ? color.text : '#0f172a',
    fontWeight: 700,
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function getText(row: Weld, ...keys: string[]) {
  const record = row as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return '';
}

function checkStatus(value: unknown): 'conform' | 'defect' {
  return normalizeStatus(value) === 'defect' ? 'defect' : 'conform';
}

function makeInspectionChecks(status: LegacyWeldStatus, inspection: Inspection | null) {
  const resultStatus: 'conform' | 'defect' = status === 'defect' ? 'defect' : 'conform';
  const approved = resultStatus === 'conform';
  const existing = Array.isArray((inspection as any)?.checks) ? ((inspection as any).checks as Array<Record<string, unknown>>) : [];
  if (existing.length) {
    return existing.map((check, index) => {
      const existingStatus = checkStatus(check.status ?? check.result ?? (check.approved === false ? 'defect' : 'conform'));
      return {
        group_key: String(check.group_key || check.group || 'algemeen'),
        criterion_key: String(check.criterion_key || check.item_code || check.code || `CHECK_${index + 1}`),
        item_code: String(check.item_code || check.criterion_key || check.code || `CHECK_${index + 1}`),
        applicable: check.applicable ?? true,
        approved: check.approved ?? existingStatus === 'conform',
        status: existingStatus,
        result: existingStatus,
        comment: check.comment || check.remark ? String(check.comment || check.remark) : '',
        remark: check.remark || check.comment ? String(check.remark || check.comment) : '',
      };
    });
  }
  return [
    { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', item_code: 'VISUAL_BASE', applicable: true, approved, status: resultStatus, result: resultStatus, comment: '', remark: '' },
    { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', item_code: 'DIMENSION_CHECK', applicable: true, approved, status: resultStatus, result: resultStatus, comment: '', remark: '' },
  ];
}

export function LascontrolePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const statusFilter = new URLSearchParams(location.search).get('status');
  const [search, setSearch] = useState('');
  const [selectedWeld, setSelectedWeld] = useState<Weld | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 200 });
  const welds = (weldsQuery.data?.items || []) as Weld[];
  const inspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const updateWeld = useUpdateWeld(String(projectId || ''));
  const patchWeldStatus = usePatchWeldStatus(String(projectId || ''));
  const inspection = inspectionQuery.data as Inspection | null;

  const visibleWelds = useMemo(() => {
    const normalizedFilter = statusFilter ? normalizeStatus(statusFilter) : null;
    const needle = search.trim().toLowerCase();
    return welds.filter((item) => {
      if (normalizedFilter && normalizeStatus((item as any).status) !== normalizedFilter) return false;
      if (!needle) return true;
      return [
        getText(item, 'weld_number', 'weld_no', 'number'),
        getText(item, 'location'),
        getText(item, 'welder_name', 'welders'),
        getText(item, 'wps', 'wps_id'),
        getText(item, 'material'),
        getText(item, 'status'),
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [statusFilter, search, welds]);

  const virtualizationWindow = useMemo(() => {
    return calculateWeldRenderWindow(visibleWelds.length, scrollOffset);
  }, [visibleWelds.length, scrollOffset]);

  const renderedWelds = useMemo(() => {
    return visibleWelds.slice(virtualizationWindow.startIndex, virtualizationWindow.endIndex);
  }, [visibleWelds, virtualizationWindow]);

  useEffect(() => {
    registerWeldVirtualizationSnapshot({
      datasetId: `project-${projectId || 'unknown'}-welds`,
      totalRows: visibleWelds.length,
      visibleRows: renderedWelds.length,
      scrollOffset,
      virtualizationEnabled: virtualizationWindow.virtualizationEnabled,
    });
  }, [projectId, renderedWelds.length, scrollOffset, visibleWelds.length, virtualizationWindow.virtualizationEnabled]);

  const stats = useMemo(() => {
    const total = welds.length;
    const conform = welds.filter((item) => normalizeStatus((item as any).status) === 'conform').length;
    const defect = welds.filter((item) => normalizeStatus((item as any).status) === 'defect').length;
    const gerepareerd = welds.filter((item) => normalizeStatus((item as any).status) === 'gerepareerd').length;
    const ready = total ? Math.round((conform / total) * 100) : 0;
    return { total, conform, defect, gerepareerd, ready };
  }, [welds]);

  async function applyStatus(weld: Weld, status: LegacyWeldStatus) {
    const id = String((weld as any).id);
    setSavingRowId(id);
    setSelectedWeld(weld);
    try {
      await patchWeldStatus.mutateAsync({ weldId: (weld as any).id, status });
      await saveInspection.mutateAsync({
        status,
        template_id: (inspection as any)?.template_id ? String((inspection as any).template_id) : undefined,
        remarks: typeof (inspection as any)?.remarks === 'string' ? (inspection as any).remarks : '',
        checks: makeInspectionChecks(status, inspection),
      });
      await weldsQuery.refetch();
      await inspectionQuery.refetch();
    } finally {
      setSavingRowId(null);
    }
  }

  async function applyBulkStatus(status: LegacyWeldStatus) {
    for (const weld of renderedWelds) {
      await applyStatus(weld, status);
    }
  }

  return <div />;
}

export default LascontrolePage;
