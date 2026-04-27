export function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress-bar" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      <span>{`${progress}%`}</span>
    </div>
  );
}
