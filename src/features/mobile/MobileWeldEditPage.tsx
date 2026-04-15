import { useEffect, useMemo, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteAttachment } from '@/api/documents';
import { getWeld, getWeldAttachments, updateWeld, uploadWeldAttachment } from '@/api/welds';
import { useInspectionTemplates, useMaterials, useProcesses, useWelders, useWps } from '@/hooks/useSettings';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { dispatchAppRefresh, normalizeApiError } from '@/features/mobile/mobile-utils';

type WeldFormState = {
  assembly_id: string;
  weld_no: string;
  inspected_at: string;
  process: string;
  material: string;
  welders: string;
  location: string;
  execution_class: string;
  template_id: string;
  status: string;
  wps: string;
};

type AttachmentRow = {
  id: string;
  title: string;
  filename?: string;
};

export function MobileWeldEditPage() {
  const navigate = useNavigate();
  const { projectId = '', weldId = '' } = useParams();
  const processes = useProcesses();
  const materials = useMaterials();
  const welders = useWelders();
  const wps = useWps();
  const inspectionTemplates = useInspectionTemplates();
  const [form, setForm] = useState<WeldFormState>({
    assembly_id: '',
    weld_no: '',
    inspected_at: '',
    process: '135',
    material: '',
    welders: '',
    location: '',
    execution_class: 'EXC2',
    template_id: '',
    status: 'conform',
    wps: '',
  });
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateOptions = useMemo(
    () => (((inspectionTemplates.data?.items || []) as Array<Record<string, unknown>>).filter((item) => String(item.exc_class || item.execution_class || '').toUpperCase() === String(form.execution_class || '').toUpperCase())),
    [inspectionTemplates.data, form.execution_class],
  );

  const canSave = useMemo(() => Boolean(form.weld_no.trim()), [form.weld_no]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getWeld(projectId, weldId), getWeldAttachments(projectId, weldId).catch(() => [])])
      .then(([result, attachmentResult]) => {
        if (!active) return;
        const record = (result || {}) as Record<string, unknown>;
        setForm({
          assembly_id: String(record.assembly_id || record.assemblyId || ''),
          weld_no: String(record.weld_no || record.weld_number || ''),
          inspected_at: String(record.inspected_at || record.inspection_date || '').slice(0, 10),
          process: String(record.process || '135'),
          material: String(record.material || ''),
          welders: String(record.welders || record.welder_name || ''),
          location: String(record.location || ''),
          execution_class: String(record.execution_class || 'EXC2'),
          template_id: String(record.template_id || ''),
          status: String(record.status || 'conform'),
          wps: String(record.wps || record.wps_id || ''),
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
        setError(normalizeApiError(err, 'Las kon niet worden geladen.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId, weldId]);

  useEffect(() => {
    if (!templateOptions.length) return;
    const current = templateOptions.find((item) => String(item.id) === String(form.template_id || ''));
    if (!current) {
      setForm((state) => ({ ...state, template_id: String(templateOptions[0]?.id || '') }));
    }
  }, [templateOptions, form.template_id]);

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await deleteAttachment(attachmentId);
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    } catch (err) {
      setError(normalizeApiError(err, 'Foto verwijderen mislukt.'));
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
        welder_name: form.welders,
        welders: form.welders,
        execution_class: form.execution_class,
        template_id: form.template_id || null,
        status: form.status,
        wps: form.wps || null,
      });

      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('file', file);
        await uploadWeldAttachment(projectId, weldId, formData);
      }

      dispatchAppRefresh({ scope: 'welds', projectId, weldId, reason: 'weld-updated' });
      navigate(`/projecten/${projectId}/lassen`, { replace: true });
    } catch (err) {
      setError(normalizeApiError(err, 'Las opslaan mislukt.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageScaffold title="Las bewerken" subtitle="Werk lasgegevens bij" backTo={`/projecten/${projectId}/lassen`}>
      {loading ? <div className="mobile-state-card">Las laden…</div> : null}
      {error ? <div className="mobile-inline-alert is-error">{error}</div> : null}
      {!loading ? (
        <div className="mobile-form-card" data-testid="mobile-weld-edit-form">
          <label className="mobile-form-field"><span>Assemblage</span><input value={form.assembly_id} onChange={(event) => setForm((current) => ({ ...current, assembly_id: event.target.value }))} placeholder="Assemblage" /></label>
          <label className="mobile-form-field"><span>Lasnummer</span><input value={form.weld_no} onChange={(event) => setForm((current) => ({ ...current, weld_no: event.target.value }))} placeholder="Lasnummer" /></label>
          <label className="mobile-form-field"><span>Lasdatum</span><input type="date" value={form.inspected_at} onChange={(event) => setForm((current) => ({ ...current, inspected_at: event.target.value }))} /></label>
          <label className="mobile-form-field mobile-select-field"><span>Executieklasse</span><select value={form.execution_class} onChange={(event) => setForm((current) => ({ ...current, execution_class: event.target.value }))}>{['EXC1','EXC2','EXC3','EXC4'].map((exc) => <option key={exc} value={exc}>{exc}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Lasmethode</span><select value={form.process} onChange={(event) => setForm((current) => ({ ...current, process: event.target.value }))}>{((processes.data?.items || []) as Array<Record<string, unknown>>).map((item) => { const value = String(item.code || item.name || item.title || ''); return <option key={String(item.id || value)} value={value}>{String(item.name || item.title || value)}</option>; })}<option value="135">135 (MAG)</option><option value="111">111 (BMBE)</option><option value="141">141 (TIG)</option></select></label>
          <label className="mobile-form-field mobile-select-field"><span>WPS</span><select value={form.wps} onChange={(event) => setForm((current) => ({ ...current, wps: event.target.value }))}><option value="">Selecteer WPS</option>{((wps.data?.items || []) as Array<Record<string, unknown>>).map((item) => <option key={String(item.id)} value={String(item.code || item.id)}>{String(item.code || item.title || item.id)}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Materiaal</span><select value={form.material} onChange={(event) => setForm((current) => ({ ...current, material: event.target.value }))}><option value="">Selecteer materiaal</option>{((materials.data?.items || []) as Array<Record<string, unknown>>).map((item) => <option key={String(item.id)} value={String(item.code || item.title || item.id)}>{String(item.code || item.title || item.id)}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Lasser</span><select value={form.welders} onChange={(event) => setForm((current) => ({ ...current, welders: event.target.value }))}><option value="">Selecteer lasser</option>{((welders.data?.items || []) as Array<Record<string, unknown>>).map((item) => { const value = String(item.name || item.code || item.id || ''); return <option key={String(item.id || value)} value={value}>{value}</option>; })}</select></label>
          <label className="mobile-form-field"><span>Locatie</span><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Locatie" /></label>
          <label className="mobile-form-field mobile-select-field"><span>Inspectietemplate</span><select value={form.template_id} onChange={(event) => setForm((current) => ({ ...current, template_id: event.target.value }))}><option value="">Automatisch via EXC</option>{templateOptions.map((item) => <option key={String(item.id)} value={String(item.id)}>{[String(item.name || item.title || item.id), String(item.norm || '').trim(), item.version ? `v${String(item.version)}` : ''].filter(Boolean).join(' · ')}</option>)}</select></label>
          <label className="mobile-form-field mobile-select-field"><span>Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="conform">Conform</option><option value="in_controle">In controle</option><option value="niet_conform">Niet conform</option></select></label>
          <label className="mobile-upload-field"><span><Camera size={16} /> Foto’s toevoegen</span><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setNewFiles(Array.from(event.target.files || []))} /><small>Voeg extra foto’s toe aan deze las</small></label>
          {newFiles.length ? <div className="mobile-file-list">{newFiles.map((file) => <div key={`${file.name}-${file.size}`} className="mobile-file-pill">{file.name}</div>)}</div> : null}
          {attachments.length ? (
            <div className="mobile-attachment-list">
              {attachments.map((item) => (
                <div key={item.id} className="mobile-attachment-row">
                  <div>
                    <strong>{item.title}</strong>
                    {item.filename ? <small>{item.filename}</small> : null}
                  </div>
                  <button type="button" className="mobile-icon-ghost-button" onClick={() => handleDeleteAttachment(item.id)} aria-label="Foto verwijderen">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mobile-inline-actions stack-on-mobile">
            <button type="button" className="mobile-primary-button" onClick={handleSave} disabled={saving || !canSave}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            <button type="button" className="mobile-danger-button" onClick={() => navigate(`/projecten/${projectId}/lassen`)}>Annuleren</button>
          </div>
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
