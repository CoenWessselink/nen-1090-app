export type WeldApiItem = {
  id?: string
  weld_no?: string | null
  weld_number?: string | null
  project_id?: string | null
  project_name?: string | null
  assembly_id?: string | null
  location?: string | null
  process?: string | null
  material?: string | null
  thickness?: string | null
  welders?: string | null
  welder_name?: string | null
  wps?: string | null
  wps_id?: string | null
  status?: string | null
  result?: string | null
  inspection_status?: string | null
  inspector_name?: string | null
  inspection_date?: string | null
  created_at?: string | null
  updated_at?: string | null
  photos?: number | null
  defect_count?: number | null
  ndt_required?: boolean | null
}

export type WeldCreatePayload = {
  project_id: string
  weld_no?: string
  weld_number?: string
  location?: string
  process?: string
  material?: string
  thickness?: string
  welders?: string
  wps?: string
  status?: string
}

export function normalizeWeld(item: WeldApiItem): WeldApiItem {
  return {
    ...item,
    id: item.id ?? '',
    weld_no: item.weld_no ?? item.weld_number ?? '',
    weld_number: item.weld_number ?? item.weld_no ?? '',
    project_id: item.project_id ?? '',
    project_name: item.project_name ?? '',
    assembly_id: item.assembly_id ?? null,
    location: item.location ?? '',
    process: item.process ?? '',
    material: item.material ?? '',
    thickness: item.thickness ?? '',
    welders: item.welders ?? item.welder_name ?? '',
    welder_name: item.welder_name ?? item.welders ?? '',
    wps: item.wps ?? item.wps_id ?? '',
    wps_id: item.wps_id ?? item.wps ?? '',
    status: item.status ?? 'open',
    result: item.result ?? 'pending',
    inspection_status: item.inspection_status ?? null,
    inspector_name: item.inspector_name ?? null,
    inspection_date: item.inspection_date ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    photos: item.photos ?? 0,
    defect_count: item.defect_count ?? 0,
    ndt_required: item.ndt_required ?? false,
  }
}

export async function createWeld(apiFetch: (input: string, init?: RequestInit) => Promise<Response>, payload: WeldCreatePayload): Promise<WeldApiItem> {
  const response = await apiFetch('/api/v1/welds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Create weld failed: ${response.status} ${text}`)
  }

  const data = await response.json()
  return normalizeWeld(data as WeldApiItem)
}

export async function updateWeld(apiFetch: (input: string, init?: RequestInit) => Promise<Response>, weldId: string, payload: Partial<WeldCreatePayload>): Promise<WeldApiItem> {
  const response = await apiFetch(`/api/v1/welds/${weldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Update weld failed: ${response.status} ${text}`)
  }

  const data = await response.json()
  return normalizeWeld(data as WeldApiItem)
}

export async function listWelds(apiFetch: (input: string, init?: RequestInit) => Promise<Response>, params: { project_id?: string; status?: string; search?: string } = {}): Promise<{ items: WeldApiItem[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams()
  if (params.project_id) query.set('project_id', params.project_id)
  if (params.status) query.set('status', params.status)
  if (params.search) query.set('search', params.search)

  const suffix = query.toString() ? `?${query.toString()}` : ''
  const response = await apiFetch(`/api/v1/welds${suffix}`)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`List welds failed: ${response.status} ${text}`)
  }

  const data = await response.json() as { items?: WeldApiItem[]; total?: number; page?: number; limit?: number }
  return {
    items: (data.items ?? []).map(normalizeWeld),
    total: data.total ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? 25,
  }
}
