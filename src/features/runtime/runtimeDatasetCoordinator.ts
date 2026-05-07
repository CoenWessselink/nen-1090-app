export type DatasetRuntimeEvent = {
  dataset: string;
  action: string;
  timestamp: number;
};

const datasetRuntimeEvents: DatasetRuntimeEvent[] = [];

export function registerDatasetRuntimeEvent(
  dataset: string,
  action: string,
): DatasetRuntimeEvent {
  const event: DatasetRuntimeEvent = {
    dataset,
    action,
    timestamp: Date.now(),
  };

  datasetRuntimeEvents.push(event);

  if (datasetRuntimeEvents.length > 400) {
    datasetRuntimeEvents.shift();
  }

  console.info('[runtime-dataset] event', event);

  return event;
}

export function getDatasetRuntimeEvents(): DatasetRuntimeEvent[] {
  return [...datasetRuntimeEvents];
}
