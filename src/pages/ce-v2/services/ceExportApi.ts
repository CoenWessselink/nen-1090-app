export async function fetchCeExport(projectId: string) {
  const response = await fetch(`/api/v1/projects/${projectId}/ce-export`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CE export aggregate');
  }

  return response.json();
}
