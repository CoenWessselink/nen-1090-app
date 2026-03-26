import { Download, Eye, FileArchive, FileSpreadsheet, FileText, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatDate } from '@/utils/format';
import type { ExportJob } from '@/types/domain';

export type CeExportKind = 'ce' | 'zip' | 'pdf' | 'excel';

function tone(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['vrijgegeven', 'conform', 'gereed', 'goedgekeurd', 'approved', 'resolved', 'ok', 'completed', 'done', 'downloaded'].includes(value)) return 'success' as const;
  if (['afgekeurd', 'open', 'blokkerend', 'rejected', 'nok', 'failed', 'error'].includes(value)) return 'danger' as const;
  return 'warning' as const;
}

function exportLabel(kind: string) {
  if (kind === 'ce') return 'CE rapport';
  if (kind === 'pdf') return 'PDF';
  if (kind === 'zip') return 'ZIP';
  if (kind === 'excel') return 'Excel';
  return kind ? kind.toUpperCase() : 'Export';
}

function itemKind(item: ExportJob) {
  return String(item.type || item.export_type || item.bundle_type || 'export').toLowerCase();
}

export function normalizeExportItems(payload: unknown): ExportJob[] {
  if (Array.isArray(payload)) return payload as ExportJob[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  const items = source.items || source.data || source.results || source.exports;
  return Array.isArray(items) ? (items as ExportJob[]) : [];
}

export function CeExportActionsCard({
  pending,
  onExport,
  preview,
}: {
  pending?: Partial<Record<CeExportKind, boolean>>;
  onExport: (kind: CeExportKind) => void;
  preview: Array<{ label: string; value: string | number }>;
}) {
  return (
    <Card>
      <div className="section-title-row">
        <h3><Download size={18} /> Exportacties</h3>
        <Badge tone="neutral">Blok C</Badge>
      </div>
      <div className="list-subtle" style={{ marginBottom: 16 }}>
        Start hier een CE-rapport, PDF-, ZIP- of Excel-export. Bij live API-ondersteuning wordt de serverexport gebruikt; anders blijft de export zichtbaar als voorbereide lokale set in de historie.
      </div>
      <div className="stack-actions" style={{ marginBottom: 16 }}>
        <Button onClick={() => onExport('ce')} disabled={pending?.ce}><Download size={16} /> {pending?.ce ? 'Bezig...' : 'CE rapport'}</Button>
        <Button variant="secondary" onClick={() => onExport('pdf')} disabled={pending?.pdf}><FileText size={16} /> {pending?.pdf ? 'Bezig...' : 'PDF export'}</Button>
        <Button variant="secondary" onClick={() => onExport('zip')} disabled={pending?.zip}><FileArchive size={16} /> {pending?.zip ? 'Bezig...' : 'ZIP export'}</Button>
        <Button variant="secondary" onClick={() => onExport('excel')} disabled={pending?.excel}><FileSpreadsheet size={16} /> {pending?.excel ? 'Bezig...' : 'Excel export'}</Button>
      </div>
      <div className="list-stack compact-list">
        {preview.map((item) => (
          <div key={item.label} className="list-row">
            <div>
              <strong>{item.label}</strong>
            </div>
            <Badge tone="neutral">{String(item.value)}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CeExportHistoryCard({
  items,
  selectedExportId,
  onSelect,
  onDownload,
  onRetry,
  downloadingId,
  retryingId,
}: {
  items: ExportJob[];
  selectedExportId?: string | number | null;
  onSelect: (item: ExportJob) => void;
  onDownload: (item: ExportJob) => void;
  onRetry: (item: ExportJob) => void;
  downloadingId?: string | number | null;
  retryingId?: string | number | null;
}) {
  return (
    <Card>
      <div className="section-title-row">
        <h3><RefreshCcw size={18} /> Exporthistorie</h3>
        <Badge tone="neutral">{items.length} records</Badge>
      </div>
      {!items.length ? (
        <EmptyState title="Nog geen exports" description="Start een export om historie en downloadflow op te bouwen." />
      ) : (
        <div className="list-stack compact-list">
          {items.map((item, index) => {
            const kind = itemKind(item);
            const rowId = String(item.id || `local-${index}`);
            return (
              <div key={rowId} className="list-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <strong>{exportLabel(kind)}</strong>
                  <div className="list-subtle">{formatDate(String(item.created_at || '')) || 'Onbekende datum'}</div>
                  <div className="list-subtle">{String(item.message || item.error_detail || item.error_code || rowId)}</div>
                </div>
                <div className="toolbar-cluster" style={{ justifyContent: 'flex-end' }}>
                  <Badge tone={tone(String(item.status || 'aangemaakt'))}>{String(item.status || 'Aangemaakt')}</Badge>
                  <Button variant="ghost" onClick={() => onSelect(item)}><Eye size={16} /> {String(selectedExportId) === rowId ? 'Actief' : 'Manifest'}</Button>
                  <Button variant="secondary" onClick={() => onDownload(item)} disabled={String(downloadingId) === rowId}><Download size={16} /> {String(downloadingId) === rowId ? 'Bezig...' : 'Download'}</Button>
                  <Button variant="secondary" onClick={() => onRetry(item)} disabled={String(retryingId) === rowId}><RefreshCcw size={16} /> {String(retryingId) === rowId ? 'Bezig...' : 'Opnieuw'}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function CeExportManifestCard({
  manifest,
  exportItem,
}: {
  manifest: Array<Record<string, unknown>>;
  exportItem?: ExportJob | null;
}) {
  return (
    <Card>
      <div className="section-title-row">
        <h3><Eye size={18} /> Exportmanifest</h3>
        <Badge tone="neutral">{exportItem ? String(exportItem.type || exportItem.export_type || exportItem.id) : 'Selecteer export'}</Badge>
      </div>
      {!exportItem ? (
        <EmptyState title="Nog geen export gekozen" description="Selecteer een export uit de historie om de inhoud en dekking te bekijken." />
      ) : (
        <div className="list-stack compact-list">
          {manifest.map((entry, index) => (
            <div key={String(entry.section || index)} className="list-row">
              <div>
                <strong>{String(entry.section || `Onderdeel ${index + 1}`)}</strong>
                <div className="list-subtle">{Boolean(entry.included) ? 'Opgenomen in export' : 'Niet opgenomen in export'}</div>
              </div>
              <Badge tone={Boolean(entry.included) ? 'success' : 'warning'}>{String(entry.count || (Boolean(entry.included) ? 'Ja' : 'Nee'))}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
