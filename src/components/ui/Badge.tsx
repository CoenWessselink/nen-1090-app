import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const toneClassName: Record<BadgeTone, string> = {
  neutral: 'badge badge-neutral',
  success: 'badge badge-success',
  danger: 'badge badge-danger',
  warning: 'badge badge-warning',
  info: 'badge badge-info',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`${toneClassName[tone] || toneClassName.neutral} ${className}`.trim()}>{children}</span>;
}

export default Badge;
