export type ProjectFormValues = {
  projectnummer: string;
  name: string;
  client_name: string;
  execution_class: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type WeldFormValues = {
  project_id: string;
  assembly_id: string;
  wps_id: string;
  location: string;
  status: string;
};
