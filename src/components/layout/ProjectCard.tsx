import { GitBranch } from "lucide-react";

interface ProjectCardProps {
  name: string;
  repo: string;
  lastActivity: string;
}

const ProjectCard = ({ name, repo, lastActivity }: ProjectCardProps) => {
  return (
    <div className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
      <h3 className="font-medium text-foreground">{name}</h3>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span>{repo}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Active {lastActivity}
      </p>
    </div>
  );
};

export default ProjectCard;
