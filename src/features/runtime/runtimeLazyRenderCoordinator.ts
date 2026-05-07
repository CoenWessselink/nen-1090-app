export type LazyRenderEvent = {
  component: string;
  rendered: boolean;
  timestamp: number;
};

const lazyRenderEvents: LazyRenderEvent[] = [];

export function registerLazyRenderEvent(
  component: string,
  rendered: boolean,
): LazyRenderEvent {
  const event: LazyRenderEvent = {
    component,
    rendered,
    timestamp: Date.now(),
  };

  lazyRenderEvents.push(event);

  if (lazyRenderEvents.length > 300) {
    lazyRenderEvents.shift();
  }

  console.info('[runtime-lazy-render] event', event);

  return event;
}

export function getLazyRenderEvents(): LazyRenderEvent[] {
  return [...lazyRenderEvents];
}
