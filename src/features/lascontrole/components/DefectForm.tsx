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

export function DefectForm({ initial, isSubmitting, onSubmit }: { initial?: Partial<DefectFormValues>; isSubmitting?: boolean; onSubmit: (values: DefectFormValues) => Promise<void> | void }) {
  const { register, handleSubmit } = useForm<DefectFormValues>({
    defaultValues: {
      weld_id: initial?.weld_id || '',
      defect_type: initial?.defect_type || '',
      severity: initial?.severity || 'medium',
      status: initial?.status || 'open',
      notes: initial?.notes || '',
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Weld ID"><Input {...register('weld_id')} /></FormField>
        <FormField label="Defecttype"><Input {...register('defect_type')} /></FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Ernst"><Select {...register('severity')}><option value="low">Laag</option><option value="medium">Middel</option><option value="high">Hoog</option></Select></FormField>
        <FormField label="Status"><Select {...register('status')}><option value="open">Open</option><option value="repairing">Herstel</option><option value="resolved">Opgelost</option></Select></FormField>
      </div>
      <FormField label="Notitie"><Input {...register('notes')} /></FormField>
      <div className="form-actions"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Defect opslaan'}</Button></div>
    </form>
  );
}
