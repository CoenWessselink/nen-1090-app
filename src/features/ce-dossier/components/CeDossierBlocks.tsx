import { CheckCircle2, FileStack, HardHat, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { InlineMessage } from '@/components/feedback/InlineMessage';

export function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function asText(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function statusTone(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (['gereed', 'approved', 'goedgekeurd', 'conform', 'vrijgegeven'].includes(normalized)) return 'success' as const;
  if (['niet gestart', 'open', 'blokkerend', 'afgekeurd', 'niet conform'].includes(normalized)) return 'warning' as const;
  return 'neutral' as const;
}

function itemTone(item: Record<string, unknown>) {
  if (Boolean(item.ok) || Boolean(item.completed)) return 'success' as const;
  return 'warning' as const;
}

function clickableRow(onClick?: () => void): React.CSSProperties | undefined {
  if (!onClick) return undefined;
  return { cursor: 'pointer' };
}

function openActionLabel(actionLabel?: string) {
  return actionLabel || 'Openen';
}

export function CeStatusPanel({
  project,
  status,
  score,
  readyForExport,
  source,
  missingCount,
  onOpenScore,
  onOpenMissing,
  onOpenStatus,
  onOpenSource,
}: {
  project: Record<string, unknown>;
  status: string;
  score: number;
  readyForExport: boolean;
  source: string;
  missingCount: number;
  onOpenScore?: () => void;
  onOpenMissing?: () => void;
  onOpenStatus?: () => void;
  onOpenSource?: () => void;
}) {
  const projectName = asText(project.name || project.omschrijving || project.projectnummer, 'Onbekend project');
  const clientName = asText(project.client_name || project.opdrachtgever, 'Geen opdrachtgever');
  const executionClass = asText(project.execution_class || project.executieklasse, 'Niet opgegeven');

  const metricItems = [
    { label: 'Score', value: `${score}%`, onClick: onOpenScore },
    { label: 'Open acties', value: String(missingCount), onClick: onOpenMissing },
    { label: 'Status', value: status, onClick: onOpenStatus },
    { label: 'Bron', value: source, onClick: onOpenSource },
  ];

  return (
    <Card>
      <div className="section-title-row">
        <h3><ShieldCheck size={18} /> CE dossierstatus</h3>
        <Badge tone={statusTone(status)}>{status}</Badge>
      </div>
      <div className="list-stack compact-list">
        <div className="list-row">
          <div>
            <strong>{projectName}</strong>
            <div className="list-subtle">{clientName} · EXC {executionClass}</div>
          </div>
          <Badge tone={readyForExport ? 'success' : 'warning'}>{readyForExport ? 'Export gereed' : 'Nog niet exportklaar'}</Badge>
        </div>
      </div>
      <div className="card-grid cols-4" style={{ marginTop: 16 }}>
        {metricItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="card"
            onClick={item.onClick}
            style={{ ...(clickableRow(item.onClick) || {}), textAlign: 'left', background: 'transparent', border: 0, padding: 16 }}
          >
            <div className="metric-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.onClick ? <div className="list-subtle">{openActionLabel('Open')}</div> : null}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function CeChecklistCard({
  checklist,
  title = 'Checklist',
  onSelect,
}: {
  checklist: Record<string, unknown>[];
  title?: string;
  onSelect?: (item: Record<string, unknown>) => void;
}) {
  const completed = checklist.filter((item) => Boolean(item.ok) || Boolean(item.completed)).length;

  return (
    <Card>
      <div className="section-title-row">
        <h3><CheckCircle2 size={18} /> {title}</h3>
        <Badge tone={completed === checklist.length && checklist.length > 0 ? 'success' : 'warning'}>
          {completed}/{checklist.length || 0} gereed
        </Badge>
      </div>
      {checklist.length ? (
        <div className="list-stack compact-list">
          {checklist.map((item, index) => (
            <div
              key={String(item.key || item.id || index)}
              className="list-row"
              style={clickableRow(onSelect ? () => onSelect(item) : undefined)}
              onClick={onSelect ? () => onSelect(item) : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item);
                }
              } : undefined}
            >
              <div>
                <strong>{asText(item.label || item.name, `Checklist ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.detail || item.description, '')}</div>
              </div>
              <Badge tone={itemTone(item)}>{Boolean(item.ok) || Boolean(item.completed) ? 'Gereed' : 'Open'}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nog geen checklist" description="Voor dit project zijn nog geen checklistregels opgebouwd." />
      )}
    </Card>
  );
}

export function CeMissingItemsCard({
  missingItems,
  title = 'Ontbrekende onderdelen',
  onSelect,
}: {
  missingItems: Record<string, unknown>[];
  title?: string;
  onSelect?: (item: Record<string, unknown>) => void;
}) {
  return (
    <Card>
      <div className="section-title-row">
        <h3><TriangleAlert size={18} /> {title}</h3>
        <Badge tone={missingItems.length ? 'warning' : 'success'}>{missingItems.length ? `${missingItems.length} open` : 'Compleet'}</Badge>
      </div>
      {missingItems.length ? (
        <div className="list-stack compact-list">
          {missingItems.map((item, index) => (
            <div
              key={String(item.key || item.id || index)}
              className="list-row"
              style={clickableRow(onSelect ? () => onSelect(item) : undefined)}
              onClick={onSelect ? () => onSelect(item) : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item);
                }
              } : undefined}
            >
              <div>
                <strong>{asText(item.label || item.name, `Punt ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.detail || item.reason || item.description, '')}</div>
              </div>
              <Badge tone="warning">Actie nodig</Badge>
            </div>
          ))}
        </div>
      ) : (
        <InlineMessage tone="success">Geen ontbrekende onderdelen gevonden in de huidige CE-opbouw.</InlineMessage>
      )}
    </Card>
  );
}

