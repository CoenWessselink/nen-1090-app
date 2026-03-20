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
};

export type WeldFormValues = {
  project_id: string;
  weld_number: string;
  assembly_id?: string;
  wps_id?: string;
  welder_name?: string;
  process?: string;
  location: string;
  status: string;
};
