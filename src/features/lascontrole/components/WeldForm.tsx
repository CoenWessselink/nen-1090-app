import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { useProjects } from '@/hooks/useProjects';
import { useWelders, useWps } from '@/hooks/useSettings';
import { useProjectContext } from '@/context/ProjectContext';
import type { WeldFormValues } from '@/types/forms';

const schema = z.object({
  project_id: z.string().min(1, 'Project is verplicht'),
  weld_number: z.string().min(1, 'Lasnummer is verplicht'),
  assembly_id: z.string().optional(),
  wps_id: z.string().optional(),
  welder_name: z.string().optional(),
  process: z.string().optional(),
  location: z.string().min(1, 'Locatie is verplicht'),
  status: z.string().min(1, 'Status is verplicht'),
});

export function WeldForm({
  initial,
  defaultProjectId,
  submitLabel,
  onSubmit,
  isSubmitting,
}: {
  initial?: Partial<WeldFormValues>;
  defaultProjectId?: string;
  submitLabel?: string;
  onSubmit: (values: WeldFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const { projectId } = useProjectContext();
  const projects = useProjects({ page: 1, limit: 200 });
  const wps = useWps();
  const welders = useWelders();
  const projectRows = useMemo(() => projects.data?.items || [], [projects.data]);
  const wpsRows = useMemo(() => wps.data?.items || [], [wps.data]);
  const welderRows = useMemo(() => welders.data?.items || [], [welders.data]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WeldFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: initial?.project_id || defaultProjectId || (projectId ? String(projectId) : ''),
      weld_number: initial?.weld_number || '',
      assembly_id: initial?.assembly_id || '',
      wps_id: initial?.wps_id || '',
      welder_name: initial?.welder_name || '',
      process: initial?.process || '135',
      location: initial?.location || '',
      status: initial?.status || 'open',
    },
  });

  useEffect(() => {
    reset({
      project_id: initial?.project_id || defaultProjectId || (projectId ? String(projectId) : ''),
      weld_number: initial?.weld_number || '',
      assembly_id: initial?.assembly_id || '',
      wps_id: initial?.wps_id || '',
      welder_name: initial?.welder_name || '',
      process: initial?.process || '135',
      location: initial?.location || '',
      status: initial?.status || 'open',
    });
  }, [defaultProjectId, initial, projectId, reset]);

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <div className="two-column-grid">
        <FormField label="Project" error={errors.project_id?.message}>
          <Select {...register('project_id')}>
            <option value="">Selecteer project</option>
            {projectRows.map((project) => <option key={String(project.id)} value={String(project.id)}>{project.projectnummer || project.name || project.id}</option>)}
          </Select>
        </FormField>
        <FormField label="Lasnummer" error={errors.weld_number?.message}>
          <Input {...register('weld_number')} placeholder="Bijv. LAS-001" />
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="WPS" error={errors.wps_id?.message}>
          <Select {...register('wps_id')}>
            <option value="">Selecteer WPS</option>
            {wpsRows.map((row) => <option key={String(row.id)} value={String(row.code || row.id)}>{String(row.code || row.name || row.id)}</option>)}
          </Select>
        </FormField>
        <FormField label="Lasser" error={errors.welder_name?.message}>
          <Select {...register('welder_name')}>
            <option value="">Selecteer lasser</option>
            {welderRows.map((row) => <option key={String(row.id)} value={String(row.name || row.code || row.id)}>{String(row.name || row.code || row.id)}</option>)}
          </Select>
        </FormField>
      </div>
      <div className="two-column-grid">
        <FormField label="Proces" error={errors.process?.message}>
          <Select {...register('process')}>
            <option value="135">135 (MAG)</option>
            <option value="111">111 (BMBE)</option>
            <option value="141">141 (TIG)</option>
          </Select>
        </FormField>
        <FormField label="Locatie" error={errors.location?.message}>
          <Input {...register('location')} placeholder="Bijv. Hal A / spant 3" />
        </FormField>
      </div>
      <FormField label="Status" error={errors.status?.message}>
        <Select {...register('status')}>
          <option value="open">Open</option>
          <option value="in-controle">In controle</option>
          <option value="conform">Conform</option>
          <option value="afgekeurd">Afgekeurd</option>
        </Select>
      </FormField>
      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opslaan...' : (submitLabel || 'Las opslaan')}</Button>
      </div>
    </form>
  );
}
