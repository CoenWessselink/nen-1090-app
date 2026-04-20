/**
 * CeItemActionModal — D-01 fix.
 * Contextgevoelige popup per CE-regeltype met directe wijzigactie.
 *
 * Gebruik in CeDossierPage als vervanging van de bestaande modal:
 *
 *   import { CeItemActionModal } from '@/features/ce-dossier/components/CeItemActionModal';
 *
 *   <CeItemActionModal
 *     open={Boolean(selectedCeItem)}
 *     item={selectedCeItem}
 *     section={selectedCeSection}
 *     project={project}
 *     projectId={projectId}
 *     updateProject={updateProject}
 *     onClose={() => setSelectedCeItem(null)}
 *     onNavigate={openSection}
 *   />
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/overlays/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { ProjectForm } from '@/features/projecten/components/ProjectForm';

interface CeItem {
  label?: string;
  name?: string;
  key?: string;
  reason?: string;
  severity?: string;
  weld_id?: string;
}

interface CeItemActionModalProps {
  open: boolean;
  item: CeItem | null;
  section: string;
  project: Record<string, unknown> | null;
  projectId: string | undefined;
  updateProject: {
    isPending: boolean;
    mutateAsync: (values: { id: unknown; payload: unknown }) => Promise<unknown>;
  };
  onClose: () => void;
  onNavigate: (section: string) => void;
  onRefresh?: () => void;
}

// Mapping van CE-regelkey naar directe actie-beschrijving
const SECTION_ACTIONS: Record<string, { label: string; description: string; cta: string }> = {
  'project':      { label: 'Projectgegevens',    description: 'Vul de ontbrekende projectgegevens in.',          cta: 'Projectgegevens bijwerken' },
  'welds':        { label: 'Lassen',              description: 'Voeg lassen toe of herstel de lasgegevens.',       cta: 'Naar lassen gaan' },
  'inspections':  { label: 'Inspecties',          description: 'Voer de ontbrekende inspecties uit.',              cta: 'Naar inspecties gaan' },
  'documents':    { label: 'Documenten',          description: 'Upload de vereiste documenten of certificaten.',   cta: 'Naar documenten gaan' },
  'assemblies':   { label: 'Assemblies',          description: 'Voeg assemblies toe aan het project.',             cta: 'Naar assemblies gaan' },
  'checklist':    { label: 'Checklist',           description: 'Herstel de openstaande checklist-items.',          cta: 'Naar checklist gaan' },
  'materials':    { label: 'Materialen',          description: 'Koppel materiaalcertificaten aan het project.',    cta: 'Naar materialen gaan' },
  'welders':      { label: 'Lassers',             description: 'Koppel gecertificeerde lassers aan het project.',  cta: 'Naar lassers gaan' },
  'wps':          { label: 'WPS',                 description: 'Koppel een geldige WPS aan het project.',          cta: 'Naar WPS gaan' },
  'ndt':          { label: 'NDT',                 description: 'Voeg NDT-resultaten toe aan het project.',         cta: 'Naar NDT gaan' },
};

// Bepaal section op basis van CE-regelkey
function sectionFromKey(key: string | undefined): string {
  if (!key) return 'checklist';
  if (key.startsWith('weld-')) return 'welds';
  if (key.includes('inspection')) return 'inspections';
  if (key.includes('material')) return 'materials';
  if (key.includes('welder')) return 'welders';
  if (key.includes('wps') || key.includes('wpqr')) return 'wps';
  if (key.includes('ndt')) return 'ndt';
  if (key.includes('project')) return 'project';
  if (key.includes('document')) return 'documents';
  return 'checklist';
}

export function CeItemActionModal({
  open,
  item,
  section,
  project,
  projectId,
  updateProject,
  onClose,
  onNavigate,
  onRefresh,
}: CeItemActionModalProps) {
  const navigate = useNavigate();
  const [projectSaveSuccess, setProjectSaveSuccess] = useState(false);

  if (!item) return null;

  const title = String(item.label || item.name || 'CE actie');
  const detail = String(item.reason || '');
  const resolvedSection = section || sectionFromKey(item.key);
  const actionInfo = SECTION_ACTIONS[resolvedSection] || SECTION_ACTIONS['checklist'];

  const handleProjectSubmit = async (values: unknown) => {
    if (!project) return;
    await updateProject.mutateAsync({ id: (project as any).id, payload: values });
    setProjectSaveSuccess(true);
    onRefresh?.();
    setTimeout(() => {
      setProjectSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const handleNavigate = (targetSection: string) => {
    onClose();
    onNavigate(targetSection);
  };

  const handleDirectNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="large">
      <div className="detail-stack">
        {/* Context info */}
        <InlineMessage tone="neutral">
          {detail || `Open deze CE-regel om de gekoppelde bron direct te herstellen.`}
        </InlineMessage>

        {/* Status overzicht */}
        <Card>
          <div className="section-title-row">
            <h3>Huidige status</h3>
            <Button variant="secondary" onClick={() => handleNavigate(resolvedSection)}>
              <ExternalLink size={14} style={{ marginRight: 4 }} />
              Open volledige pagina
            </Button>
          </div>
          <div className="list-stack compact-list">
            <div className="list-row">
              <div><strong>Doel</strong><div className="list-subtle">{title}</div></div>
            </div>
            <div className="list-row">
              <div><strong>Waarom vereist</strong><div className="list-subtle">{detail || 'Vereist voor CE-dossier completeness.'}</div></div>
            </div>
            <div className="list-row">
              <div><strong>Gekoppelde sectie</strong><div className="list-subtle">{actionInfo.label}</div></div>
            </div>
            {item.severity && (
              <div className="list-row">
                <div><strong>Ernst</strong><div className="list-subtle">{item.severity}</div></div>
              </div>
            )}
          </div>
        </Card>

        {/* Directe wijzigactie per regeltype */}

        {/* Project-sectie: inline ProjectForm */}
        {resolvedSection === 'project' && project ? (
          <Card>
            <div className="section-title-row">
              <h3>Projectgegevens bijwerken</h3>
            </div>
            {projectSaveSuccess ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px',
                            background: 'var(--color-background-success)', borderRadius: 'var(--border-radius-md)',
                            color: 'var(--color-text-success)', fontSize: 13, fontWeight: 500 }}>
                <CheckCircle2 size={16} /> Projectgegevens opgeslagen. CE-status wordt herberekend.
              </div>
            ) : (
              <ProjectForm
                initial={project as never}
                onSubmit={handleProjectSubmit}
                isSubmitting={updateProject.isPending}
                submitLabel="Project bijwerken"
              />
            )}
          </Card>
        ) : null}

        {/* Las-sectie: knop naar specifieke las als weld_id beschikbaar */}
        {resolvedSection === 'welds' && (
          <Card>
            <div className="section-title-row">
              <h3>Directe acties voor lassen</h3>
            </div>
            <div className="toolbar-cluster" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {item.weld_id ? (
                <Button onClick={() => handleDirectNavigate(`/projecten/${projectId}/lassen/${item.weld_id}/inspectie`)}>
                  <ArrowRight size={14} style={{ marginRight: 4 }} />
                  Open cette las
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => handleNavigate('welds')}>
                Alle lassen bekijken
              </Button>
              <Button variant="secondary"
                onClick={() => handleDirectNavigate(`/projecten/${projectId}/lassen/nieuw`)}>
                Nieuwe las toevoegen
              </Button>
            </div>
          </Card>
        )}

        {/* Inspecties: knop naar inspectiepagina */}
        {resolvedSection === 'inspections' && (
          <Card>
            <div className="section-title-row">
              <h3>Directe acties voor inspecties</h3>
            </div>
            <div className="toolbar-cluster" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {item.weld_id ? (
                <Button onClick={() => handleDirectNavigate(`/projecten/${projectId}/lassen/${item.weld_id}/inspectie`)}>
                  <ArrowRight size={14} style={{ marginRight: 4 }} />
                  Open inspectie voor deze las
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => handleNavigate('inspections')}>
                Alle inspecties bekijken
              </Button>
            </div>
          </Card>
        )}

        {/* Documenten, materialen, lassers, WPS, NDT: directe navigatie */}
        {['documents', 'materials', 'welders', 'wps', 'ndt', 'assemblies', 'checklist'].includes(resolvedSection) && (
          <Card>
            <div className="section-title-row">
              <h3>Directe acties</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              {actionInfo.description}
            </p>
            <div className="toolbar-cluster" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <Button onClick={() => handleNavigate(resolvedSection)}>
                <ArrowRight size={14} style={{ marginRight: 4 }} />
                {actionInfo.cta}
              </Button>
              <Button variant="secondary"
                onClick={() => handleDirectNavigate(`/projecten/${projectId}/overzicht`)}>
                Terug naar Project 360
              </Button>
              <Button variant="secondary"
                onClick={() => handleDirectNavigate(`/projecten/${projectId}/lassen`)}>
                Naar lassen
              </Button>
              <Button variant="secondary"
                onClick={() => handleDirectNavigate(`/projecten/${projectId}/documenten`)}>
                Naar documenten
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}
