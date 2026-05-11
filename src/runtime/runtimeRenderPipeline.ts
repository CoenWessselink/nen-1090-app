export const runtimeRenderPipeline = {
  flow: [
    'fetch',
    'invalidate',
    'refetch',
    'rerender',
  ],
  renderOnly: true,
} as const;
