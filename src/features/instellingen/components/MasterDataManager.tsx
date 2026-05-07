import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/datatable/DataTable';
import { Modal } from '@/components/modal/Modal';
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { InlineMessage } from '@/components/feedback/InlineMessage';
import { useCreateMasterData, useDeleteMasterData, useUpdateMasterData } from '@/hooks/useSettings';
import { useUiStore } from '@/app/store/ui-store';
import { useAccess } from '@/hooks/useAccess';
import {
  deleteEntityDocument,
  downloadEntityDocument,
  listEntityDocuments,
  uploadEntityDocuments,
  type EntityDocument,
  type EntityDocumentScope,
} from '@/api/entityDocuments';

export type MasterDataType = 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates';
type PreviewState = { url: string; mimeType: string; filename: string } | null;

function documentScopeFor(type: MasterDataType): EntityDocumentScope | null {
  if (type === 'welders') return 'welder';
  if (type === 'wps') return 'wps';
  if (type === 'weld-coordinators') return 'weld-coordinator';
  return null;
}

export function MasterDataManager({ title, type, rows, isLoading, isError, refetch }: any) {
  const canWrite = useAccess('settings.write');
  const createMutation = useCreateMasterData();
  const updateMutation = useUpdateMasterData();
  const deleteMutation = useDeleteMasterData();
  const pushNotification = useUiStore((state) => state.pushNotification);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [docRows, setDocRows] = useState<EntityDocument[]>([]);

  const scope = documentScopeFor(type);

  function handlePendingUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;

    const files = Array.from(event.target.files || []);

    setPendingFiles((current) => [...current, ...files]);

    const firstImage = files.find((file) => file.type.startsWith('image/'));

    if (firstImage) {
      if (preview?.url) {
        window.URL.revokeObjectURL(preview.url);
      }

      setPreview({
        url: window.URL.createObjectURL(firstImage),
        mimeType: firstImage.type,
        filename: firstImage.name,
      });
    }

    event.target.value = '';
  }

  async function refreshDocuments(entityId: string) {
    if (!scope || !entityId) return;

    try {
      const response = await listEntityDocuments(scope, entityId, 'document');
      setDocRows(Array.isArray(response) ? response : []);
    } catch {
      setDocRows([]);
    }
  }

  return null;
}
