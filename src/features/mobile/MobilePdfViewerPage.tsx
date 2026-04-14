import { useEffect, useMemo, useState } from 'react';
import { Square, Video } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getDocument } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { documentPreviewUrl, formatValue } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

export function MobilePdfViewerPage() {
  const { projectId = '', documentId = '' } = useParams();
  const [document, setDocument] = useState<CeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDocument() {
    setLoading(true);
    try {
      const result = await getDocument(documentId);
      setDocument(result || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocument();
  }, [documentId]);

  const src = useMemo(() => documentPreviewUrl(projectId, document), [document, projectId]);

  return (
    <MobilePageScaffold title={formatValue(document?.filename || document?.uploaded_filename || document?.title, 'PDF Viewer')} backTo={`/projecten/${projectId}/documenten`} testId="mobile-pdf-page">
      {loading ? <div className="mobile-state-card" data-testid="mobile-pdf-loading">PDF laden…</div> : null}
      {error ? (
        <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-pdf-error">
          <strong>PDF niet beschikbaar</strong>
          <span>{error}</span>
          <button type="button" className="mobile-secondary-button" onClick={() => void loadDocument()}>
            Opnieuw proberen
          </button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="mobile-pdf-viewer-card" data-testid="mobile-pdf-viewer-card">
          <div className="mobile-pdf-toolbar">
            <div className="mobile-pdf-toolbar-left"><Video size={16} /><span>1 / 7</span></div>
            <div className="mobile-pdf-toolbar-right"><Square size={16} /><Square size={16} /></div>
          </div>
          {src ? <iframe className="mobile-pdf-frame" src={src} title="PDF preview" /> : <div className="mobile-state-card">Geen preview beschikbaar.</div>}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
