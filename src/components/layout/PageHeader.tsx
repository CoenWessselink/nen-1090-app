import { PropsWithChildren } from 'react';

export function PageHeader({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-actions">{children}</div>
    </div>
  );
}
