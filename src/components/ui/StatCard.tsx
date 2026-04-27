import { PropsWithChildren } from 'react';
import { Card } from '@/components/ui/Card';

export function StatCard({ title, value, meta, children }: PropsWithChildren<{ title: string; value: string | number; meta?: string }>) {
  return (
    <Card className="stat-card">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {meta ? <div className="stat-meta">{meta}</div> : null}
      {children}
    </Card>
  );
}
