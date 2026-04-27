import { FileText, Image as ImageIcon, Layers3, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { asText } from '@/features/ce-dossier/components/CeDossierBlocks';

function itemTitle(item: Record<string, unknown>, fallback: string) {
  return asText(
    item.title || item.name || item.code || item.weld_number || item.weld_no || item.filename || item.uploaded_filename || item.method,
    fallback,
  );
}

export function CePdfLayoutCard({
  project,
  status,
  score,
  counts,
  checklist,
  missingItems,
  assemblies,
  welds,
  inspections,
  documents,
  photos,
  onPrint,
}: {
  project: Record<string, unknown>;
  status: string;
  score: number;
  counts: Record<string, unknown>;
  checklist: Record<string, unknown>[];
  missingItems: Record<string, unknown>[];
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  onPrint: () => void;
}) {
  const projectName = asText(project.name || project.omschrijving || project.projectnummer, 'Onbekend project');
  const clientName = asText(project.client_name || project.opdrachtgever, 'Geen opdrachtgever');
  const executionClass = asText(project.execution_class || project.executieklasse, 'Niet opgegeven');
  const generatedAt = new Date().toLocaleString('nl-NL');
  const readyCount = checklist.filter((item) => Boolean(item.ok) || Boolean(item.completed)).length;

  return (
    <Card>
      <div className="section-title-row">
        <h3><FileText size={18} /> PDF dossier-layout</h3>
        <div className="toolbar-cluster" style={{ justifyContent: 'flex-end' }}>
          <Badge tone="neutral">Blok D</Badge>
          <Button variant="secondary" onClick={onPrint}><Printer size={16} /> Print / PDF</Button>
        </div>
      </div>

      <div className="list-subtle" style={{ marginBottom: 16 }}>
        Definitieve dossieropbouw voor print en PDF: voorblad, projectmeta, checklist, assemblies, lassen, inspecties, documenten en fotobijlagen.
      </div>

      <div className="card-grid cols-2">
        <Card>
          <div className="metric-card" style={{ alignItems: 'flex-start' }}>
            <span>Voorblad</span>
            <strong>{projectName}</strong>
            <div className="list-subtle">{clientName} · EXC {executionClass}</div>
            <div className="list-subtle">Gegenereerd: {generatedAt}</div>
            <div className="list-subtle">Dossierstatus: {status} · Score: {score}%</div>
          </div>
        </Card>
        <Card>
          <div className="metric-card" style={{ alignItems: 'flex-start' }}>
            <span>Opbouw</span>
            <strong>{readyCount}/{checklist.length || 0} checklistregels gereed</strong>
            <div className="list-subtle">Open acties: {missingItems.length}</div>
            <div className="list-subtle">Assemblies: {Number(counts.assemblies || assemblies.length || 0)}</div>
            <div className="list-subtle">Lassen: {Number(counts.welds || welds.length || 0)}</div>
          </div>
        </Card>
      </div>

      <div className="list-stack compact-list" style={{ marginTop: 16 }}>
        {[
          ['01', 'Voorblad & projectgegevens', `${projectName} · ${clientName}`],
          ['02', 'CE status & checklist', `${readyCount}/${checklist.length || 0} gereed · ${missingItems.length} open acties`],
          ['03', 'Assemblies & lassen', `${assemblies.length} assemblies · ${welds.length} lassen`],
          ['04', 'Inspecties & resultaten', `${inspections.length} inspecties`],
          ['05', 'Documenten & bijlagen', `${documents.length} documenten · ${photos.length} foto’s`],
        ].map(([index, title, detail]) => (
          <div key={index} className="list-row">
            <div>
              <strong>{index}. {title}</strong>
              <div className="list-subtle">{detail}</div>
            </div>
            <Badge tone="success">Opgenomen</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CeDossierContentsCard({
  assemblies,
  welds,
  inspections,
  documents,
  photos,
}: {
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  photos: Record<string, unknown>[];
}) {
  const sections = [
    { key: 'assemblies', icon: <Layers3 size={16} />, title: 'Assemblies', items: assemblies },
    { key: 'welds', icon: <Layers3 size={16} />, title: 'Lassen', items: welds },
    { key: 'inspections', icon: <FileText size={16} />, title: 'Inspecties', items: inspections },
    { key: 'documents', icon: <FileText size={16} />, title: 'Documenten', items: documents },
    { key: 'photos', icon: <ImageIcon size={16} />, title: 'Fotobijlagen', items: photos },
  ];

  return (
    <Card>
      <div className="section-title-row">
        <h3><Layers3 size={18} /> PDF inhoudsoverzicht</h3>
        <Badge tone="neutral">Printvolgorde</Badge>
      </div>
      <div className="card-grid cols-2">
        {sections.map((section) => (
          <Card key={section.key}>
            <div className="section-title-row" style={{ marginBottom: 8 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{section.icon} {section.title}</h4>
              <Badge tone={section.items.length ? 'success' : 'warning'}>{section.items.length}</Badge>
            </div>
            {section.items.length ? (
              <div className="list-stack compact-list">
                {section.items.slice(0, 4).map((item, index) => (
                  <div key={String(item.id || `${section.key}-${index}`)} className="list-row">
                    <div>
                      <strong>{itemTitle(item, `${section.title} ${index + 1}`)}</strong>
                      <div className="list-subtle">{asText(item.status || item.result || item.location || item.type, '')}</div>
                    </div>
                    <Badge tone="neutral">#{index + 1}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={`Geen ${section.title.toLowerCase()}`} description="Dit onderdeel blijft zichtbaar in de dossierlayout maar bevat nu nog geen records." />
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
}
