export type WeldEditSession = {
  weldId: string;
  startedAt: number;
  lastUpdatedAt: number;
  active: boolean;
};

const weldSessions = new Map<string, WeldEditSession>();

export function startWeldEditSession(weldId: string): WeldEditSession {
  const session: WeldEditSession = {
    weldId,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    active: true,
  };

  weldSessions.set(weldId, session);

  console.info('[weld-session] started', {
    weldId,
  });

  return session;
}

export function touchWeldEditSession(weldId: string): void {
  const session = weldSessions.get(weldId);

  if (!session) {
    return;
  }

  session.lastUpdatedAt = Date.now();

  console.info('[weld-session] updated', {
    weldId,
  });
}

export function closeWeldEditSession(weldId: string): void {
  const session = weldSessions.get(weldId);

  if (!session) {
    return;
  }

  session.active = false;
  session.lastUpdatedAt = Date.now();

  console.info('[weld-session] closed', {
    weldId,
  });
}

export function detectStaleWeldSessions(maxIdleMs = 1000 * 60 * 15): string[] {
  const now = Date.now();

  const stale: string[] = [];

  for (const [weldId, session] of weldSessions.entries()) {
    if (!session.active) {
      continue;
    }

    if (now - session.lastUpdatedAt > maxIdleMs) {
      stale.push(weldId);
    }
  }

  if (stale.length > 0) {
    console.warn('[weld-session] stale sessions detected', {
      stale,
    });
  }

  return stale;
}
