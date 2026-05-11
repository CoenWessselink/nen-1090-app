import React, { PropsWithChildren } from 'react';

interface EnterpriseCardProps extends PropsWithChildren {
  title: string;
}

export default function EnterpriseCard({
  title,
  children,
}: EnterpriseCardProps) {
  return (
    <div className="enterprise-card">
      <div className="enterprise-card-header">
        <h2>{title}</h2>
      </div>

      <div className="enterprise-card-body">
        {children}
      </div>
    </div>
  );
}
