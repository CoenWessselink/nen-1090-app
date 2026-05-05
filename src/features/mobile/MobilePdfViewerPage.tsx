import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { downloadDocument, getDocument } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { openDownloadUrl, openProtectedPdfPreview } from '@/utils/download';
import { documentPreviewUrl, formatValue, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

function weldCompliancePdfUrl(projectId: string, download = false, force = true) {
  return `/api/v1/projects/${projectId}/exports/compliance/pdf?download=${download ? 'true' : 'false'}&force=${force ? 'true' : 'false'}&_=${Date.now()}`;
}

function weldComplianceFilename(projectId: string) {
  return `Weld-Compliance-Report-${projectId}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function MobilePdfViewerPage() {
  const { projectId = '', documentId = '' } = useParams();
  const [pdfDocument, setPdfDocument] = useState<CeDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
        setError(normalizeApiError(err, 'PDF kon niet worden geladen.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  const sourcePath = useMemo(() => {
    if (documentId) return documentPreviewUrl(projectId, pdfDocument);
    return weldCompliancePdfUrl(projectId, false, true);
  }, [pdfDocument, documentId, projectId, reloadKey]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!sourcePath) {
      setPreviewUrl('');
      return;
    }
    setCreating(!documentId);
    openProtectedPdfPreview(sourcePath)
      .then((url) => {
        if (!active) {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url.startsWith('blob:') ? url : '';
        setPreviewUrl(url);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setPreviewUrl('');
        setError(normalizeApiError(err, 'Weld Compliance Report kon niet worden geladen.'));
      })
      .finally(() => {
        if (active) setCreating(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourcePath, documentId]);

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
      await openDownloadUrl(weldCompliancePdfUrl(projectId, true, true), weldComplianceFilename(projectId));
    } catch (err) {
      setError(normalizeApiError(err, 'PDF download mislukt.'));
    } finally {
      setCreating(false);
    }
  }

  function regenerate() {
    setReloadKey((value) => value + 1);
  }

  return (
    <MobilePageScaffold title={formatValue(pdfDocument?.filename || pdfDocument?.uploaded_filename || pdfDocument?.title, 'Weld Compliance Report')} backTo={`/projecten/${projectId}/overzicht`}>
      {loading ? <div className="mobile-state-card">PDF laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && (
        <div className="mobile-pdf-viewer-card">
          <div className="mobile-pdf-toolbar">
            <div className="mobile-pdf-toolbar-left"><FileText size={16} /><span>Weld Compliance Report</span></div>
            <div className="mobile-pdf-toolbar-right">
              {!documentId ? <button type="button" className="mobile-icon-button" onClick={regenerate} aria-label="Create PDF" disabled={creating}><RefreshCw size={16} /></button> : null}
              <button type="button" className="mobile-icon-button" onClick={handleDownload} aria-label="Download PDF" disabled={creating}><Download size={16} /></button>
            </div>
          </div>
          {creating && !previewUrl ? <div className="mobile-state-card">Weld Compliance Report maken…</div> : null}
          {previewUrl ? <iframe className="mobile-pdf-frame" src={previewUrl} title="Weld Compliance Report preview" /> : !creating ? <div className="mobile-state-card">Geen preview beschikbaar.</div> : null}
          {!documentId ? (
            <button type="button" className="mobile-primary-button" disabled={creating} onClick={handleDownload}>
              <Download size={16} /> {creating ? 'PDF maken…' : 'Download PDF'}
            </button>
          ) : null}
        </div>
      )}
    </MobilePageScaffold>
  );
}
