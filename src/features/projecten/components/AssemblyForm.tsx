import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { UploadDropzone } from '@/components/upload/UploadDropzone';

type AssemblyFormValues = {
  code: string;
  name: string;
  status: string;
  description?: string;
};

/**
 * G-09 fix: na submit wordt de assemblies query geïnvalideerd zodat de
 * lijst direct ververst zonder handmatige pagina-refresh.
 */
export function AssemblyForm({
  initial,
  projectId,
  onSubmit,
  isSubmitting,
  onSuccess,
}: {
  initial?: Partial<AssemblyFormValues>;
  projectId?: string | number;
  onSubmit: (values: AssemblyFormValues, files: File[]) => Promise<void> | void;
  isSubmitting?: boolean;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset } = useForm<AssemblyFormValues>({
    defaultValues: {
      code: initial?.code || '',
      name: initial?.name || '',
      status: initial?.status || 'vrijgegeven',
      description: initial?.description || '',
    },
  });

  const totalSizeLabel = useMemo(() => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (!total) return 'Geen bestanden geselecteerd';
    return `${files.length} bestand(en) geselecteerd · ${(total / 1024 / 1024).toFixed(2)} MB`;
  }, [files]);

  const handleFormSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values, files);

      // G-09: invalideer assemblies query zodat lijst direct ververst
      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: ['assemblies', String(projectId)] });
        await queryClient.invalidateQueries({ queryKey: ['assemblies'] });
        await queryClient.invalidateQueries({ queryKey: ['project', String(projectId)] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      }

      setSaved(true);
      setFiles([]);
      reset({ code: '', name: '', status: 'vrijgegeven', description: '' });
      setTimeout(() => setSaved(false), 2500);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    }
  });

  return (
    <form className="form-grid" onSubmit={handleFormSubmit}>
      <div className="two-column-grid">
        <FormField label="Assembly code">
          <Input {...register('code')} placeholder="bijv. ASM-001" />
        </FormField>
        <FormField label="Naam">
          <Input {...register('name')} placeholder="Omschrijving van de assembly" />
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Status">
          <Select {...register('status')}>
            <option value="vrijgegeven">Vrijgegeven</option>
            <option value="in-productie">In productie</option>
            <option value="in-controle">In controle</option>
            <option value="concept">Concept</option>
          </Select>
        </FormField>
        <FormField label="Omschrijving">
          <Input {...register('description')} placeholder="Optionele omschrijving" />
        </FormField>
      </div>

      <div className="content-panel">
        <div className="section-title-row">
          <h3>Documenten en foto's</h3>
        </div>
        <div className="list-subtle">
          Voeg direct bewijsstukken toe aan deze assembly. Na opslaan worden ze gekoppeld binnen de projectcontext.
        </div>
        <UploadDropzone
          onFiles={(incoming) => setFiles((current) => [...current, ...incoming])}
          disabled={isSubmitting}
        />
        <div className="list-subtle">{totalSizeLabel}</div>
        {files.length ? (
          <div className="list-stack compact-list">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="list-row">
                <div>
                  <strong>{file.name}</strong>
                  <div className="list-subtle">{file.type || 'Bestand'} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button type="button" className="icon-button"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  aria-label="Verwijder bestand">
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {submitError && (
        <div style={{ fontSize: 13, color: 'var(--color-text-danger)',
                       background: 'var(--color-background-danger)',
                       padding: '8px 12px', borderRadius: 'var(--border-radius-md)' }}>
          {submitError}
        </div>
      )}

      {saved && (
        <div style={{ fontSize: 13, color: 'var(--color-text-success)',
                       background: 'var(--color-background-success)',
                       padding: '8px 12px', borderRadius: 'var(--border-radius-md)' }}>
          Assembly opgeslagen. De lijst is bijgewerkt.
        </div>
      )}

      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Opslaan...' : 'Assembly opslaan'}
        </Button>
      </div>
    </form>
  );
}
