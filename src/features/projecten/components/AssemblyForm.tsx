import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';

type AssemblyFormValues = {
  code: string;
  name: string;
  status: string;
  description?: string;
};

export function AssemblyForm({ initial, onSubmit, isSubmitting }: { initial?: Partial<AssemblyFormValues>; onSubmit: (values: AssemblyFormValues) => Promise<void> | void; isSubmitting?: boolean }) {
  const { register, handleSubmit } = useForm<AssemblyFormValues>({
    defaultValues: {
      code: initial?.code || '',
      name: initial?.name || '',
      status: initial?.status || 'concept',
      description: initial?.description || '',
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Assembly code">
          <Input {...register('code')} />
        </FormField>
        <FormField label="Naam">
          <Input {...register('name')} />
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Status">
          <Select {...register('status')}>
            <option value="concept">Concept</option>
            <option value="in-productie">In productie</option>
            <option value="in-controle">In controle</option>
            <option value="vrijgegeven">Vrijgegeven</option>
          </Select>
        </FormField>
        <FormField label="Omschrijving">
          <Input {...register('description')} />
        </FormField>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Assembly opslaan'}</Button>
      </div>
    </form>
  );
}
