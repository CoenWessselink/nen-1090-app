import React from 'react';

import AttachmentList from '../AttachmentList';
import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';

interface CoordinatorsSectionProps {
  rows: any[];
}

export default function CoordinatorsSection({
  rows,
}: CoordinatorsSectionProps) {
  return (
    <EnterpriseCard title="Weld Coordinators">
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Coordinator',
          },
        ]}
      />

      {rows.map((row) => (
        <AttachmentList
          key={row.id}
          attachments={row.certificates ?? []}
        />
      ))}
    </EnterpriseCard>
  );
}
