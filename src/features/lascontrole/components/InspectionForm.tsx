import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type InspectionFormValues = {
  weld_id: string;
  method: string;
  status: string;
  due_date: string;
  result: string;
  notes: string;
};

export function InspectionForm({ initial, isSubmitting, onSubmit }: { initial?: Partial<InspectionFormValues>; isSubmitting?: boolean; onSubmit: (values: InspectionFormValues) => Promise<void> | void }) {
  const { register, handleSubmit } = useForm<InspectionFormValues>({
    defaultValues: {
      weld_id: initial?.weld_id || '',
      method: initial?.method || 'VT',
      status: initial?.status || 'pending',
      due_date: initial?.due_date || '',
      result: initial?.result || 'pending',
      notes: initial?.notes || '',
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Weld ID"><Input {...register('weld_id')} /></FormField>
        <FormField label="Methode"><Select {...register('method')}><option value="VT">VT</option><option value="MT">MT</option><option value="UT">UT</option><option value="RT">RT</option></Select></FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Status"><Select {...register('status')}><option value="pending">Pending</option><option value="planned">Planned</option><option value="completed">Completed</option><option value="approved">Approved</option></Select></FormField>
        <FormField label="Vervaldatum"><Input type="date" {...register('due_date')} /></FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Resultaat"><Select {...register('result')}><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="repair-required">Repair required</option></Select></FormField>
        <FormField label="Notitie"><Input {...register('notes')} /></FormField>
      </div>
      <div className="form-actions"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Inspectie opslaan'}</Button></div>
    </form>
  );
}
