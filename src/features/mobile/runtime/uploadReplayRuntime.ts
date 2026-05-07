export type UploadReplayEvent = {
  uploadId: string;
  status: 'queued' | 'replaying' | 'completed' | 'failed';
  timestamp: number;
};

const uploadReplayEvents: UploadReplayEvent[] = [];

export function registerUploadReplayEvent(
  uploadId: string,
  status: UploadReplayEvent['status'],
): UploadReplayEvent {
  const event: UploadReplayEvent = {
    uploadId,
    status,
    timestamp: Date.now(),
  };

  uploadReplayEvents.push(event);

  if (uploadReplayEvents.length > 500) {
    uploadReplayEvents.shift();
  }

  console.info('[upload-replay-runtime] replay event', event);

  return event;
}

export function getUploadReplayEvents(): UploadReplayEvent[] {
  return [...uploadReplayEvents];
}

export function triggerUploadReplayFlush(): void {
  console.info('[upload-replay-runtime] replay flush triggered', {
    online: navigator.onLine,
    queuedEvents: uploadReplayEvents.length,
  });
}

window.addEventListener('online', () => {
  triggerUploadReplayFlush();
});
