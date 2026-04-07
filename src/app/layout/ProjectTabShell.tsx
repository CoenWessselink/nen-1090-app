import React from "react";

export type ProjectTabShellProps = {
  projectId: string;
  currentTab: string;
  children: React.ReactNode;

  onBack: () => void;
  onCreateProject: () => void | Promise<void>;
  onEditProject: () => void | Promise<void>;
  onCreateAssembly: () => void | Promise<void>;
  onCreateWeld: () => void | Promise<void>;

  filters?: React.ReactNode;
  kpis?: React.ReactNode;
};

export default function ProjectTabShell(props: ProjectTabShellProps) {
  return <div>{props.children}</div>;
}
