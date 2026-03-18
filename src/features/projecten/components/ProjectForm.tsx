import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import type { Project } from '@/types/domain';
import type { ProjectFormValues } from '@/types/forms';

const schema = z.object({
  projectnummer: z.string().min(1, 'Projectnummer is verplicht'),
  name: z.string().min(1, 'Omschrijving is verplicht'),
  client_name: z.string().min(1, 'Opdrachtgever is verplicht'),
  execution_class: z.string().min(1, 'Executieklasse is verplicht'),
  status: z.string().min(1, 'Status is verplicht'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export function ProjectForm({
  initial,
  onSubmit,
  isSubmitting,
}: {
  initial?: Project;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectnummer: String(initial?.projectnummer || ''),
      name: String(initial?.name || initial?.omschrijving || ''),
      client_name: String(initial?.client_name || initial?.opdrachtgever || ''),
      execution_class: String(initial?.execution_class || initial?.executieklasse || 'EXC2'),
      status: String(initial?.status || 'concept'),
      start_date: String(initial?.start_date || '').slice(0, 10),
      end_date: String(initial?.end_date || '').slice(0, 10),
    },
  });

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Projectnummer" error={errors.projectnummer?.message}>
          <Input {...register('projectnummer')} />
        </FormField>
        <FormField label="Opdrachtgever" error={errors.client_name?.message}>
          <Input {...register('client_name')} />
        </FormField>
      </div>
      <FormField label="Omschrijving" error={errors.name?.message}>
        <Input {...register('name')} />
      </FormField>
      <div className="two-column-grid">
        <FormField label="Executieklasse" error={errors.execution_class?.message}>
          <Select {...register('execution_class')}>
            <option value="EXC1">EXC1</option>
            <option value="EXC2">EXC2</option>
            <option value="EXC3">EXC3</option>
            <option value="EXC4">EXC4</option>
          </Select>
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            <option value="concept">Concept</option>
            <option value="in-uitvoering">In uitvoering</option>
            <option value="in-controle">In controle</option>
            <option value="gereed">Gereed</option>
            <option value="geblokkeerd">Geblokkeerd</option>
          </Select>
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Startdatum">
          <Input type="date" {...register('start_date')} />
        </FormField>
        <FormField label="Einddatum">
          <Input type="date" {...register('end_date')} />
        </FormField>
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : 'Opslaan'}</Button>
      </div>
    </form>
  );
}
