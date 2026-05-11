import React from 'react';

import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';

interface TemplatesSectionProps {
  rows: any[];
}

export default function TemplatesSection({
  rows,
}: TemplatesSectionProps) {
  return (
    <EnterpriseCard title="Inspection Templates">
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Template',
          },
          {
            key: 'standard',
            label: 'Standard',
          },
        ]}
      />
    </EnterpriseCard>
  );
}
