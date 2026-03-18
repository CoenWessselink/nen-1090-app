import { PropsWithChildren } from 'react';
import { cn } from '@/utils/cn';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn('card', className)}>{children}</section>;
}
