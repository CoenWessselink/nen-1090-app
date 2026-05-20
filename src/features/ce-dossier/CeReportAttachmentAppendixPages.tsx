import type { CeDocument } from '@/types/domain';

type R = Record<string, unknown>;

type ReportChrome = {
  header: () => JSX.Element;
  footer: (pageNum: number, totalPages: number) => JSX.Element;
};

function val(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function record(document: CeDocument): R {
  return document as unknown as R;
}

export function ceDocumentSource(document: CeDocument) {
  const row = record(document);
  return String(row.url || row.download_url || row.file_url || row.preview_url || row.storage_url || row.public_url || row.href || '');
}

export function ceDocumentName(document: CeDocument) {
  const row = record(document);
  return val(row.file_name || row.filename || row.name || row.title, 'Attachment');
}

export function ceDocumentMime(document: CeDocument) {
  const row = record(document);
  return String(row.mime_type || row.content_type || row.type || '').toLowerCase();
}

export function ceDocumentScope(document: CeDocument) {
  const row = record(document);
  return val(row.scope || row.linked_scope || row.scope_type || row.category || 'Project');
}

export function ceDocumentDate(document: CeDocument) {
  const row = record(document);
  return val(row.uploaded_at || row.created_at || row.date || row.updated_at, '—');
}

export function isCeImageDocument(document: CeDocument) {
  const mime = ceDocumentMime(document);
  const src = ceDocumentSource(document).toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(src);
}

export function isCePdfDocument(document: CeDocument) {
  const mime = ceDocumentMime(document);
  const src = ceDocumentSource(document).toLowerCase();
  return mime.includes('pdf') || /\.pdf(\?|#|$)/i.test(src);
}

export function ceDocumentTypeLabel(document: CeDocument) {
  if (isCeImageDocument(document)) return 'Image / photo evidence';
  if (isCePdfDocument(document)) return 'PDF attachment';
  const mime = ceDocumentMime(document);
  if (mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return 'Word document';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'Excel document';
  if (mime.includes('text')) return 'Text document';
  return val(mime || record(document).category || record(document).kind, 'Document attachment');
}

export function nonImageAppendixDocuments(documents: CeDocument[]) {
  return documents.filter((document) => !isCeImageDocument(document));
}

export function RenderCeAttachmentAppendixPages({
  documents,
  startPage,
  totalPages,
  header,
  footer,
}: {
  documents: CeDocument[];
  startPage: number;
  totalPages: number;
} & ReportChrome) {
  const appendixDocuments = nonImageAppendixDocuments(documents);
  if (!appendixDocuments.length) return null;

  return (
    <>
      {appendixDocuments.map((document, index) => {
        const src = ceDocumentSource(document);
        const name = ceDocumentName(document);
        const appendixId = `APP-DOC-${String(index + 1).padStart(3, '0')}`;

        return (
          <section
            className="rpt-page rpt-attachment-full-page rpt-anchor-offset"
            id={index === 0 ? 'document-attachments' : undefined}
            data-print-section="true"
            key={`${appendixId}-${String(record(document).id || index)}`}
          >
            {header()}
            <div className="rpt-body">
              <h2>9.{index + 1}. Document attachment — {appendixId}</h2>
              <table className="rpt-table rpt-meta-table rpt-attachment-meta-table">
                <tbody>
                  <tr><td>Attachment ID</td><td className="rpt-mono">{appendixId}</td></tr>
                  <tr><td>Filename</td><td>{name}</td></tr>
                  <tr><td>Type</td><td>{ceDocumentTypeLabel(document)}</td></tr>
                  <tr><td>Linked scope</td><td>{ceDocumentScope(document)}</td></tr>
                  <tr><td>Uploaded</td><td>{ceDocumentDate(document)}</td></tr>
                </tbody>
              </table>

              <div className="rpt-nonpdf-attachment-block">
                <strong>Documentbijlage opgenomen in dossierregister</strong>
                <p>
                  Deze bijlage is geregistreerd als onderdeel van het CE-dossier met bestandsnaam, type, scope en uploaddatum. De inhoud wordt niet automatisch in een frame geladen, zodat CSP-beleid en beveiligde downloads geen rapportfouten veroorzaken.
                </p>
                {src ? <a href={src} target="_blank" rel="noreferrer">Open originele bijlage</a> : null}
              </div>
            </div>
            {footer(startPage + index, totalPages)}
          </section>
        );
      })}
    </>
  );
}
