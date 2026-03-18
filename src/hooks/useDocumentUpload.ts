import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/api/ce';

export function useDocumentUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FormData) => uploadDocument(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ce-documents'] });
    },
  });
}
