import { FolderGit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyProjectsProps {
  onCreateProject: () => void;
}

const EmptyProjects = ({ onCreateProject }: EmptyProjectsProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FolderGit2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">
        No projects yet
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get started by creating your first project
      </p>
      <Button onClick={onCreateProject} className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        Create project
      </Button>
    </div>
  );
};

export default EmptyProjects;
