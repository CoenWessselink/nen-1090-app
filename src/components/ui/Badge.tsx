import { PropsWithChildren } from 'react';
import { cn } from '@/utils/cn';

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' }>) {
  return <span className={cn('badge', `badge-${tone}`)}>{children}</span>;
}
