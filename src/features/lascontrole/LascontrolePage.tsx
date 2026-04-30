import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { useProjectWelds } from '@/hooks/useProjects';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import type { Inspection, Weld } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

type LegacyWeldStatus = 'conform' | 'defect' | 'gerepareerd';

function normalizeStatus(value: unknown): LegacyWeldStatus {
  const raw = String(value || '').toLowerCase().replace(/_/g, '-');
  if (['defect', 'rejected', 'afgekeurd', 'niet-conform', 'niet conform'].includes(raw)) return 'defect';
  if (['gerepareerd', 'repaired', 'in-controle', 'in controle', 'pending', 'open'].includes(raw)) return 'gerepareerd';
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

function makeInspectionChecks(status: LegacyWeldStatus, inspection: Inspection | null) {
  const resultStatus: 'conform' | 'defect' = status === 'defect' ? 'defect' : 'conform';
  const approved = resultStatus === 'conform';
  const existing = Array.isArray((inspection as any)?.checks) ? ((inspection as any).checks as Array<Record<string, unknown>>) : [];
  if (existing.length) {
    return existing.map((check) => ({
      group_key: String(check.group_key || 'algemeen'),
      criterion_key: String(check.criterion_key || check.item_code || 'VISUAL_BASE'),
      approved,
      status: resultStatus,
      comment: check.comment ? String(check.comment) : '',
    }));
  }
  return [
    { group_key: 'algemeen', criterion_key: 'VISUAL_BASE', approved, status: resultStatus, comment: '' },
    { group_key: 'maatvoering', criterion_key: 'DIMENSION_CHECK', approved, status: resultStatus, comment: '' },
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
    for (const weld of visibleWelds) {
      await applyStatus(weld, status);
    }
  }

  const filters = (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={surfaceStyle({ display: 'grid', gap: 12 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a', fontWeight: 800 }}>
          <Search size={18} /> Lascontrole zoeken en filteren
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Zoek op lasnummer, locatie, lasser, WPS, materiaal of status"
          style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
        />
        {statusFilter ? <div style={{ color: '#64748b' }}>Actief statusfilter: <strong>{toStatusLabel(normalizeStatus(statusFilter))}</strong></div> : null}
      </div>
    </div>
  );

  const kpis = [
    <ProjectKpiActionCard key="welds" label="Lassen" value={stats.total} meta="Alle lassen in dit project" onClick={() => navigate(`/projecten/${projectId}/lassen`)} testId="lascontrole-kpi-welds" />,
    <ProjectKpiActionCard key="conform" label="Conform" value={stats.conform} meta={`${stats.ready}% gereed`} onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=conform`)} testId="lascontrole-kpi-conform" />,
    <ProjectKpiActionCard key="defect" label="Niet conform" value={stats.defect} meta="Open aandachtspunten" onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=defect`)} testId="lascontrole-kpi-defect" />,
    <ProjectKpiActionCard key="gerepareerd" label="In controle" value={stats.gerepareerd} meta="Herstel / review" onClick={() => navigate(`/projecten/${projectId}/lascontrole?status=gerepareerd`)} testId="lascontrole-kpi-gerepareerd" />,
  ];

  return (
    <>
      <ProjectTabShell
        projectId={String(projectId || '')}
        currentTab="lascontrole"
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten', { state: { intent: 'create-project' } })}
        onEditProject={() => navigate('/projecten', { state: { intent: 'edit-project', projectId } })}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lassen`)}
        exportSelectionLabel="PDF export bij selectie"
        exportSelectionDisabled
        filters={filters}
        kpis={kpis}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={surfaceStyle({ display: 'grid', gap: 12 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>Elite lasinspectie</div>
                <h3 style={{ margin: '4px 0 0' }}>Weld-first controlebord</h3>
              </div>
              <div style={{ minWidth: 240 }}>
                <div style={{ height: 10, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.ready}%`, height: '100%', background: stats.ready === 100 ? '#16a34a' : stats.ready > 50 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>Inspectie voortgang: {stats.ready}%</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={buttonStyle('conform', 'conform')}><CheckCircle2 size={15} /> {stats.conform} conform</span>
              <span style={buttonStyle('defect', 'defect')}>{stats.defect} niet conform</span>
              <span style={buttonStyle('gerepareerd', 'gerepareerd')}>{stats.gerepareerd} in controle</span>
              <button type="button" disabled={Boolean(savingRowId)} style={buttonStyle('conform')} onClick={() => void applyBulkStatus('conform')}>Alles conform</button>
              <button type="button" disabled={Boolean(savingRowId)} style={buttonStyle('defect')} onClick={() => void applyBulkStatus('defect')}>Alles niet conform</button>
            </div>
          </div>

          {visibleWelds.map((weld) => {
            const weldStatus = normalizeStatus((weld as any).status);
            const colors = statusColor(weldStatus);
            const id = String((weld as any).id);
            const rowBusy = savingRowId === id;
            return (
              <div key={id} style={surfaceStyle({ borderColor: colors.border, borderLeft: `6px solid ${colors.accent}`, background: rowBusy ? '#f8fafc' : '#fff' })} onDoubleClick={() => setSelectedWeld(weld)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.5fr) minmax(160px, .8fr) auto', gap: 14, alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{getText(weld, 'weld_number', 'weld_no', 'number') || `Las ${id}`}</strong>
                    <div style={{ marginTop: 8, color: '#64748b' }}>
                      {getText(weld, 'location') || 'Locatie onbekend'} · {getText(weld, 'welder_name', 'welders') || 'Geen lasser'} · {getText(weld, 'execution_class') || 'Geen EXC'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, color: '#64748b', fontSize: 12 }}>
                      <span><ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />WPS: {getText(weld, 'wps', 'wps_id') || '-'}</span>
                      <span><Camera size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Foto’s: {getText(weld, 'photos') || '0'}</span>
                    </div>
                  </div>
                  <span style={{ ...buttonStyle(weldStatus, weldStatus), background: colors.bg, color: colors.text, borderColor: colors.accent }}>{toStatusLabel(weldStatus)}</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" style={buttonStyle()} onClick={() => setSelectedWeld(weld)}>Open inspectie</button>
                    <button type="button" disabled={rowBusy} style={buttonStyle('conform', weldStatus)} onClick={() => void applyStatus(weld, 'conform')}>Conform</button>
                    <button type="button" disabled={rowBusy} style={buttonStyle('defect', weldStatus)} onClick={() => void applyStatus(weld, 'defect')}>Niet conform</button>
                    <button type="button" disabled={rowBusy} style={buttonStyle('gerepareerd', weldStatus)} onClick={() => void applyStatus(weld, 'gerepareerd')}>In controle</button>
                  </div>
                </div>
              </div>
            );
          })}

          {!visibleWelds.length ? <div style={surfaceStyle()}>Geen lassen gevonden voor dit filter.</div> : null}
        </div>
      </ProjectTabShell>

      <WeldInspectionModal
        open={Boolean(selectedWeld)}
        weld={selectedWeld}
        inspection={inspection}
        savingWeld={updateWeld.isPending}
        savingInspection={saveInspection.isPending}
        onClose={() => setSelectedWeld(null)}
        onQuickStatus={async (status) => {
          if (!selectedWeld) return;
          await patchWeldStatus.mutateAsync({ weldId: (selectedWeld as any).id, status });
          await weldsQuery.refetch();
        }}
        onSaveWeld={async (payload: WeldFormValues) => {
          if (!selectedWeld) return;
          await updateWeld.mutateAsync({ weldId: (selectedWeld as any).id, payload });
          await weldsQuery.refetch();
        }}
        onSaveInspection={async (payload) => {
          if (!selectedWeld) return;
          await saveInspection.mutateAsync(payload);
          await weldsQuery.refetch();
          await inspectionQuery.refetch();
        }}
      />
    </>
  );
}

export default LascontrolePage;
