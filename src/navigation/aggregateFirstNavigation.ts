export const aggregateFirstNavigation = {
  settings: '/settings-v2',
  ce(projectId: string) {
    return `/projects/${projectId}/ce-v2`;
  },
};
