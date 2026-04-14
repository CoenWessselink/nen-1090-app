import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteAttachment } from '@/api/documents';
import { getWeld, getWeldAttachments, updateWeld, uploadWeldAttachment } from '@/api/welds';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

type WeldFormState = {
  assembly_id: string;
  weld_no: string;
  inspected_at: string;
  process: string;
  material: string;
  welders: string;
  location: string;
};

type AttachmentRow = {
  id: string;
  title: string;
  filename?: string;
};

export function MobileWeldEditPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const [form, setForm] = useState<WeldFormState>({
    assembly_id: '',
    weld_no: '',
    inspected_at: '',
    process: '',
    material: '',
    welders: '',
    location: '',
  });
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(form.weld_no.trim()), [form.weld_no]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getWeld(projectId, weldId),
      getWeldAttachments(projectId, weldId).catch(() => []),
    ])
      .then(([result, attachmentResult]) => {
        if (!active) return;
        const record = (result || {}) as Record<string, unknown>;
        setForm({
          assembly_id: String(record.assembly_id || record.assemblyId || ''),
          weld_no: String(record.weld_no || record.weld_number || ''),
          inspected_at: String(record.inspected_at || record.inspection_date || '').slice(0, 10),
          process: String(record.process || record.lasmethode || ''),
          material: String(record.material || ''),
          welders: String(record.welders || record.welder_name || ''),
          location: String(record.location || ''),
        });
        const rows = Array.isArray(attachmentResult)
          ? attachmentResult
          : Array.isArray((attachmentResult as Record<string, unknown>)?.items)
            ? ((attachmentResult as Record<string, unknown>).items as unknown[])
            : [];
        setAttachments(rows.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            id: String(row.id || ''),
            title: String(row.title || row.filename || row.name || 'Bestand'),
            filename: String(row.filename || row.name || ''),
          };
        }).filter((item) => item.id));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Las kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, weldId]);

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await deleteAttachment(attachmentId);
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto verwijderen mislukt.');
    }
  }

  async function handleSave() {
    if (!canSave) {
      setError('Lasnummer is verplicht.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateWeld(projectId, weldId, {
        assembly_id: form.assembly_id || null,
        weld_number: form.weld_no,
        weld_no: form.weld_no,
        inspected_at: form.inspected_at || null,
        process: form.process,
        material: form.material,
        location: form.location,
        welders: form.welders,
        welder_name: form.welders,
      });

      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('file', file);
        await uploadWeldAttachment(projectId, weldId, formData);
      }

      navigate(`/projecten/${projectId}/lassen`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Las bewerken" backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Las laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-form-card" data-testid="mobile-weld-edit-form">
          <label className="mobile-form-field"><span>Assemblage</span><input value={form.assembly_id} onChange={(e) => setForm((s) => ({ ...s, assembly_id: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasnummer</span><input value={form.weld_no} onChange={(e) => setForm((s) => ({ ...s, weld_no: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasdatum</span><input type="date" value={form.inspected_at} onChange={(e) => setForm((s) => ({ ...s, inspected_at: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasmethode</span><input value={form.process} onChange={(e) => setForm((s) => ({ ...s, process: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Materiaal</span><input value={form.material} onChange={(e) => setForm((s) => ({ ...s, material: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Lasser</span><input value={form.welders} onChange={(e) => setForm((s) => ({ ...s, welders: e.target.value }))} /></label>
          <label className="mobile-form-field"><span>Locatie</span><input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} /></label>

          <div className="mobile-state-card">
            <strong>Foto’s bij las</strong>
            <label className="mobile-form-field" style={{ marginTop: 8 }}>
              <span>Nieuwe foto’s toevoegen</span>
              <input type="file" accept="image/*" multiple onChange={(event) => setNewFiles(Array.from(event.target.files || []))} />
            </label>
            {newFiles.length ? newFiles.map((file) => <div key={`${file.name}-${file.size}`}>{file.name}</div>) : <small>Nog geen nieuwe foto’s geselecteerd.</small>}
          </div>

          <div className="mobile-state-card">
            <strong>Bestaande foto’s / bijlagen</strong>
            {attachments.length ? attachments.map((attachment) => (
              <div key={attachment.id} className="mobile-inline-actions" style={{ justifyContent: 'space-between' }}>
                <span>{attachment.title}</span>
                <button type="button" className="mobile-danger-button" onClick={() => handleDeleteAttachment(attachment.id)}>Verwijderen</button>
              </div>
            )) : <small>Nog geen opgeslagen foto’s.</small>}
          </div>

          <div className="mobile-form-actions">
            <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            <button type="button" className="mobile-secondary-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
          </div>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
