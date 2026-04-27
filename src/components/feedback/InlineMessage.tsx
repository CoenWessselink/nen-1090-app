import type { ReactNode } from 'react';

export function InlineMessage({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'danger'; children: ReactNode }) {
  return <div className={`inline-message inline-${tone}`}>{children}</div>;
}
