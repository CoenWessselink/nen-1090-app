import { useNavigate, useParams } from "react-router-dom";
import ProjectTabShell from "@/app/layout/ProjectTabShell";

export default function Project360Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <ProjectTabShell
      projectId={projectId!}
      currentTab="overzicht"
      onBack={() => navigate("/projecten")}
      onCreateProject={() => {}}
      onEditProject={() => {}}
      onCreateAssembly={() => {}}
      onCreateWeld={() => {}}
    >
      <div>Project 360</div>
    </ProjectTabShell>
  );
}
