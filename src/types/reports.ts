export type ReportItem = {
  id: string;
  title: string;
  status?: string;
};

export type ReportsResponse = {
  items: ReportItem[];
};
