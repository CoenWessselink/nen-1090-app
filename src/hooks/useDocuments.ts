import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectDocument, deleteDocument, downloadDocument, getDocumentVersions, getProjectDocuments, updateDocument } from '@/api/documents';
import { normalizeListResponse } from '@/utils/api';
import type { ListParams } from '@/types/api';

export function useProjectDocuments(projectId: string | number, params?: ListParams) {
  return useQuery({
    queryKey: ['project-documents', projectId, params],
    queryFn: async () => normalizeListResponse(await getProjectDocuments(projectId, params)),
    enabled: Boolean(projectId),
  });
}

export function useDocumentVersions(documentId?: string | number) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => normalizeListResponse(await getDocumentVersions(String(documentId))),
    enabled: Boolean(documentId),
  });
}

export function useCreateProjectDocument(projectId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) => createProjectDocument(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] }),
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string | number; payload: Record<string, unknown> }) => updateDocument(documentId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string | number) => deleteDocument(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-documents'] }),
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: string | number) => downloadDocument(documentId),
  });
}
