import React from 'react';

import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';

interface MaterialsSectionProps {
  rows: any[];
}

export default function MaterialsSection({ rows }: MaterialsSectionProps) {
  return (
    <EnterpriseCard title="Materials">
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Material',
          },
        ]}
      />
    </EnterpriseCard>
  );
}
