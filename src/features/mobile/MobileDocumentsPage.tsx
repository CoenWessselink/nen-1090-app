import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Eye, FileText, Library, Upload, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProjectDocument, downloadDocument, getProjectDocuments } from '@/api/documents';
import { getCeDocuments } from '@/api/ce';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { formatFileSize, formatValue } from '@/features/mobile/mobile-utils';
import type { CeDocument } from '@/types/domain';

type LibDoc = Record<string, unknown> & { id?: string; title?: string; filename?: string; name?: string; mime_type?: string };

function docName(d: LibDoc | CeDocument) {
  return String((d as any).filename || (d as any).uploaded_filename || (d as any).title || (d as any).name || 'Document');
}

export function MobileDocumentsPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<CeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState<LibDoc[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibIds, setSelectedLibIds] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);

  const loadDocuments = useCallback(async () => {
    const response = await getProjectDocuments(projectId, { page: 1, limit: 50 });
    setDocuments(Array.isArray(response?.items) ? response.items : []);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDocuments()
      .then(() => { if (active) setError(null); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Documenten konden niet worden geladen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadDocuments]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    let uploaded = 0;
    try {
      for (const file of files) {
        setUploadProgress(`Uploaden ${uploaded + 1} / ${files.length}: ${file.name}`);
        const payload = new FormData();
        payload.append('file', file);
        payload.append('files', file);
        payload.append('title', file.name);
        payload.append('filename', file.name);
        await createProjectDocument(projectId, payload);
        uploaded++;
      }
      await loadDocuments();
      setSuccess(`${uploaded} ${uploaded === 1 ? 'document' : 'documenten'} geüpload.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Upload mislukt bij bestand ${uploaded + 1}.`);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function openLibrary() {
    setShowLibrary(true);
    setLibraryLoading(true);
    setSelectedLibIds(new Set());
    try {
      const response = await getCeDocuments({ page: 1, limit: 100 });
      const items = Array.isArray(response) ? response : Array.isArray((response as any)?.items) ? (response as any).items : [];
      const projectDocIds = new Set(documents.map(d => String(d.id)));
      setLibraryDocs(items.filter((d: LibDoc) => !projectDocIds.has(String(d.id || ''))));
    } catch {
      setLibraryDocs([]);
    } finally {
      setLibraryLoading(false);
    }
  }

  function toggleLibDoc(id: string) {
    setSelectedLibIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function linkSelectedDocs() {
    if (!selectedLibIds.size) return;
    setLinking(true);
    setError(null);
    setSuccess(null);
    let linked = 0;
    try {
      for (const docId of selectedLibIds) {
        const doc = libraryDocs.find(d => String(d.id) === docId);
        await createProjectDocument(projectId, {
          document_id: docId,
          title: doc ? docName(doc) : docId,
          source: 'library',
        });
        linked++;
      }
      await loadDocuments();
      setShowLibrary(false);
      setSuccess(`${linked} ${linked === 1 ? 'document' : 'documenten'} gekoppeld vanuit bibliotheek.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Koppelen mislukt.');
    } finally {
      setLinking(false);
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
    <MobilePageScaffold title="Documenten" backTo={`/projecten/${projectId}/overzicht`}>
      <div className="mobile-toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={inputRef} type="file" multiple hidden onChange={handleUpload} />
          <button type="button" className="mobile-primary-button" style={{ flex: '1 1 140px' }} onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload size={16} /> {uploading ? uploadProgress || 'Uploaden…' : 'Bestanden uploaden'}
          </button>
          <button type="button" className="mobile-secondary-button" style={{ flex: '1 1 140px' }} onClick={openLibrary} disabled={uploading}>
            <Library size={16} /> Uit bibliotheek
          </button>
        </div>
        <small style={{ color: '#64748b' }}>Upload nieuwe bestanden of koppel bestaande documenten uit de bibliotheek.</small>
      </div>

      {success ? <div className="mobile-inline-alert is-success">{success}</div> : null}
      {loading ? <div className="mobile-state-card">Documenten laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}

      {/* Library picker */}
      {showLibrary && (
        <div className="mobile-list-card" style={{ border: '2px solid #2563eb', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Library size={16} /> Documentbibliotheek</strong>
            <button type="button" className="mobile-icon-ghost-button" onClick={() => setShowLibrary(false)} aria-label="Sluiten"><X size={16} /></button>
          </div>
          {libraryLoading ? <div className="mobile-state-card">Bibliotheek laden…</div> : (
            <>
              {libraryDocs.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {libraryDocs.map((doc) => {
                    const id = String(doc.id || '');
                    const selected = selectedLibIds.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleLibDoc(id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          border: `1.5px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius: 10, background: selected ? '#eff6ff' : '#fff',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          fontFamily: 'inherit', fontSize: 13,
                        }}
                      >
                        <span style={{
                          width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${selected ? '#2563eb' : '#cbd5e1'}`,
                          background: selected ? '#2563eb' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                          {selected ? <Check size={12} color="#fff" /> : null}
                        </span>
                        <FileText size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docName(doc)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : <div className="mobile-state-card">Geen documenten beschikbaar in de bibliotheek.</div>}
              {libraryDocs.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="mobile-primary-button" style={{ flex: 1 }} onClick={linkSelectedDocs} disabled={!selectedLibIds.size || linking}>
                    {linking ? 'Koppelen…' : `${selectedLibIds.size || 0} ${selectedLibIds.size === 1 ? 'document' : 'documenten'} koppelen`}
                  </button>
                  <button type="button" className="mobile-secondary-button" onClick={() => setShowLibrary(false)}>Annuleren</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!loading ? (
        <div className="mobile-list-stack">
          {documents.map((document) => {
            const filename = formatValue(document.filename || document.uploaded_filename || document.title, 'Document');
            return (
              <div key={String(document.id)} className="mobile-list-card">
                <div className="mobile-list-card-head">
                  <strong>{filename}</strong>
                </div>
                <span className="mobile-list-card-meta">{formatFileSize(document.size_bytes)}</span>
                <div className="mobile-inline-actions">
                  <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/documenten/${document.id}/viewer`)}>
                    <Eye size={16} /> Bekijken
                  </button>
                  <button type="button" className="mobile-primary-button" onClick={() => handleDownload(document.id, filename)}>
                    <Download size={16} /> Downloaden
                  </button>
                </div>
              </div>
            );
          })}
          {!documents.length ? <div className="mobile-state-card">Nog geen documenten beschikbaar.</div> : null}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
