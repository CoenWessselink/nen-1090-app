export function LoadingState({ label = 'Laden...' }: { label?: string }) {
  return <div className="state-box">{label}</div>;
}
