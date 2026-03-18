export function InlineMessage({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'danger'; children: string }) {
  return <div className={`inline-message inline-${tone}`}>{children}</div>;
}
