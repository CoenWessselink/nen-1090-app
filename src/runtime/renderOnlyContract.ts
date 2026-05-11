export interface RenderOnlyContract<T> {
  payload: T;
  runtime: 'render-only';
  reconstruction: false;
}

export function createRenderOnlyContract<T>(payload: T): RenderOnlyContract<T> {
  return {
    payload,
    runtime: 'render-only',
    reconstruction: false,
  };
}
