
export default function Breadcrumb({ project }: any) {
  return <span>{project?.name || "Project"}</span>;
}
