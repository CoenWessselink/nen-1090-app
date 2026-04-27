import { ApiError, apiRequest, listRequest } from '@/api/client';

export type NormSystem = { id: string; code: string; name: string; region?: string; description?: string; is_active?: boolean };
export type NormStandard = { id: string; code: string; title: string; version?: string; norm_system_id?: string; scope?: string; is_active?: boolean };
export type NormProfile = {
  id: string;
  code: string;
  name: string;
  region?: string;
  exc_class?: string;
  iso3834_level?: string;
  iso5817_level?: string;
  description?: string;
  is_active?: boolean;
  standards?: NormStandard[];
  templates?: InspectionTemplate[];
};
export type InspectionTemplateItem = {
  id?: string;
  code: string;
  label: string;
  help_text?: string;
  norm_code?: string;
  norm_reference?: string;
  category?: string;
  input_type?: string;
  result_type?: string;
  required?: boolean;
  allow_na?: boolean;
  requires_photo?: boolean;
  requires_document?: boolean;
  requires_comment_on_fail?: boolean;
  options_json?: unknown;
  severity_on_fail?: string;
  result?: string;
  measured_value?: string;
  comment?: string;
};
export type InspectionTemplateSection = { id?: string; code: string; name: string; phase?: string; sort_order?: number; items?: InspectionTemplateItem[] };
export type InspectionTemplate = { id: string; code: string; name: string; description?: string; template_type?: string; version?: number; sections?: InspectionTemplateSection[] };
export type ProjectNormSelection = {
  id?: string;
  project_id?: string;
  norm_system_id?: string;
  norm_profile_id?: string;
  norm_profile?: NormProfile;
  profile?: NormProfile;
  exc_class?: string;
  iso3834_level?: string;
  iso5817_level?: string;
  snapshots?: Array<Record<string, unknown>>;
};
export type WeldInspectionRun = {
  id?: string;
  project_id?: string;
  weld_id?: string;
  status?: string;
  overall_result?: string;
  notes?: string;
  sections?: InspectionTemplateSection[];
  results?: InspectionTemplateItem[];
  history?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
};
export type CeNormCheck = { id: string; code: string; label: string; norm_code?: string; norm_reference?: string; required?: boolean; status?: string; comment?: string; document_id?: string };
export type QualityDashboard = {
  success?: boolean;
  project_id?: string;
  norm_profile?: { code?: string; name?: string };
  welds?: { total?: number; inspected?: number; conform?: number; in_control?: number; rejected?: number };
  percentages?: { conform?: number; in_control?: number; rejected?: number };
  nonconformities?: { open?: number; closed?: number; critical?: number };
  ndt?: { required?: number; completed?: number; pending?: number };
  ce_readiness?: { required_checks?: number; completed_checks?: number; percentage?: number };
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = payload as { items?: T[]; data?: T[]; results?: T[] } | null;
  return record?.items || record?.data || record?.results || [];
}

export async function getNormSystems() { return asArray<NormSystem>(await listRequest('/norms/systems')); }
export async function getNormStandards(params?: Record<string, string | boolean | undefined>) { return asArray<NormStandard>(await listRequest('/norms/standards', params)); }
export async function getNormProfiles(params?: Record<string, string | boolean | undefined>) { return asArray<NormProfile>(await listRequest('/norms/profiles', params)); }
export async function getNormProfile(profileId: string) { return await apiRequest<NormProfile>(`/norms/profiles/${profileId}`); }
export async function getNormTemplates(params?: Record<string, string | boolean | undefined>) { return asArray<InspectionTemplate>(await listRequest('/norms/templates', params)); }
export async function getNormTemplate(templateId: string) { return await apiRequest<InspectionTemplate>(`/norms/templates/${templateId}`); }

export async function getProjectNormSelection(projectId: string) {
  try { return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`); }
  catch (error) { if (error instanceof ApiError && [404, 501].includes(error.status)) return null; throw error; }
}

export async function setProjectNormSelection(projectId: string, payload: Record<string, unknown>) {
  return await apiRequest<ProjectNormSelection>(`/projects/${projectId}/norm-selection`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function getWeldInspection(weldId: string) { return await apiRequest<WeldInspectionRun>(`/welds/${weldId}/inspection`); }
export async function saveWeldInspection(weldId: string, payload: Record<string, unknown>) {
  return await apiRequest<WeldInspectionRun>(`/welds/${weldId}/inspection`, { method: 'POST', body: JSON.stringify(payload) });
}
export async function uploadWeldInspectionAttachment(weldId: string, formData: FormData) {
  return await apiRequest<Record<string, unknown>>(`/welds/${weldId}/inspection/attachments`, { method: 'POST', body: formData });
}
export async function createWeldNonconformity(weldId: string, payload: Record<string, unknown>) {
  return await apiRequest<Record<string, unknown>>(`/welds/${weldId}/nonconformities`, { method: 'POST', body: JSON.stringify(payload) });
}
export async function getCeDossierChecks(projectId: string) { return asArray<CeNormCheck>(await listRequest(`/projects/${projectId}/ce-dossier/checks`)); }
export async function updateCeDossierCheck(projectId: string, checkId: string, payload: Record<string, unknown>) {
  return await apiRequest<CeNormCheck>(`/projects/${projectId}/ce-dossier/checks/${checkId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function getProjectQualityDashboard(projectId: string) {
  try { return await apiRequest<QualityDashboard>(`/projects/${projectId}/quality-dashboard`); }
  catch (error) {
    if (error instanceof ApiError && [404, 501].includes(error.status)) {
      return { project_id: projectId, norm_profile: { code: 'EU_EXC2_STANDARD', name: 'EU EXC2 Standard' }, welds: {}, percentages: {}, nonconformities: {}, ndt: {}, ce_readiness: {} } as QualityDashboard;
    }
    throw error;
  }
}
