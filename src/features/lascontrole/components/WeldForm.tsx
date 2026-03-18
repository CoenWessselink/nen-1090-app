import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import type { WeldFormValues } from '@/types/forms';

const schema = z.object({
  project_id: z.string().min(1, 'Project is verplicht'),
  assembly_id: z.string().min(1, 'Assembly is verplicht'),
  wps_id: z.string().min(1, 'WPS is verplicht'),
  location: z.string().min(1, 'Locatie is verplicht'),
  status: z.string().min(1, 'Status is verplicht'),
});

export function WeldForm({ onSubmit, isSubmitting }: { onSubmit: (values: WeldFormValues) => Promise<void> | void; isSubmitting?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<WeldFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: '',
      assembly_id: '',
      wps_id: '',
      location: '',
      status: 'in controle',
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Project ID" error={errors.project_id?.message}>
          <Input {...register('project_id')} />
        </FormField>
        <FormField label="Assembly ID" error={errors.assembly_id?.message}>
          <Input {...register('assembly_id')} />
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="WPS ID" error={errors.wps_id?.message}>
          <Input {...register('wps_id')} />
        </FormField>
        <FormField label="Locatie" error={errors.location?.message}>
          <Input {...register('location')} />
        </FormField>
      </div>
      <FormField label="Status" error={errors.status?.message}>
        <Select {...register('status')}>
          <option value="in controle">In controle</option>
          <option value="conform">Conform</option>
          <option value="afgekeurd">Afgekeurd</option>
          <option value="concept">Concept</option>
        </Select>
      </FormField>
      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Las opslaan'}</Button>
      </div>
    </form>
  );
}
