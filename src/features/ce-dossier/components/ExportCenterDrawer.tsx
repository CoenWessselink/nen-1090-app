import { Download, FileArchive, FileSpreadsheet, FileText } from 'lucide-react';
import { Drawer } from '@/components/overlays/Drawer';
import { Button } from '@/components/ui/Button';

type ExportKind = 'ce' | 'zip' | 'pdf' | 'excel';

export function ExportCenterDrawer({
  open,
  onClose,
  onExport,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (kind: ExportKind) => void;
  pending?: Partial<Record<ExportKind, boolean>>;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="Exportcentrum">
      <div className="detail-stack">
        <div className="content-panel">
          <h4>Beschikbare exports</h4>
          <p>Gebruikt de canonieke compliance-exportflow voor viewer, download en bijlagen. PDF en download lopen via dezelfde backendroute zodat auth en bestandsnamen consistent blijven.</p>
        </div>
        <div className="stack-actions">
          <Button variant="secondary" onClick={() => onExport('excel')} disabled={pending?.excel}><FileSpreadsheet size={16} /> Excel export</Button>
          <Button variant="secondary" onClick={() => onExport('pdf')} disabled={pending?.pdf}><FileText size={16} /> PDF export</Button>
          <Button variant="secondary" onClick={() => onExport('zip')} disabled={pending?.zip}><FileArchive size={16} /> ZIP export</Button>
          <Button onClick={() => onExport('ce')} disabled={pending?.ce}><Download size={16} /> CE rapport</Button>
        </div>
      </div>
    </Drawer>
  );
}
