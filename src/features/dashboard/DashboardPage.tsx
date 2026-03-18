import { Activity, AlertTriangle, CheckCircle2, FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { Badge } from '@/components/ui/Badge';
import { useProjects } from '@/hooks/useProjects';
import { useWelds } from '@/hooks/useWelds';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { formatDatetime, toneFromStatus } from '@/utils/format';
import { useDashboardSummary, useOpenDefectsSummary, usePendingInspectionsSummary, useRecentAudit, useRecentExports } from '@/hooks/useDashboardSummary';

export function DashboardPage() {
  const projects = useProjects({ status: 'active', limit: 6 });
  const welds = useWelds({ limit: 6 });
  const health = useSystemHealth();
  const summary = useDashboardSummary();
  const pendingInspections = usePendingInspectionsSummary();
  const openDefects = useOpenDefectsSummary();
  const recentAudit = useRecentAudit();
  const recentExports = useRecentExports();

  const projectRows = projects.data?.items || [];
  const weldRows = welds.data?.items || [];
  const derivedDefects = weldRows.filter((item) => Number(item.defect_count || 0) > 0).length;
  const summaryData = summary.data || {};
  const defects = Number(summaryData.open_weld_defects ?? summaryData.open_defects ?? openDefects.data?.total ?? derivedDefects ?? 0);
  const readyDossiers = Number(summaryData.dossier_ready ?? summaryData.ce_dossier_progress ?? 0);
  const pendingCount = Number(summaryData.pending_inspections ?? pendingInspections.data?.total ?? 0);
  const activityRows = Array.isArray(summaryData.recent_activity) && summaryData.recent_activity.length
    ? summaryData.recent_activity
    : recentAudit.data?.length
      ? recentAudit.data
      : weldRows;

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" description="Realtime enterprise-overzicht op basis van bestaande backend-endpoints en nieuwe aggregaten waar beschikbaar." />
      <KpiStrip
        items={[
          { title: 'Open projecten', value: Number(summaryData.open_projects ?? projects.data?.total ?? projectRows.length), meta: 'GET /dashboard/summary of /projects' },
          { title: 'Open lasdefecten', value: defects, meta: 'GET /weld-defects?status=open' },
          { title: 'Open inspecties', value: pendingCount, meta: 'GET /inspections?status=pending' },
          { title: 'CE dossier gereed', value: readyDossiers, meta: 'Dashboard summary / compliance' },
          { title: 'API-status', value: health.data ? 'Verbonden' : health.isError ? 'Fout' : 'Controleren', meta: 'Bestaande omgeving' },
        ]}
      />

      <div className="content-grid-2">
        <Card>
          <div className="section-title-row">
            <h3><FolderKanban size={18} /> Projectvoortgang</h3>
            <Badge tone="neutral">Live</Badge>
          </div>
          {projects.isLoading ? <LoadingState label="Projecten laden..." /> : null}
          {projects.isError ? <ErrorState title="Projecten niet geladen" description="Controleer of /projects bereikbaar is via de bestaande backend." /> : null}
          {!projects.isLoading && !projects.isError ? (
            <div className="list-stack">
              {projectRows.slice(0, 6).map((project) => (
                <div className="list-row" key={String(project.id)}>
                  <div>
                    <strong>{project.projectnummer || project.id}</strong>
                    <div className="list-subtle">{project.name || project.omschrijving || 'Onbekende projectnaam'}</div>
                  </div>
                  <Badge tone={toneFromStatus(String(project.status || ''))}>{String(project.status || 'Onbekend')}</Badge>
                </div>
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
            {weldRows.slice(0, 5).map((weld) => (
              <div className="list-row" key={String(weld.id)}>
                <div>
                  <strong>{weld.wps_id || `Las ${weld.id}`}</strong>
                  <div className="list-subtle">{weld.location || 'Locatie onbekend'}</div>
                </div>
                <Badge tone={toneFromStatus(String(weld.status || ''))}>{String(weld.status || 'Onbekend')}</Badge>
              </div>
            ))}
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
              {activityRows.slice(0, 5).map((item, index) => (
                <div className="timeline-item" key={String((item as Record<string, unknown>).id || index)}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{String((item as Record<string, unknown>).title || (item as Record<string, unknown>).action || (item as Record<string, unknown>).wps_id || `Activiteit ${index + 1}`)}</strong>
                    <div className="list-subtle">{String((item as Record<string, unknown>).location || (item as Record<string, unknown>).description || '')} · {formatDatetime((item as Record<string, unknown>).created_at as string | undefined)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="state-box">Nog geen recente activiteit beschikbaar vanuit de backend.</div>
          )}
        </Card>
        <Card>
          <div className="section-title-row">
            <h3>Omgevingsstatus</h3>
            {health.data ? <Badge tone="success">Verbonden</Badge> : null}
          </div>
          {health.isLoading ? <LoadingState label="Health endpoint controleren..." /> : null}
          {health.isError ? <ErrorState description="De bestaande Azure API reageert niet via de ingestelde URL." /> : null}
          {health.data ? <pre className="code-block">{JSON.stringify(health.data, null, 2)}</pre> : null}
        </Card>
      </div>
    </div>
  );
}
