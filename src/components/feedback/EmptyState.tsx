export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-box">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
