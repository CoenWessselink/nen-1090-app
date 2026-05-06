export type RuntimeRecoveryState = {
  offline: boolean;
  pendingUploads: number;
  pendingDrafts: number;
  reconnecting: boolean;
  timestamp: number;
};

let currentState: RuntimeRecoveryState = {
  offline: !navigator.onLine,
  pendingUploads: 0,
  pendingDrafts: 0,
  reconnecting: false,
  timestamp: Date.now(),
};

export function updateRuntimeRecoveryState(
  partial: Partial<RuntimeRecoveryState>,
): RuntimeRecoveryState {
  currentState = {
    ...currentState,
    ...partial,
    timestamp: Date.now(),
  };

  console.info('[runtime-recovery-banner] state updated', currentState);

  return currentState;
}

export function getRuntimeRecoveryState(): RuntimeRecoveryState {
  return currentState;
}

window.addEventListener('online', () => {
  updateRuntimeRecoveryState({
    offline: false,
    reconnecting: true,
  });
});

window.addEventListener('offline', () => {
  updateRuntimeRecoveryState({
    offline: true,
    reconnecting: false,
  });
});
