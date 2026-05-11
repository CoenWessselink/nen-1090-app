export const runtimeCutoverLinks = {
  settings: '/settings-v2',
  ceDossier(projectId: string) {
    return `/projects/${projectId}/ce-v2`;
  },
} as const;
