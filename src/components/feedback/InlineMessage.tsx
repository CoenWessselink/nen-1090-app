import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'success' | 'danger' | 'error' | 'info' | 'warning';

const map: Record<Tone,string> = {
  neutral: 'inline-neutral',
  success: 'inline-success',
  danger: 'inline-danger',
  error: 'inline-danger',
  info: 'inline-info',
  warning: 'inline-warning',
};

export function InlineMessage({ tone='neutral', children }:{
  tone?: Tone;
  children: ReactNode;
}) {
  return <div className={map[tone] || map.neutral}>{children}</div>;
}

export default InlineMessage;
