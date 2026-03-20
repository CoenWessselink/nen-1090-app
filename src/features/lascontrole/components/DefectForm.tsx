import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type DefectFormValues = {
  weld_id: string;
  defect_type: string;
  severity: string;
  status: string;
  notes: string;
};

type WeldOption = { id: string; label: string };

const ISO_5817_OPTIONS = [
  { value: 'B', label: 'Niveau B — streng' },
  { value: 'C', label: 'Niveau C — standaard' },
  { value: 'D', label: 'Niveau D — ruim' },
];

const DEFECT_TYPES = [
  'Porositeit',
  'Ondergraving',
  'Onvoldoende inbranding',
  'Slakinsluiting',
  'Scheurvorming',
  'Vormafwijking',
  'Overige',
];

export function DefectForm({
  initial,
  weldOptions = [],
  defaultWeldId,
  isSubmitting,
  onSubmit,
}: {
  initial?: Partial<DefectFormValues>;
  weldOptions?: WeldOption[];
  defaultWeldId?: string;
  isSubmitting?: boolean;
  onSubmit: (values: DefectFormValues) => Promise<void> | void;
}) {
  const { register, reset, handleSubmit } = useForm<DefectFormValues>({
    defaultValues: {
      weld_id: initial?.weld_id || defaultWeldId || '',
      defect_type: initial?.defect_type || '',
      severity: initial?.severity || 'C',
      status: initial?.status || 'open',
      notes: initial?.notes || '',
    },
  });

  useEffect(() => {
    reset({
      weld_id: initial?.weld_id || defaultWeldId || '',
      defect_type: initial?.defect_type || '',
      severity: initial?.severity || 'C',
      status: initial?.status || 'open',
      notes: initial?.notes || '',
    });
  }, [defaultWeldId, initial, reset]);

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Las">
          <Select {...register('weld_id')}>
            <option value="">Selecteer las</option>
            {weldOptions.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Defecttype">
          <Select {...register('defect_type')}>
            <option value="">Selecteer type</option>
            {DEFECT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="ISO 5817 acceptatieniveau">
          <Select {...register('severity')}>
            {ISO_5817_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select {...register('status')}>
            <option value="open">Open</option>
            <option value="repairing">Herstel</option>
            <option value="resolved">Opgelost</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Notitie"><Input {...register('notes')} placeholder="Korte omschrijving van bevinding / herstelactie" /></FormField>
      <div className="form-actions"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Defect opslaan'}</Button></div>
    </form>
  );
}
