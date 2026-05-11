import React from 'react';

import AttachmentList from '../settings-v2/components/AttachmentList';
import EnterpriseCard from '../settings-v2/components/EnterpriseCard';
import EnterpriseTable from '../settings-v2/components/EnterpriseTable';

import { useCeAggregate } from './hooks/useCeAggregate';

interface CeAggregatePageProps {
  projectId: string;
}

export default function CeAggregatePage({
  projectId,
}: CeAggregatePageProps) {
  const {
    data,
    loading,
    error,
  } = useCeAggregate(projectId);

  if (loading) {
    return <div className="page-container">Loading CE Aggregate...</div>;
  }

  if (error || !data) {
    return <div className="page-container">{error ?? 'Aggregate unavailable'}</div>;
  }

  return (
    <div className="page-container">
      <EnterpriseCard title="CE Dossier V2">
        <EnterpriseTable
          rows={data.welds as any[]}
          columns={[
            {
              key: 'id',
              label: 'ID',
            },
            {
              key: 'weld_no',
              label: 'Weld',
            },
            {
              key: 'status',
              label: 'Status',
            },
          ]}
        />

        <AttachmentList attachments={data.attachments as any[]} />

        <pre>{JSON.stringify(data.completeness, null, 2)}</pre>
        <pre>{JSON.stringify(data.status, null, 2)}</pre>
      </EnterpriseCard>
    </div>
  );
}
