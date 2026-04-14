import { useEffect, useMemo, useState } from 'react';
import { Download, Square, Video } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createPdfExport } from '@/api/ce';
import { downloadDocument, getDocument } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { apiProjectPdfUrl, documentPreviewUrl, formatValue } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

export function MobilePdfViewerPage() {
  const { projectId = '', documentId = '' } = useParams();
  const [pdfDocument, setPdfDocument] = useState<CeDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let active = true;
    setLoading(true);
    getDocument(documentId)
      .then((result) => {
        if (!active) return;
        setPdfDocument(result || null);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'PDF kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  const src = useMemo(() => {
    if (documentId) return documentPreviewUrl(projectId, pdfDocument);
    return apiProjectPdfUrl(projectId);
  }, [pdfDocument, documentId, projectId]);

  async function handleDownload() {
    if (documentId) {
      const blob = await downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = String(pdfDocument?.filename || pdfDocument?.uploaded_filename || pdfDocument?.title || 'document.pdf');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return;
    }

    try {
      setCreating(true);
      const result = await createPdfExport(projectId);
      const downloadUrl = typeof result === 'object' && result ? String((result as Record<string, unknown>).download_url || (result as Record<string, unknown>).url || '') : '';
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(apiProjectPdfUrl(projectId), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download mislukt.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <MobilePageScaffold title={formatValue(pdfDocument?.filename || pdfDocument?.uploaded_filename || pdfDocument?.title, 'PDF Viewer')} backTo={`/projecten/${projectId}/ce-dossier`}>
      {loading ? <div className="mobile-state-card">PDF laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-pdf-viewer-card">
          <div className="mobile-pdf-toolbar">
            <div className="mobile-pdf-toolbar-left"><Video size={16} /><span>PDF</span></div>
            <div className="mobile-pdf-toolbar-right">
              <button type="button" className="mobile-icon-button" onClick={handleDownload} aria-label="Download PDF"><Download size={16} /></button>
              <Square size={16} /><Square size={16} />
            </div>
          </div>
          {src ? <iframe className="mobile-pdf-frame" src={src} title="PDF preview" /> : <div className="mobile-state-card">Geen preview beschikbaar.</div>}
          {!documentId ? (
            <button type="button" className="mobile-primary-button" disabled={creating} onClick={handleDownload}>
              <Download size={16} /> {creating ? 'PDF maken…' : 'PDF downloaden'}
            </button>
          ) : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
