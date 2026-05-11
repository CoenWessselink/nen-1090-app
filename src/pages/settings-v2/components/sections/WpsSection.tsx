import React from 'react';

import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';

interface WpsSectionProps {
  rows: any[];
}

export default function WpsSection({ rows }: WpsSectionProps) {
  return (
    <EnterpriseCard title="WPS">
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Name',
          },
        ]}
      />
    </EnterpriseCard>
  );
}
