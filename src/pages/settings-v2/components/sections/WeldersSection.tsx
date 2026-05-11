import React from 'react';

import EnterpriseCard from '../EnterpriseCard';
import EnterpriseTable from '../EnterpriseTable';
import AttachmentList from '../AttachmentList';

interface WeldersSectionProps {
  rows: any[];
}

export default function WeldersSection({ rows }: WeldersSectionProps) {
  return (
    <EnterpriseCard title="Welders">
      <EnterpriseTable
        rows={rows}
        columns={[
          {
            key: 'id',
            label: 'ID',
          },
          {
            key: 'name',
            label: 'Welder',
          },
          {
            key: 'qualification_expiry',
            label: 'Qualification Expiry',
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
