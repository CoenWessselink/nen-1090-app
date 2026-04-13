import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProjectTabShell from '@/app/layout/ProjectTabShell';
import { ProjectKpiActionCard } from '@/features/projecten/components/ProjectKpiActionCard';
import { WeldInspectionModal } from '@/features/lascontrole/components/WeldInspectionModal';
import { useUpsertWeldInspection, useWeldInspection } from '@/hooks/useInspections';
import { useCreateProjectDocument, useProjectDocuments } from '@/hooks/useDocuments';
import { useProject, useProjectAssemblies, useProjectInspections, useProjectWelds } from '@/hooks/useProjects';
import { usePatchWeldStatus, useUpdateWeld } from '@/hooks/useWelds';
import { useInspectionTemplates, useWelders, useWps } from '@/hooks/useSettings';
import { useAuthStore } from '@/app/store/auth-store';
import type { Assembly, AuditEntry, CeDocument, Inspection, Project, Weld, WeldStatus } from '@/types/domain';
import type { WeldFormValues } from '@/types/forms';

function titleFromProject(project?: Project | null) {
  return project?.name || project?.omschrijving || project?.projectnummer || String(project?.id || '') || 'Project 360';
}

function currentTabFromPath(pathname: string) {
  if (pathname.includes('/assemblies')) return 'assemblies';
  if (pathname.includes('/lassen')) return 'lassen';
  if (pathname.includes('/documenten')) return 'documenten';
  if (pathname.includes('/ce-dossier')) return 'ce-dossier';
  if (pathname.includes('/historie')) return 'historie';
  return 'overzicht';
}

function normalizeStatus(value: unknown): WeldStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'gerepareerd') return 'gerepareerd';
  if (raw === 'defect') return 'defect';
  return 'conform';
}

function surfaceStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
  };
}

function statusLabel(status: WeldStatus) {
  if (status === 'defect') return 'Defect';
  if (status === 'gerepareerd') return 'Gerepareerd';
  return 'Conform';
}

function actionButtonStyle(kind: 'default' | 'blue' | 'conform' | 'defect' | 'gerepareerd' = 'default', active = false): React.CSSProperties {
  const palette = {
    default: { border: '#cbd5e1', bg: '#fff', color: '#0f172a' },
    blue: { border: '#93c5fd', bg: '#dbeafe', color: '#1d4ed8' },
    conform: { border: active ? '#16a34a' : '#cbd5e1', bg: active ? '#dcfce7' : '#fff', color: active ? '#166534' : '#0f172a' },
    defect: { border: active ? '#ef4444' : '#cbd5e1', bg: active ? '#fee2e2' : '#fff', color: active ? '#991b1b' : '#0f172a' },
    gerepareerd: { border: active ? '#3b82f6' : '#cbd5e1', bg: active ? '#dbeafe' : '#fff', color: active ? '#1d4ed8' : '#0f172a' },
  }[kind];

  return {
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  };
}

function matchesSearch(value: unknown, searchText: string) {
  return JSON.stringify(value).toLowerCase().includes(searchText);
}

function parseTemplateItems(template: Record<string, unknown>) {
  const items = template.items_json ?? template.items ?? [];
  if (Array.isArray(items)) return items as Array<Record<string, unknown>>;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function DocumentUploadCard({
  title,
  description,
  tone = 'wps',
  onUpload,
  uploading,
  documents,
}: {
  title: string;
  description: string;
  tone?: 'wps' | 'materials';
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  documents: CeDocument[];
}) {
  return (
    <div style={surfaceStyle()}>
      <strong>{title}</strong>
      <div style={{ marginTop: 8, color: '#64748b' }}>{description}</div>
      <label style={{ ...actionButtonStyle('blue'), marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {uploading ? 'Uploaden...' : 'Document toevoegen'}
        <input
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void onUpload(file).finally(() => {
              event.currentTarget.value = '';
            });
          }}
        />
      </label>
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {documents.length ? documents.map((document) => (
          <div key={String(document.id)} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: tone === 'wps' ? '#eff6ff' : '#f8fafc' }}>
            <strong>{String(document.title || document.filename || document.uploaded_filename || `Document ${document.id}`)}</strong>
            <div style={{ color: '#64748b', marginTop: 6 }}>{String(document.type || document.mime_type || 'Document')}</div>
          </div>
        )) : <div style={{ color: '#64748b' }}>Nog geen documenten toegevoegd.</div>}
      </div>
    </div>
  );
}

