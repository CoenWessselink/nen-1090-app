import { PropsWithChildren, ReactNode } from 'react';

export function FormField({ label, error, children, hint }: PropsWithChildren<{ label: string; error?: string; hint?: ReactNode }>) {
  return (
    <label className="field-shell">
      <div className="field-label-row">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
