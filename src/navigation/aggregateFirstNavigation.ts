export const aggregateFirstNavigation = {
  settings: '/settings-v2',
  ce(projectId: string) {
    return `/projecten/${projectId}/ce-v2`;
  },
};
