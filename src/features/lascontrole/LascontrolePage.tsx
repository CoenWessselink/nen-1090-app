import { useNavigate, useParams } from "react-router-dom";
import ProjectTabShell from "@/app/layout/ProjectTabShell";
import { normalizeStatus } from "@/types/weld";

export function LascontrolePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const example = normalizeStatus("conform");

  return (
    <ProjectTabShell
      projectId={projectId!}
      currentTab="lascontrole"
      onBack={() => navigate("/projecten")}
      onCreateProject={() => {}}
      onEditProject={() => {}}
      onCreateAssembly={() => {}}
      onCreateWeld={() => {}}
    >
      <div>Lascontrole {example}</div>
    </ProjectTabShell>
  );
}
