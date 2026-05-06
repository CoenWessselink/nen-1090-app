export type MobileInspectionSnapshot = {
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
  online: boolean;
  visibilityState: string;
};

const mobileSnapshots: MobileInspectionSnapshot[] = [];

export function captureMobileInspectionSnapshot(): MobileInspectionSnapshot {
  const snapshot: MobileInspectionSnapshot = {
    timestamp: Date.now(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    online: navigator.onLine,
    visibilityState: document.visibilityState,
  };

  mobileSnapshots.push(snapshot);

  if (mobileSnapshots.length > 100) {
    mobileSnapshots.shift();
  }

  console.info('[mobile-inspection] snapshot captured', snapshot);

  if (!snapshot.online) {
    console.warn('[mobile-inspection] device offline detected');
  }

  return snapshot;
}

export function getMobileInspectionSnapshots(): MobileInspectionSnapshot[] {
  return [...mobileSnapshots];
}
