import React from 'react';

import AttachmentList from '../AttachmentList';
import EnterpriseCard from '../EnterpriseCard';

interface CompanySectionProps {
  company: any;
}

export default function CompanySection({
  company,
}: CompanySectionProps) {
  return (
    <EnterpriseCard title="Company">
      <div className="enterprise-settings-grid">
        <div>
          <strong>Name</strong>
          <div>{company?.name ?? '-'}</div>
        </div>

        <div>
          <strong>ID</strong>
          <div>{company?.id ?? '-'}</div>
        </div>
      </div>

      <AttachmentList attachments={company?.attachments ?? []} />
    </EnterpriseCard>
  );
}