export function Project360Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = currentTabFromPath(location.pathname);
  const [selectedWeld, setSelectedWeld] = useState<Weld | null>(null);
  const [search, setSearch] = useState('');
  const [uploadingScope, setUploadingScope] = useState<'wps' | 'materials' | null>(null);
  const user = useAuthStore((state) => state.user);

  const projectQuery = useProject(projectId);
  const assembliesQuery = useProjectAssemblies(projectId, { page: 1, limit: 25 });
  const weldsQuery = useProjectWelds(projectId, { page: 1, limit: 200 });
  const inspectionsQuery = useProjectInspections(projectId, { page: 1, limit: 200 });
  const selectedInspectionQuery = useWeldInspection(projectId, selectedWeld?.id);
  const saveInspection = useUpsertWeldInspection(String(projectId || ''), String(selectedWeld?.id || ''));
  const updateWeld = useUpdateWeld(String(projectId || ''));
  const patchWeldStatus = usePatchWeldStatus(String(projectId || ''));
  const documentsQuery = useProjectDocuments(String(projectId || ''), { page: 1, limit: 200 });
  const createDocument = useCreateProjectDocument(String(projectId || ''));
  const wpsQuery = useWps();
  const weldersQuery = useWelders();
  const templatesQuery = useInspectionTemplates();

  const project = projectQuery.data as Project | undefined;
  const assemblies = (assembliesQuery.data?.items || []) as Assembly[];
  const welds = (weldsQuery.data?.items || []) as Weld[];
  const inspections = (inspectionsQuery.data?.items || []) as AuditEntry[];
  const selectedInspection = selectedInspectionQuery.data as Inspection | null;
  const documents = (documentsQuery.data?.items || []) as CeDocument[];

  const searchText = search.trim().toLowerCase();
  const visibleAssemblies = useMemo(() => assemblies.filter((a) => matchesSearch(a, searchText)), [assemblies, searchText]);
  const visibleWelds = useMemo(() => welds.filter((w) => matchesSearch(w, searchText)), [welds, searchText]);
  const visibleHistory = useMemo(() => inspections.filter((i) => matchesSearch(i, searchText)), [inspections, searchText]);
  const visibleWpsDocuments = useMemo(() => documents.filter((item) => matchesSearch(item, 'wps') || matchesSearch(item.tags || [], 'wps') || matchesSearch(item.notes || '', 'wps')), [documents]);
  const visibleMaterialDocuments = useMemo(() => documents.filter((item) => matchesSearch(item, 'materiaal') || matchesSearch(item, 'material') || matchesSearch(item.tags || [], 'materiaal') || matchesSearch(item.notes || '', 'materiaal')), [documents]);

  const filters = (
    <input
      placeholder="Zoek op projectnaam, projectnummer, opdrachtgever, assembly of las"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}
    />
  );

  const assemblyOptions = assemblies.map((assembly) => ({ value: String(assembly.id), label: String(assembly.code || assembly.name || assembly.id) }));
  const wpsOptions = (wpsQuery.data?.items || []).map((item) => ({ value: String(item.id || item.code || ''), label: String(item.code || item.title || item.id || '') }));
  const welderOptions = (weldersQuery.data?.items || []).map((item) => ({ value: String(item.id || item.code || ''), label: String(item.name || item.code || item.id || '') }));
  const templateRows = (templatesQuery.data?.items || []) as Array<Record<string, unknown>>;
  const templateOptions = templateRows.map((item) => ({ value: String(item.id || item.code || ''), label: String(item.name || item.code || item.id || '') }));
  const inspectionTemplateMap = useMemo(
    () => Object.fromEntries(templateRows.map((item) => [String(item.id || item.code || ''), parseTemplateItems(item)])),
    [templateRows],
  );
  const templateMetaMap = useMemo(
    () => Object.fromEntries(templateRows.map((item) => [String(item.id || item.code || ''), { exc_class: String(item.exc_class || item.execution_class || ''), name: String(item.name || item.code || '') }])),
    [templateRows],
  );

  async function uploadScopedDocument(scope: 'wps' | 'materials', file: File) {
    if (!projectId) return;
    setUploadingScope(scope);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('type', scope === 'wps' ? 'WPS document' : 'Materiaaldocument');
      formData.append('notes', scope === 'wps' ? 'wps' : 'materiaal');
      formData.append('tags', JSON.stringify([scope === 'wps' ? 'wps' : 'materiaal']));
      await createDocument.mutateAsync(formData);
      await documentsQuery.refetch();
    } finally {
      setUploadingScope(null);
    }
  }

  const kpis = [
    <ProjectKpiActionCard
      key="assemblies"
      label="Assemblies"
      value={assemblies.length}
      meta="Klik om naar assemblies te gaan"
      onClick={() => navigate(`/projecten/${projectId}/assemblies`)}
      testId="project-kpi-assemblies"
    />,
    <ProjectKpiActionCard
      key="lassen"
      label="Lassen"
      value={welds.length}
      meta="Klik om lassen en lascontrole te openen"
      onClick={() => navigate(`/projecten/${projectId}/lassen`)}
      testId="project-kpi-welds"
    />,
    <ProjectKpiActionCard
      key="documenten"
      label="Documenten"
      value={documents.length}
      meta="Klik om documentbeheer te openen"
      onClick={() => navigate(`/projecten/${projectId}/documenten`)}
      testId="project-kpi-documents"
    />,
    <ProjectKpiActionCard
      key="historie"
      label="Historie"
      value={inspections.length}
      meta="Klik om projecthistorie te openen"
      onClick={() => navigate(`/projecten/${projectId}/historie`)}
      testId="project-kpi-history"
    />,
  ];

  const content = useMemo(() => {
    if (projectQuery.isLoading) return <div>Project laden...</div>;
    if (!projectId || projectQuery.isError || !project) {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Project 360</h3>
          <p style={{ marginTop: 16, color: '#64748b' }}>Het projectdetail kon niet worden geladen vanuit de backend.</p>
        </section>
      );
    }

    if (currentTab === 'assemblies') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Assemblies</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleAssemblies.length ? visibleAssemblies.map((assembly) => (
              <div key={String(assembly.id)} style={surfaceStyle()}>
                <strong>{assembly.code || assembly.name || `Assembly ${assembly.id}`}</strong>
                <div style={{ marginTop: 8, color: '#64748b' }}>{String(assembly.status || 'Onbekend')}</div>
              </div>
            )) : <div style={{ color: '#64748b' }}>Nog geen assemblies beschikbaar voor dit project.</div>}
          </div>
        </section>
      );
    }

    if (currentTab === 'lassen') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Lassen</h3>
          <div style={{ marginTop: 8, color: '#64748b' }}>Lascontrole is geïntegreerd in Lassen. Dubbelklik of gebruik Wijzigen om de popup te openen.</div>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleWelds.length ? visibleWelds.map((weld) => {
              const weldStatus = normalizeStatus(weld.status);
              return (
                <div key={String(weld.id)} style={surfaceStyle()} onDoubleClick={() => setSelectedWeld(weld)}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(4, auto)', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{weld.weld_number || weld.weld_no || `Las ${weld.id}`}</strong>
                      <div style={{ marginTop: 8, color: '#64748b' }}>
                        {String(weld.location || 'Locatie onbekend')} · {String(weld.welder_name || 'Geen lasser')} · {String(weld.execution_class || 'Geen EXC')}
                      </div>
                    </div>
                    <button type="button" style={actionButtonStyle('blue')} onClick={() => setSelectedWeld(weld)}>Wijzigen</button>
                    <button type="button" style={actionButtonStyle('conform', weldStatus === 'conform')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'conform' })}>Conform</button>
                    <button type="button" style={actionButtonStyle('defect', weldStatus === 'defect')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'defect' })}>Defect</button>
                    <button type="button" style={actionButtonStyle('gerepareerd', weldStatus === 'gerepareerd')} onClick={() => void patchWeldStatus.mutateAsync({ weldId: weld.id, status: 'gerepareerd' })}>Gerepareerd</button>
                  </div>
                  <div style={{ marginTop: 12, color: '#64748b' }}>Huidige status: {statusLabel(weldStatus)}</div>
                </div>
              );
            }) : <div style={{ color: '#64748b' }}>Nog geen lassen beschikbaar voor dit project.</div>}
          </div>
        </section>
      );
    }

    if (currentTab === 'documenten') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Documenten</h3>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <DocumentUploadCard
              title="WPS document"
              description="Voeg hier WPS-documenten toe. De upload loopt via het bestaande projectdocument-contract."
              tone="wps"
              uploading={uploadingScope === 'wps'}
              documents={visibleWpsDocuments}
              onUpload={async (file) => await uploadScopedDocument('wps', file)}
            />
            <DocumentUploadCard
              title="Materiaaldocumenten"
              description="Voeg hier materiaaldocumenten toe, zoals certificaten en productsheets."
              tone="materials"
              uploading={uploadingScope === 'materials'}
              documents={visibleMaterialDocuments}
              onUpload={async (file) => await uploadScopedDocument('materials', file)}
            />
          </div>
        </section>
      );
    }

    if (currentTab === 'historie') {
      return (
        <section style={surfaceStyle()}>
          <h3 style={{ margin: 0 }}>Historie</h3>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {visibleHistory.length ? visibleHistory.map((entry) => (
              <div key={String(entry.id)} style={surfaceStyle()}>
                <strong>{String(entry.action || entry.title || 'Historie-item')}</strong>
                <div style={{ marginTop: 8, color: '#64748b' }}>{String(entry.created_at || '')}</div>
              </div>
            )) : <div style={{ color: '#64748b' }}>Nog geen historie beschikbaar vanuit de backend.</div>}
          </div>
        </section>
      );
    }

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={surfaceStyle()}>
          <h2 style={{ margin: 0 }}>{titleFromProject(project)}</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Project 360 gebruikt op alle tabs dezelfde routingshell, projectkop, klikbare KPI’s en vaste hoofdacties.</p>
        </section>
      </div>
    );
  }, [projectQuery.isLoading, projectId, projectQuery.isError, project, currentTab, visibleAssemblies, visibleWelds, visibleHistory, navigate, patchWeldStatus, assemblies.length, welds.length, inspections.length, documents.length, visibleWpsDocuments, visibleMaterialDocuments, uploadingScope]);

  return (
    <>
      <ProjectTabShell
        projectId={String(projectId || '')}
        currentTab={currentTab}
        onBack={() => navigate('/projecten')}
        onCreateProject={() => navigate('/projecten', { state: { intent: 'create-project' } })}
        onEditProject={() => navigate('/projecten', { state: { intent: 'edit-project', projectId } })}
        onCreateAssembly={() => navigate(`/projecten/${projectId}/assemblies`)}
        onCreateWeld={() => navigate(`/projecten/${projectId}/lassen`)}
        exportSelectionLabel="Lasrapport"
        exportSelectionDisabled={!projectId}
        onExportSelectionPdf={() => navigate(`/projecten/${projectId}/ce-dossier`)}
        filters={filters}
        kpis={kpis}
      >
        {content}
      </ProjectTabShell>

      <WeldInspectionModal
        open={Boolean(selectedWeld)}
        weld={selectedWeld}
        inspection={selectedInspection}
        savingWeld={updateWeld.isPending}
        savingInspection={saveInspection.isPending}
        assemblyOptions={assemblyOptions}
        wpsOptions={wpsOptions}
        welderOptions={welderOptions}
        templateOptions={templateOptions}
        inspectionTemplateMap={inspectionTemplateMap}
        templateMetaMap={templateMetaMap}
        projectName={String(project?.name || project?.omschrijving || '')}
        projectNumber={String(project?.projectnummer || project?.code || '')}
        onClose={() => setSelectedWeld(null)}
        onQuickStatus={async (status) => {
          if (!selectedWeld) return;
          await patchWeldStatus.mutateAsync({ weldId: selectedWeld.id, status });
          await selectedInspectionQuery.refetch();
          await weldsQuery.refetch();
        }}
        onSaveWeld={async (payload: WeldFormValues) => {
          if (!selectedWeld) return;
          await updateWeld.mutateAsync({ weldId: selectedWeld.id, payload });
          await weldsQuery.refetch();
        }}
        onSaveInspection={async (payload) => {
          if (!selectedWeld) return;
          await saveInspection.mutateAsync({
            inspector: user?.email || undefined,
            overall_status: payload.overall_status,
            template_id: payload.template_id,
            remarks: payload.remarks,
            checks: payload.checks,
          });
          await selectedInspectionQuery.refetch();
          await weldsQuery.refetch();
          setSelectedWeld(null);
        }}
      />
    </>
  );
}

export default Project360Page;
