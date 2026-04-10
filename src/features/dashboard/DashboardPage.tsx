import { Activity, AlertTriangle, CheckCircle2, ChevronRight, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useProjects } from '@/hooks/useProjects';
import { useWelds } from '@/hooks/useWelds';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { formatDatetime, toneFromStatus } from '@/utils/format';
import {
  useDashboardSummary,
  useOpenDefectsSummary,
  usePendingInspectionsSummary,
  useRecentAudit,
  useRecentExports,
} from '@/hooks/useDashboardSummary';

type ProjectRow = {
  id: string | number;
  projectnummer?: string;
  name?: string;
  omschrijving?: string;
  status?: string;
};

type WeldRow = {
  id: string | number;
  project_id?: string | number;
  weld_number?: string;
  weld_no?: string;
  location?: string;
  status?: string;
};

type ActivityRow = {
  id?: string | number;
  project_id?: string | number;
  weld_id?: string | number;
  title?: string;
  action?: string;
  weld_number?: string;
  location?: string;
  description?: string;
  created_at?: string;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const projects = useProjects({ status: 'active', limit: 6 });
  const welds = useWelds({ limit: 6 });
  const summary = useDashboardSummary();
  const pendingInspections = usePendingInspectionsSummary();
  const openDefects = useOpenDefectsSummary();
  const recentAudit = useRecentAudit();
  const recentExports = useRecentExports();

  const projectRows = ((projects.data?.items || []) as unknown[]) as ProjectRow[];
  const weldRows = ((welds.data?.items || []) as unknown[]) as WeldRow[];
  const summaryData = (summary.data || {}) as Record<string, unknown>;
  const defects = Number(summaryData.open_weld_defects ?? openDefects.data?.total ?? 0);
  const readyDossiers = Number(summaryData.ce_dossier_ready ?? recentExports.data?.total ?? 0);
  const pendingCount = Number(summaryData.open_inspections ?? pendingInspections.data?.total ?? 0);
  const openProjects = Number(summaryData.open_projects ?? projects.data?.total ?? projectRows.length);
  const activityRows = (((recentAudit.data?.length ? recentAudit.data : weldRows) || []) as unknown[]) as ActivityRow[];

  const kpis = [
    { title: 'Open projecten', value: openProjects, onClick: () => navigate('/projecten') },
    { title: 'Open lasdefecten', value: defects, onClick: () => navigate('/projecten') },
    { title: 'Open inspecties', value: pendingCount, onClick: () => navigate('/projecten') },
    { title: 'CE dossier gereed', value: readyDossiers, onClick: () => navigate('/rapportage') },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" description="Operationeel overzicht met directe navigatie naar projecten, lassen en vervolgstappen." />

      <div className="dashboard-kpi-grid">
        {kpis.map((item) => (
          <button key={item.title} type="button" className="card stat-card card-button" onClick={item.onClick}>
            <div className="stat-label">{item.title}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-meta">Open detail</div>
          </button>
        ))}
      </div>

      <Card className="dashboard-action-bar">
        <div className="dashboard-action-bar-copy">
          <strong>Snelle acties</strong>
          <div className="list-subtle">Direct onder de KPI&apos;s: start meteen een nieuw project of registreer een nieuwe las.</div>
        </div>
        <div className="dashboard-action-bar-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/projecten')}>Nieuw project</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/projecten')}>Nieuwe las</button>
        </div>
      </Card>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><FolderKanban size={18} /> Projectvoortgang</h3>
            <Badge tone="neutral">Direct openen</Badge>
          </div>
          {projects.isLoading ? <LoadingState label="Projecten laden..." /> : null}
          {projects.isError ? <ErrorState title="Projecten niet geladen" description="Controleer of de projectenlijst bereikbaar is." /> : null}
          {!projects.isLoading && !projects.isError ? (
            <div className="list-stack">
              {projectRows.slice(0, 6).map((project) => (
                <button className="list-row list-row-button" type="button" key={String(project.id)} onClick={() => navigate(`/projecten/${project.id}/overzicht`)}>
                  <div>
                    <strong>{project.projectnummer || project.id}</strong>
                    <div className="list-subtle">{project.name || project.omschrijving || 'Onbekende projectnaam'}</div>
                  </div>
                  <div className="row-actions">
                    <Badge tone={toneFromStatus(String(project.status || ''))}>{String(project.status || 'Onbekend')}</Badge>
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="section-title-row">
            <h3><AlertTriangle size={18} /> Open aandachtspunten</h3>
            <Badge tone={defects > 0 ? 'warning' : 'success'}>{defects > 0 ? 'Actie nodig' : 'Stabiel'}</Badge>
          </div>
          <div className="metric-block">
            <div className="metric-inline"><Activity size={16} /> Open inspecties: <strong>{pendingCount}</strong></div>
            <div className="metric-inline"><CheckCircle2 size={16} /> Recente exports: <strong>{recentExports.data?.total || 0}</strong></div>
          </div>
          <div className="divider" />
          <div className="list-stack compact-list">
            {weldRows.slice(0, 5).map((weld) => {
              const projectId = String(weld.project_id || '');
              return (
                <button className="list-row list-row-button" type="button" key={String(weld.id)} onClick={() => navigate(projectId ? `/projecten/${projectId}/lassen/${weld.id}` : '/projecten')}>
                  <div>
                    <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                    <div className="list-subtle">{weld.location || 'Locatie onbekend'}</div>
                  </div>
                  <div className="row-actions">
                    <Badge tone={toneFromStatus(String(weld.status || ''))}>{String(weld.status || 'Onbekend')}</Badge>
                    <ChevronRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3>Recente activiteit</h3>
          </div>
          {activityRows.length ? (
            <div className="timeline-list">
              {activityRows.slice(0, 5).map((row, index) => {
                const projectId = String(row.project_id || '');
                const weldId = String(row.weld_id || row.id || '');
                return (
                  <button key={String(row.id || index)} type="button" className="timeline-item timeline-item-button" onClick={() => navigate(projectId ? `/projecten/${projectId}/lassen/${weldId}` : '/projecten')}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{String(row.title || row.action || row.weld_number || `Activiteit ${index + 1}`)}</strong>
                      <div className="list-subtle">{String(row.location || row.description || '')} · {formatDatetime(row.created_at)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="state-box">Nog geen recente activiteit beschikbaar vanuit de backend.</div>
          )}
        </Card>
        <Card>
          <div className="section-title-row">
            <h3>Volgende stap</h3>
          </div>
          <div className="list-stack compact-list">
            <button className="list-row list-row-button" type="button" onClick={() => navigate('/projecten')}>
              <div>
                <strong>Open Projecten</strong>
                <div className="list-subtle">Ga direct naar de operationele projectflow en open Project 360.</div>
              </div>
              <ChevronRight size={16} />
            </button>
            <button className="list-row list-row-button" type="button" onClick={() => navigate('/rapportage')}>
              <div>
                <strong>Open Rapportage</strong>
                <div className="list-subtle">Bekijk exports, managementrapportages en CE-output.</div>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
