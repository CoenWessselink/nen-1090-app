import { useEffect, useRef, useState } from 'react';
import { Download, Eye, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProjectDocument, downloadDocument, getProjectDocuments } from '@/api/documents';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { firstPdfDocument, formatFileSize, projectOverviewPath } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

export function MobileDocumentsPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    const response = await getProjectDocuments(projectId, { page: 1, limit: 50 });
    setDocuments(Array.isArray(response?.items) ? response.items : []);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDocuments()
      .then(() => {
        if (active) setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Documenten konden niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('title', file.name);
      payload.append('filename', file.name);
      await createProjectDocument(projectId, payload);
      await loadDocuments();
      const pdf = firstPdfDocument([...(documents || []), { id: 'new', filename: file.name, mime_type: file.type } as CeDocument]);
      if (pdf && (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf'))) {
        navigate(`/projecten/${projectId}/documenten`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDownload(documentId: string | number, filename: string) {
    const blob = await downloadDocument(documentId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'document';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <MobilePageScaffold title="Documents" backTo={projectOverviewPath(projectId)} testId="mobile-documents-page">
      <div className="mobile-toolbar-card">
        <input ref={inputRef} type="file" hidden onChange={handleUpload} />
        <button type="button" className="mobile-primary-button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload size={16} /> {uploading ? 'Uploaden…' : 'Upload Document'}
        </button>
      </div>
      {loading ? <div className="mobile-state-card" data-testid="mobile-documents-loading">Documenten laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error" data-testid="mobile-documents-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-list-stack" data-testid="mobile-documents-list">
          {documents.map((document) => (
            <div key={String(document.id)} className="mobile-list-card" data-testid={`mobile-document-card-${document.id}`}>
              <div className="mobile-list-card-head">
                <strong>{String(document.filename || document.uploaded_filename || document.title || 'Document')}</strong>
                <button type="button" className="mobile-link-button" onClick={() => navigate(`/projecten/${projectId}/documenten/${document.id}/viewer`)}>
                  <Eye size={14} /> Bekijken
                </button>
              </div>
              <span className="mobile-list-card-subtitle">{formatFileSize(document.size_bytes)}</span>
              <div className="mobile-inline-actions">
                <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/documenten/${document.id}/viewer`)}>Bekijken</button>
                <button type="button" className="mobile-primary-button" onClick={() => void handleDownload(document.id, String(document.filename || document.uploaded_filename || document.title || 'document'))}>
                  <Download size={14} /> Downloaden
                </button>
              </div>
            </div>
          ))}
          {!documents.length ? <div className="mobile-state-card">Nog geen documenten gekoppeld aan dit project.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
