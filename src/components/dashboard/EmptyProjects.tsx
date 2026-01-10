import { FolderGit2, Plus, MessageSquare, Eye, Rocket } from "lucide-react";
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
      <h3 className="mt-6 text-xl font-semibold text-foreground">
        Welcome to GetHolocron
      </h3>
      <p className="mt-2 max-w-md text-muted-foreground">
        Create your first project to start building with AI. Connect a GitHub repo 
        and describe what you want to build—we'll handle the rest.
      </p>
      
      {/* Quick process overview */}
      <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Describe
        </div>
        <span className="text-border">→</span>
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </div>
        <span className="text-border">→</span>
        <div className="flex items-center gap-1.5">
          <Rocket className="h-3.5 w-3.5" />
          Ship
        </div>
      </div>
      
      <Button onClick={onCreateProject} className="mt-8 gap-2" size="lg">
        <Plus className="h-4 w-4" />
        Create your first project
      </Button>
    </div>
  );
};

export default EmptyProjects;
