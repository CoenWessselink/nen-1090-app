export interface RenderOnlyRuntimeResult<T> {
  payload: T;
  fetchedAt: string;
}

export function renderOnlyRuntime<T>(payload: T): RenderOnlyRuntimeResult<T> {
  return {
    payload,
    fetchedAt: new Date().toISOString(),
  };
}