export function CeDossierStructureCard({
  counts,
  assemblies,
  welds,
  inspections,
  documents,
  photos,
  onSelectSection,
}: {
  counts: Record<string, unknown>;
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  onSelectSection?: (section: string) => void;
}) {
  const sections = [
    { key: 'assemblies', label: 'Assemblies', count: Number(counts.assemblies || assemblies.length || 0) },
    { key: 'welds', label: 'Lassen', count: Number(counts.welds || welds.length || 0) },
    { key: 'inspections', label: 'Inspecties', count: Number(counts.inspections || inspections.length || 0) },
    { key: 'documents', label: 'Documenten', count: Number(counts.documents || documents.length || 0) },
    { key: 'photos', label: 'Foto’s', count: Number(counts.photos || photos.length || 0) },
  ];

  return (
    <Card>
      <div className="section-title-row">
        <h3><FileStack size={18} /> Dossierstructuur</h3>
        <Badge tone="neutral">{sections.reduce((sum, item) => sum + item.count, 0)} records</Badge>
      </div>
      <div className="list-stack compact-list">
        {sections.map((item) => (
          <div
            key={item.key}
            className="list-row"
            style={clickableRow(onSelectSection ? () => onSelectSection(item.key) : undefined)}
            onClick={onSelectSection ? () => onSelectSection(item.key) : undefined}
            role={onSelectSection ? 'button' : undefined}
            tabIndex={onSelectSection ? 0 : undefined}
            onKeyDown={onSelectSection ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectSection(item.key);
              }
            } : undefined}
          >
            <div>
              <strong>{item.label}</strong>
              <div className="list-subtle">{item.count > 0 ? `${item.count} gekoppeld` : 'Nog leeg'}</div>
            </div>
            <Badge tone={item.count > 0 ? 'success' : 'warning'}>{item.count}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CeDataGroupsCard({
  assemblies,
  welds,
  inspections,
  documents,
  onSelectSection,
}: {
  assemblies: Record<string, unknown>[];
  welds: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  onSelectSection?: (section: 'assemblies' | 'welds' | 'inspections' | 'documents') => void;
}) {
  return (
    <Card>
      <div className="section-title-row">
        <h3><HardHat size={18} /> Dossierinhoud</h3>
        <Badge tone="neutral">Live projectdata</Badge>
      </div>
      {assemblies.length || welds.length || inspections.length || documents.length ? (
        <div className="list-stack compact-list">
          {assemblies.slice(0, 3).map((item, index) => (
            <div key={`assembly-${String(item.id || index)}`} className="list-row" style={clickableRow(onSelectSection ? () => onSelectSection('assemblies') : undefined)} onClick={onSelectSection ? () => onSelectSection('assemblies') : undefined}>
              <div>
                <strong>{asText(item.code || item.name, `Assembly ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.status, '')}</div>
              </div>
              <Badge tone="success">Assembly</Badge>
            </div>
          ))}
          {welds.slice(0, 3).map((item, index) => (
            <div key={`weld-${String(item.id || index)}`} className="list-row" style={clickableRow(onSelectSection ? () => onSelectSection('welds') : undefined)} onClick={onSelectSection ? () => onSelectSection('welds') : undefined}>
              <div>
                <strong>{asText(item.weld_number || item.weld_no, `Las ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.location || item.status, '')}</div>
              </div>
              <Badge tone="warning">Las</Badge>
            </div>
          ))}
          {inspections.slice(0, 3).map((item, index) => (
            <div key={`inspection-${String(item.id || index)}`} className="list-row" style={clickableRow(onSelectSection ? () => onSelectSection('inspections') : undefined)} onClick={onSelectSection ? () => onSelectSection('inspections') : undefined}>
              <div>
                <strong>{asText(item.method || item.result, `Inspectie ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.status || item.result, '')}</div>
              </div>
              <Badge tone={String(item.status || item.result).toLowerCase().includes('approved') || String(item.status || item.result).toLowerCase().includes('conform') ? 'success' : 'warning'}>
                Inspectie
              </Badge>
            </div>
          ))}
          {documents.slice(0, 3).map((item, index) => (
            <div key={`document-${String(item.id || index)}`} className="list-row" style={clickableRow(onSelectSection ? () => onSelectSection('documents') : undefined)} onClick={onSelectSection ? () => onSelectSection('documents') : undefined}>
              <div>
                <strong>{asText(item.title || item.filename || item.uploaded_filename, `Document ${index + 1}`)}</strong>
                <div className="list-subtle">{asText(item.type || item.mime_type, '')}</div>
              </div>
              <Badge tone="neutral">Document</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nog geen dossierinhoud" description="Koppel assemblies, lassen, inspecties en documenten om het CE dossier te vullen." />
      )}
    </Card>
  );
}
