import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';

export function DocumentUploadForm({ onSubmit, isSubmitting }: { onSubmit: (payload: { file: File; entity_type: string; entity_id: string }) => Promise<void> | void; isSubmitting?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('project');
  const [entityId, setEntityId] = useState('');

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file || !entityId) return;
        await onSubmit({ file, entity_type: entityType, entity_id: entityId });
      }}
    >
      <FormField label="Entiteit">
        <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="project">Project</option>
          <option value="weld">Las</option>
          <option value="document">Document</option>
        </Select>
      </FormField>
      <FormField label="Entiteit ID">
        <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
      </FormField>
      <FormField label="Bestand">
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </FormField>
      <div className="form-actions">
        <Button type="submit" disabled={!file || !entityId || isSubmitting}>{isSubmitting ? 'Uploaden...' : 'Bestand uploaden'}</Button>
      </div>
    </form>
  );
}
