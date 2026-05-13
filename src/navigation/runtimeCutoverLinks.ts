export const runtimeCutoverLinks = {
  settings: '/settings-v2',
  ceDossier(projectId: string) {
    return `/projecten/${projectId}/ce-v2`;
  },
} as const;
