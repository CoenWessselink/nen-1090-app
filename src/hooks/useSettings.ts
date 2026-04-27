import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInspectionTemplate,
  createMaterial,
  createWelder,
  createWps,
  deleteInspectionTemplate,
  deleteMaterial,
  deleteWelder,
  deleteWps,
  duplicateInspectionTemplate,
  getClients,
  getInspectionTemplates,
  getMaterials,
  getProcesses,
  getSettings,
  getWelders,
  getWps,
  getWeldCoordinators,
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  createWeldCoordinator,
  updateWeldCoordinator,
  deleteWeldCoordinator,
  updateInspectionTemplate,
  updateMaterial,
  updateWelder,
  updateWps,
} from '@/api/settings';
import { normalizeListResponse } from '@/utils/api';

type MasterDataType = 'wps' | 'materials' | 'welders' | 'weld-coordinators' | 'inspection-templates';
type MasterDataRecord = Record<string, unknown>;
type MasterDataResponse =
  | MasterDataRecord[]
  | {
      items?: MasterDataRecord[];
      data?: MasterDataRecord[];
      results?: MasterDataRecord[];
      total?: number;
      page?: number;
      limit?: number;
    };

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
    enabled,
  });
}

function useMasterDataQuery(queryKey: string, queryFn: () => Promise<MasterDataResponse>, enabled = true) {
  return useQuery({
    queryKey: [queryKey],
    queryFn: async () => normalizeListResponse(await queryFn()),
    enabled,
  });
}

export function useClients(enabled = true) {
  return useMasterDataQuery('settings-clients', getClients, enabled);
}

export function useProcesses(enabled = true) {
  return useMasterDataQuery('settings-processes', getProcesses, enabled);
}

export function useWps(enabled = true) {
  return useMasterDataQuery('settings-wps', getWps, enabled);
}

export function useMaterials(enabled = true) {
  return useMasterDataQuery('settings-materials', getMaterials, enabled);
}

export function useWelders(enabled = true) {
  return useMasterDataQuery('settings-welders', getWelders, enabled);
}

export function useInspectionTemplates(enabled = true) {
  return useMasterDataQuery('settings-inspection-templates', getInspectionTemplates, enabled);
}

export function useWeldCoordinators(enabled = true) {
  return useMasterDataQuery('settings-weld-coordinators', getWeldCoordinators, enabled);
}

export function useCompanySettings(enabled = true) {
  return useQuery({ queryKey: ['settings-company'], queryFn: () => getCompanySettings(), enabled });
}

const createHandlers: Record<MasterDataType, (payload: MasterDataRecord) => Promise<unknown>> = {
  wps: createWps,
  materials: createMaterial,
  welders: createWelder,
  'weld-coordinators': createWeldCoordinator,
  'inspection-templates': createInspectionTemplate,
};

const updateHandlers: Record<MasterDataType, (id: string | number, payload: MasterDataRecord) => Promise<unknown>> = {
  wps: updateWps,
  materials: updateMaterial,
  welders: updateWelder,
  'weld-coordinators': updateWeldCoordinator,
  'inspection-templates': updateInspectionTemplate,
};

const deleteHandlers: Record<MasterDataType, (id: string | number) => Promise<unknown>> = {
  wps: deleteWps,
  materials: deleteMaterial,
  welders: deleteWelder,
  'weld-coordinators': deleteWeldCoordinator,
  'inspection-templates': deleteInspectionTemplate,
};

export function useCreateMasterData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, payload }: { type: MasterDataType; payload: MasterDataRecord }) => createHandlers[type](payload),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: [`settings-${variables.type}`] }),
  });
}

export function useUpdateMasterData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, payload }: { type: MasterDataType; id: string | number; payload: MasterDataRecord }) => updateHandlers[type](id, payload),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: [`settings-${variables.type}`] }),
  });
}

export function useDeleteMasterData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: MasterDataType; id: string | number }) => deleteHandlers[type](id),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: [`settings-${variables.type}`] }),
  });
}

export function useDuplicateInspectionTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => duplicateInspectionTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-inspection-templates'] }),
  });
}


export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateCompanySettings(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-company'] }),
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings-company'] }),
  });
}
