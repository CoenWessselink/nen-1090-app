export const renderOnlyNavigation = {
  settings: '/settings-v2',
  ce(projectId: string) {
    return `/projects/${projectId}/ce-v2`;
  },
  runtime: 'render-only',
} as const;
