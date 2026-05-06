export type ExportState = 'idle' | 'preparing' | 'exporting' | 'completed' | 'failed';

export type ExportSession = {
  id: string;
  state: ExportState;
  startedAt: number;
  completedAt?: number;
  error?: string;
};

const exportSessions = new Map<string, ExportSession>();

export function startExportSession(id: string): ExportSession {
  const session: ExportSession = {
    id,
    state: 'preparing',
    startedAt: Date.now(),
  };

  exportSessions.set(id, session);

  console.info('[ce-export] session started', {
    id,
    startedAt: session.startedAt,
  });

  return session;
}

export function markExportRunning(id: string): void {
  const session = exportSessions.get(id);

  if (!session) {
    return;
  }

  session.state = 'exporting';

  console.info('[ce-export] export running', {
    id,
  });
}

export function markExportCompleted(id: string): void {
  const session = exportSessions.get(id);

  if (!session) {
    return;
  }

  session.state = 'completed';
  session.completedAt = Date.now();

  console.info('[ce-export] export completed', {
    id,
    durationMs: session.completedAt - session.startedAt,
  });
}

export function markExportFailed(id: string, error: unknown): void {
  const session = exportSessions.get(id);

  if (!session) {
    return;
  }

  session.state = 'failed';
  session.completedAt = Date.now();
  session.error = String((error as { message?: string })?.message || error || 'Unknown export error');

  console.error('[ce-export] export failed', {
    id,
    error: session.error,
    durationMs: session.completedAt - session.startedAt,
  });
}

export function getExportSession(id: string): ExportSession | null {
  return exportSessions.get(id) || null;
}

export function clearCompletedExport(id: string): void {
  exportSessions.delete(id);

  console.info('[ce-export] export session cleared', {
    id,
  });
}
