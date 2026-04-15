export type ProjectAssemblyDraft = {
  temp_id: string;
  code: string;
  name: string;
  drawing_no?: string;
  revision?: string;
  status?: string;
  notes?: string;
};

export type ProjectWeldDraft = {
  temp_id: string;
  weld_number: string;
  assembly_temp_id?: string;
  assembly_id?: string;
  wps_id?: string;
  welder_name?: string;
  coordinator_id?: string;
  coordinator_name?: string;
  process?: string;
  material?: string;
  thickness?: string;
  location: string;
  status: string;
  photos?: File[];
};

export type ProjectFormValues = {
  projectnummer: string;
  name: string;
  client_name: string;
  execution_class: string;
  status: string;
  start_date: string;
  end_date: string;
  project_type?: string;
  location?: string;
  planner?: string;
  inspection_template_id?: string;
  apply_materials?: boolean;
  apply_wps?: boolean;
  apply_welders?: boolean;
  assemblies?: ProjectAssemblyDraft[];
  welds?: ProjectWeldDraft[];
};

export type WeldFormValues = {
  project_id: string;
  weld_number: string;
  assembly_id?: string;
  wps_id?: string;
  welder_name?: string;
  coordinator_id?: string;
  coordinator_name?: string;
  process?: string;
  material?: string;
  thickness?: string;
  location: string;
  status: 'conform' | 'in_controle' | 'niet_conform' | 'defect' | 'gerepareerd';
  execution_class?: 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4' | '';
  template_id?: string;
};
