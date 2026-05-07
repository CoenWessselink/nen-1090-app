export type FinalValidationEvent = {
  category: string;
  status: string;
  timestamp: number;
};

const finalValidationEvents: FinalValidationEvent[] = [];

export function registerFinalValidationEvent(
  category: string,
  status: string,
): FinalValidationEvent {
  const event: FinalValidationEvent = {
    category,
    status,
    timestamp: Date.now(),
  };

  finalValidationEvents.push(event);

  if (finalValidationEvents.length > 500) {
    finalValidationEvents.shift();
  }

  console.info('[runtime-final-validation] event', event);

  return event;
}

export function getFinalValidationEvents(): FinalValidationEvent[] {
  return [...finalValidationEvents];
}
