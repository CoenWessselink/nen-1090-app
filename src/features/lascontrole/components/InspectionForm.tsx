import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type InspectionFormValues = {
  weld_id: string;
  method: string;
  template_id?: string;
  status: string;
  due_date: string;
  result: string;
  notes: string;
};

type TemplateRecord = Record<string, unknown>;
type WeldOption = { id: string; label: string };

export function InspectionForm({
  initial,
  weldOptions = [],
  templateOptions = [],
  defaultWeldId,
  isSubmitting,
  onSubmit,
}: {
  initial?: Partial<InspectionFormValues>;
  weldOptions?: WeldOption[];
  templateOptions?: TemplateRecord[];
  defaultWeldId?: string;
  isSubmitting?: boolean;
  onSubmit: (values: InspectionFormValues) => Promise<void> | void;
}) {
  const { register, watch, setValue, reset, handleSubmit } = useForm<InspectionFormValues>({
    defaultValues: {
      weld_id: initial?.weld_id || defaultWeldId || '',
      method: initial?.method || 'VT',
      template_id: initial?.template_id || '',
      status: initial?.status || 'conform',
      due_date: initial?.due_date || '',
      result: initial?.result || 'conform',
      notes: initial?.notes || '',
    },
  });

  useEffect(() => {
    reset({
      weld_id: initial?.weld_id || defaultWeldId || '',
      method: initial?.method || 'VT',
      template_id: initial?.template_id || '',
      status: initial?.status || 'conform',
      due_date: initial?.due_date || '',
      result: initial?.result || 'conform',
      notes: initial?.notes || '',
    });
  }, [defaultWeldId, initial, reset]);

  const selectedTemplateId = watch('template_id');
  const watchedNotes = watch('notes');
  const selectedTemplate = useMemo(
    () => templateOptions.find((row) => String(row.id) === String(selectedTemplateId || '')),
    [selectedTemplateId, templateOptions],
  );
  const templateItems = useMemo(() => {
    const raw = selectedTemplate?.items_json;
    return Array.isArray(raw) ? raw : [];
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const templateName = String(selectedTemplate.name || 'Inspectietemplate');
    const excClass = String(selectedTemplate.exc_class || '').trim();
    const itemCount = templateItems.length;
    const note = `${templateName}${excClass ? ` · ${excClass}` : ''}${itemCount ? ` · ${itemCount} checklistpunten` : ''}`;
    if (!watchedNotes) setValue('notes', note, { shouldDirty: true });
  }, [selectedTemplate, setValue, templateItems.length, watchedNotes]);

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Las">
          <Select {...register('weld_id')}>
            <option value="">Selecteer las</option>
            {weldOptions.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Methode">
          <Select {...register('method')}>
            <option value="VT">Visuele controle (VT)</option>
            <option value="MT">Magnetisch onderzoek (MT)</option>
            <option value="UT">Ultrasoon onderzoek (UT)</option>
            <option value="RT">Radiografisch onderzoek (RT)</option>
          </Select>
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Template">
          <Select {...register('template_id')}>
            <option value="">Geen template</option>
            {templateOptions.map((row) => <option key={String(row.id)} value={String(row.id)}>{String(row.name || row.code || row.id)}</option>)}
          </Select>
        </FormField>
        <FormField label="Vervaldatum"><Input type="date" {...register('due_date')} /></FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Status">
          <Select {...register('status')}>
            <option value="conform">Conform</option>
            <option value="defect">Defect</option>
            <option value="gerepareerd">Gerepareerd</option>
          </Select>
        </FormField>
        <FormField label="Resultaat">
          <Select {...register('result')}>
            <option value="conform">Conform</option>
            <option value="defect">Defect</option>
            <option value="gerepareerd">Gerepareerd</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Notitie"><Input {...register('notes')} /></FormField>
      {selectedTemplate ? (
        <div className="content-panel">
          <div className="section-title-row"><h3>Template checklist</h3></div>
          <div className="list-stack compact-list">
            {templateItems.length ? templateItems.map((item, index) => {
              const row = item as Record<string, unknown>;
              return (
                <div key={`${String(row.key || row.label || index)}`} className="list-row">
                  <div>
                    <strong>{String(row.label || row.key || `Punt ${index + 1}`)}</strong>
                    <div className="list-subtle">{String(row.groep || row.group || row.category || 'Checklist')}</div>
                  </div>
                  <span className="badge badge-neutral">{row.required ? 'Verplicht' : 'Optioneel'}</span>
                </div>
              );
            }) : <div className="list-row"><div><strong>Geen checklistpunten</strong><div className="list-subtle">Template bevat nog geen items_json.</div></div></div>}
          </div>
        </div>
      ) : null}
      <div className="form-actions"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Inspectie opslaan'}</Button></div>
    </form>
  );
}
