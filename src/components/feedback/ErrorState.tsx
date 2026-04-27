export function ErrorState({ title = 'Er is iets misgegaan.', description }: { title?: string; description?: string }) {
  return (
    <div className="state-box state-error">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
